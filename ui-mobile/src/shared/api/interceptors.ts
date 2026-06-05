import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { Session } from "@supabase/supabase-js";
import { toAppError } from "@/shared/errors/errorMapper";

type RetryableConfig = InternalAxiosRequestConfig & { _retriedAfterRefresh?: boolean };

let sessionAccessor: (() => Promise<Session | null>) | null = null;
let sessionRefresher: (() => Promise<Session | null>) | null = null;
let unauthorizedHandler: (() => Promise<void>) | null = null;

export function setSessionAccessor(accessor: () => Promise<Session | null>) {
  sessionAccessor = accessor;
}

export function setSessionRefresher(refresher: () => Promise<Session | null>) {
  sessionRefresher = refresher;
}

export function setUnauthorizedHandler(handler: () => Promise<void>) {
  unauthorizedHandler = handler;
}

export function attachInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use(async (config) => {
    const session = await sessionAccessor?.();
    if (session) {
      config.headers.set("Authorization", `Bearer ${session.access_token}`);
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const config = error.config as RetryableConfig | undefined;

      if (status === 401 && config && !config._retriedAfterRefresh) {
        config._retriedAfterRefresh = true;
        const refreshed = sessionRefresher ? await safeRefresh(sessionRefresher) : null;
        if (refreshed?.access_token) {
          config.headers.set("Authorization", `Bearer ${refreshed.access_token}`);
          return client.request(config);
        }

        if (unauthorizedHandler) {
          await unauthorizedHandler();
        }
      }

      return Promise.reject(toAppError(error));
    }
  );
}

async function safeRefresh(refresher: () => Promise<Session | null>): Promise<Session | null> {
  try {
    return await refresher();
  } catch {
    return null;
  }
}

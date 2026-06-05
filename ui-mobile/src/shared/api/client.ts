import axios from "axios";
import { env } from "@/shared/config/env";
import { attachInterceptors } from "@/shared/api/interceptors";
import { ClientResponse } from "@/shared/api/types";

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000
});

attachInterceptors(apiClient);

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<ClientResponse<T>> {
  const response = await apiClient.get<ClientResponse<T>>(url, { params });
  return response.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<ClientResponse<T>> {
  const response = await apiClient.post<ClientResponse<T>>(url, body ?? {});
  return response.data;
}

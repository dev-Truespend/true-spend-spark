import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/api/supabaseClient";

export type SignInMethod = {
  id: string;
  provider: string;
  detail?: string | null;
};

const SIGN_IN_METHODS_KEY = ["auth", "sign-in-methods"] as const;

export function useSignInMethods() {
  return useQuery({
    queryKey: SIGN_IN_METHODS_KEY,
    queryFn: async (): Promise<SignInMethod[]> => {
      const { data } = await supabase.auth.getUser();
      const list: SignInMethod[] = data.user?.identities?.map((identity) => ({
        id: identity.identity_id ?? identity.id,
        provider: identity.provider,
        detail: identity.identity_data?.email ?? identity.identity_data?.phone ?? null
      })) ?? [];
      if (data.user?.email && !list.some((row) => row.provider === "email")) {
        list.unshift({ id: "email", provider: "email", detail: data.user.email });
      }
      if (data.user?.phone && !list.some((row) => row.provider === "phone")) {
        list.push({ id: "phone", provider: "phone", detail: data.user.phone });
      }
      return list;
    },
    staleTime: 60_000
  });
}

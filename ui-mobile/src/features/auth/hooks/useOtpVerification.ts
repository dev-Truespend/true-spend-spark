import { useState } from "react";
import { verifyEmailOtp, verifyPhoneOtp } from "@/features/auth/api/auth.api";
import { supabase } from "@/shared/api/supabaseClient";
import { OtpVerifySchema } from "@/features/auth/schemas/auth.schema";
import { useAuth } from "@/providers/AuthProvider";

export function useOtpVerification() {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(value: string, token: string, channel: "email" | "phone") {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = OtpVerifySchema.parse({ value, token, channel });
      if (parsed.channel === "email") {
        await verifyEmailOtp(parsed.value, parsed.token);
      } else {
        await verifyPhoneOtp(parsed.value, parsed.token);
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await auth.completeSignedInSession(data.session);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to verify code.");
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }

  return { error, isLoading, verify };
}

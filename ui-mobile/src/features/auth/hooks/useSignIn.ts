import { useState } from "react";
import { requestEmailOtp, requestPhoneOtp, signInWithProvider } from "@/features/auth/api/auth.api";
import { OtpTargetSchema } from "@/features/auth/schemas/auth.schema";

export function useSignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startOtp(value: string, channel: "email" | "phone") {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = OtpTargetSchema.parse({ value, channel });
      if (parsed.channel === "email") {
        await requestEmailOtp(parsed.value);
      } else {
        await requestPhoneOtp(parsed.value);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start sign-in.");
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }

  async function startProvider(provider: "apple" | "google") {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithProvider(provider);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start sign-in.");
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }

  return { error, isLoading, startOtp, startProvider };
}

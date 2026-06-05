import { useEffect, useState } from "react";
import { isBiometricSupported } from "@/shared/native/biometrics";

type Status = "checking" | "available" | "unavailable";

export function useBiometricStatus(): Status {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supported = await isBiometricSupported();
      if (!cancelled) setStatus(supported ? "available" : "unavailable");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

import { getSecureString, setSecureString } from "@/shared/storage/secureStorage";

// A stable per-install identifier the server uses to recognize this device across re-registers — even
// tokenless ones (before push permission is granted). Without it, registration can only dedup on the
// push token, so a tokenless register leaks a duplicate device row. Generated once, persisted in
// SecureStore, and reused until the app is uninstalled. It is an opaque id, not a secret, so a
// Math.random-based UUID v4 is sufficient (no native crypto dependency / EAS rebuild needed).
const INSTALLATION_ID_KEY = "truespend.installationId";

let cached: string | null = null;

function uuidV4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getInstallationId(): Promise<string> {
  if (cached) return cached;
  const existing = await getSecureString(INSTALLATION_ID_KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const id = uuidV4();
  await setSecureString(INSTALLATION_ID_KEY, id);
  cached = id;
  return id;
}

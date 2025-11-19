// Wrapper for chrome.storage with TypeScript types

export interface ExtensionStorage {
  session: {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
    expires_in: number;
  } | null;
  privacyAccepted: boolean;
  cachedBudgets: any[] | null;
  lastCacheRefresh: number | null;
  merchantDetections: any[];
  featureFlags: Record<string, boolean>;
  settings: {
    merchantDetection: boolean;
    desktopNotifications: boolean;
    telemetryEnabled: boolean;
    budgetAlerts: boolean;
    dealAlerts: boolean;
    merchantAlerts: boolean;
  };
}

// Get item from storage
export async function getStorageItem<K extends keyof ExtensionStorage>(
  key: K
): Promise<ExtensionStorage[K] | null> {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? null;
}

// Get multiple items from storage
export async function getStorageItems<K extends keyof ExtensionStorage>(
  keys: K[]
): Promise<Partial<ExtensionStorage>> {
  const result = await chrome.storage.local.get(keys);
  return result;
}

// Set item in storage
export async function setStorageItem<K extends keyof ExtensionStorage>(
  key: K,
  value: ExtensionStorage[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// Set multiple items in storage
export async function setStorageItems(items: Partial<ExtensionStorage>): Promise<void> {
  await chrome.storage.local.set(items);
}

// Remove item from storage
export async function removeStorageItem(key: keyof ExtensionStorage): Promise<void> {
  await chrome.storage.local.remove(key);
}

// Clear all storage
export async function clearStorage(): Promise<void> {
  await chrome.storage.local.clear();
}

// Get sync storage (persists across devices)
export async function getSyncItem<K extends keyof ExtensionStorage>(
  key: K
): Promise<ExtensionStorage[K] | null> {
  const result = await chrome.storage.sync.get(key);
  return result[key] ?? null;
}

// Set sync storage
export async function setSyncItem<K extends keyof ExtensionStorage>(
  key: K,
  value: ExtensionStorage[K]
): Promise<void> {
  await chrome.storage.sync.set({ [key]: value });
}

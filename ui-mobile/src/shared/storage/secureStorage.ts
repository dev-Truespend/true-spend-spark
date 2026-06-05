import * as SecureStore from "expo-secure-store";

export async function getSecureString(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function setSecureString(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function removeSecureString(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export const supabaseSecureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }
};

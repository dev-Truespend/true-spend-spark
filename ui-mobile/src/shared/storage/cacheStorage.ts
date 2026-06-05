import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setCachedJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function clearCachedKeys(keys: string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys);
}

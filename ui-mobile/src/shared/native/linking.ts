import * as Linking from "expo-linking";

export function addUrlListener(listener: (url: string) => void) {
  return Linking.addEventListener("url", ({ url }) => listener(url));
}

export async function getInitialUrl() {
  return Linking.getInitialURL();
}

export function parseUrl(url: string) {
  return Linking.parse(url);
}

export async function openExternalUrl(url: string) {
  await Linking.openURL(url);
}

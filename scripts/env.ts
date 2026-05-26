import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

export function env(name: string): string {
  const aliases: Record<string, string[]> = {
    SUPABASE_ANON_KEY: ["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"],
  };
  const value = process.env[name]
    ?? process.env[`VITE_${name}`]
    ?? aliases[name]?.map((alias) => process.env[alias]).find(Boolean);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

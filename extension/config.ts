/**
 * Extension configuration.
 *
 * When the extension is built with `vite build --mode extension`, Vite replaces
 * `import.meta.env.*` at compile time, so these values are inlined into the
 * bundle. If the extension is ever built outside of Vite, import from this
 * file rather than using import.meta.env directly — it gives you one place to
 * swap the values.
 *
 * NEVER commit real secrets here. The placeholders below are replaced by Vite
 * from the .env file at build time.
 */

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

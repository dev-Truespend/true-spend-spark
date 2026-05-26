import "./env";

const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
];

const serverRequiredBeforeLaunch = [
  "SUPABASE_SERVICE_ROLE_KEY",
];

const laterIntegrations = [
  "PLAID_CLIENT_ID",
  "PLAID_SECRET",
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
  "ANTHROPIC_API_KEY",
  "SENTRY_DSN",
];

function exists(name: string): boolean {
  if (name === "SUPABASE_ANON_KEY") {
    return Boolean(
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );
  }
  return Boolean(process.env[name] || process.env[`VITE_${name}`]);
}

let failed = false;
for (const name of required) {
  const ok = exists(name);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}

for (const name of serverRequiredBeforeLaunch) {
  const ok = exists(name);
  console.log(`${ok ? "PASS" : "WARN"} ${name} ${ok ? "" : "(needed for validation scripts and Edge Function admin operations)"}`);
}

for (const name of laterIntegrations) {
  console.log(`${exists(name) ? "PASS" : "TODO"} ${name}`);
}

if (failed) process.exit(1);

import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const userJwt = process.env.VALIDATION_USER_JWT;
if (!userJwt) {
  console.log("SKIP extension flow: set VALIDATION_USER_JWT for an authenticated test user with cards.");
  process.exit(0);
}

const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
  global: { headers: { Authorization: `Bearer ${userJwt}` } },
});

const { data, error } = await supabase.functions.invoke("extension-card-suggest", {
  body: {
    domain: "amazon.com",
    page_title: "Amazon",
    page_intent: "product",
    amount_cents: 5000,
  },
});

if (error) throw error;
if (data?.merchant?.normalized_category !== "shopping") throw new Error("Amazon should resolve to shopping");
if (!data?.recommendation) throw new Error("Expected recommendation payload");

console.log(`PASS extension-card-suggest: ${data.merchant.merchant_name} -> ${data.merchant.normalized_category}`);

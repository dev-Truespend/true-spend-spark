import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const userJwt = process.env.VALIDATION_USER_JWT;
if (!userJwt) {
  console.log("SKIP rewards-engine: set VALIDATION_USER_JWT for an authenticated test user with cards.");
  process.exit(0);
}

const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
  global: { headers: { Authorization: `Bearer ${userJwt}` } },
});

const { data, error } = await supabase.functions.invoke("rewards-engine", {
  body: {
    merchant_name: "Amazon",
    domain: "amazon.com",
    normalized_category: "shopping",
    amount_cents: 5000,
  },
});

if (error) throw error;
if (!data?.best_card) throw new Error("Expected rewards-engine to return best_card");
if (data.category !== "shopping") throw new Error(`Expected shopping category, got ${data.category}`);

console.log(`PASS rewards-engine: ${data.best_card.card_name} (${data.best_card.reward_label})`);

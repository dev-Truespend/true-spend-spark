import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const userAJwt = process.env.VALIDATION_USER_A_JWT;
const userBJwt = process.env.VALIDATION_USER_B_JWT;

if (!userAJwt || !userBJwt) {
  console.log("SKIP RLS: set VALIDATION_USER_A_JWT and VALIDATION_USER_B_JWT to run cross-user checks.");
  process.exit(0);
}

const userA = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
  global: { headers: { Authorization: `Bearer ${userAJwt}` } },
});
const userB = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
  global: { headers: { Authorization: `Bearer ${userBJwt}` } },
});

const { data: aUser } = await userA.auth.getUser();
const { data: bUser } = await userB.auth.getUser();
if (!aUser.user || !bUser.user) throw new Error("Both validation users must be authenticated");

const { data: bCards, error: bCardsError } = await userA
  .from("user_credit_cards")
  .select("id")
  .eq("user_id", bUser.user.id);

if (bCardsError) throw bCardsError;
if ((bCards ?? []).length > 0) throw new Error("RLS failed: User A can read User B cards");

const anon = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"));
const { data: anonCards, error: anonError } = await anon.from("user_credit_cards").select("id").limit(1);
if (!anonError && (anonCards ?? []).length > 0) throw new Error("RLS failed: anonymous user can read user cards");

console.log("PASS RLS: cross-user card reads are blocked");

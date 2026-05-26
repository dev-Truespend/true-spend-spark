import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const supabase = createClient(
  env("SUPABASE_URL"),
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? env("SUPABASE_ANON_KEY"),
);

const { count: cardCount, error: cardsError } = await supabase
  .from("card_catalog")
  .select("id", { count: "exact", head: true })
  .eq("is_active", true);

if (cardsError) throw cardsError;

const { count: domainCount, error: domainsError } = await supabase
  .from("merchant_domains")
  .select("id", { count: "exact", head: true })
  .eq("is_verified", true);

if (domainsError) throw domainsError;

const { data: cardsWithoutRules, error: rulesError } = await supabase
  .from("card_catalog")
  .select("id, card_name, card_reward_rules(id)")
  .eq("is_active", true);

if (rulesError) throw rulesError;

const missingRules = (cardsWithoutRules ?? []).filter((card: any) => !card.card_reward_rules?.length);

console.log(`Cards: ${cardCount ?? 0}`);
console.log(`Verified merchant domains: ${domainCount ?? 0}`);
console.log(`Cards without reward rules: ${missingRules.length}`);

if ((cardCount ?? 0) < 25) throw new Error("Expected at least 25 active cards");
if ((domainCount ?? 0) < 10) throw new Error("Expected at least 10 verified merchant domains");
if (missingRules.length > 0) throw new Error(`Cards missing reward rules: ${missingRules.map((card: any) => card.card_name).join(", ")}`);

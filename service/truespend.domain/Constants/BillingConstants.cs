namespace TrueSpend.Domain.Constants;

public static class BillingConstants
{
    public const string FreePlanCode = "free";
    public const string BasicPlanCode = "basic";
    public const string ProPlanCode = "pro";
    public const string MonthlyPeriodCode = "monthly";
    public const string AnnualPeriodCode = "annual";
    public const string OnboardingReturnContext = "onboarding";
    public const string BillingReturnContext = "billing";
    public const string ProfileReturnContext = "profile";

    public const string ManualCardLimitFeatureCode = "manual_card_limit";
    public const string PlaidCardLimitFeatureCode = "plaid_card_limit";
    public const string GeoRecommendationsPerDayFeatureCode = "geo_recommendations_per_day";
    public const string AiInsightsEnabledFeatureCode = "ai_insights_enabled";
    public const string UnlimitedCardsFeatureCode = "unlimited_cards";
    public const string PlaidLinkingEnabledFeatureCode = "plaid_linking_enabled";
    public const string PlaidTransactionsViewEnabledFeatureCode = "plaid_transactions_view_enabled";
    public const string GeofencingEnabledFeatureCode = "geofencing_enabled";
    // Pro-only: user-initiated Plaid re-sync (manual sync / pull-to-refresh). Backed by plan==Pro in
    // EntitlementGuard (no billing.plan_features row required).
    public const string ManualResyncEnabledFeatureCode = "manual_resync_enabled";
    // Home map tiering: pins are Basic+ (browse nearby rewardable merchants), place search is Pro-only.
    // Free still gets the satellite map + auto-detected best-card recommendation, just no pins/search.
    public const string MapPinsEnabledFeatureCode = "map_pins_enabled";
    public const string PlaceSearchEnabledFeatureCode = "place_search_enabled";

    public const string TrialingStatusCode = "trialing";
    public const string ActiveStatusCode = "active";
    public const string PastDueStatusCode = "past_due";
    public const string UnpaidStatusCode = "unpaid";
    public const string CanceledStatusCode = "canceled";

    public static readonly TimeSpan PastDueGraceWindow = TimeSpan.FromHours(24);

    public static string EntitlementsCacheKey(Guid userId) => $"billing:entitlements:{userId:N}";
    public static string SubscriptionCacheKey(Guid userId) => $"billing:subscription:{userId:N}";
    public static string PaymentMethodsCacheKey(Guid userId) => $"billing:payment-methods:{userId:N}";
}

namespace TrueSpend.Api.Mappers;

// Maps RapidAPI category groups (and a few legacy TrueSpend category codes
// from the original 7-category seed) to lucide icon names the mobile app
// already renders. Anything unmapped falls through to "tag".
public static class CategoryIconMap
{
    private const string DefaultIcon = "tag";

    private static readonly Dictionary<string, string> ByKey = new(StringComparer.OrdinalIgnoreCase)
    {
        // RapidAPI category groups
        { "Dining",         "utensils" },
        { "Travel",         "plane" },
        { "Shopping",       "shopping-cart" },
        { "Auto",           "fuel" },
        { "Entertainment",  "music" },
        { "Health",         "heart-pulse" },
        { "Utilities",      "zap" },
        { "Transit",        "bus" },
        { "Wellness",       "leaf" },
        { "Cash Back",      "dollar-sign" },
        { "Other",          DefaultIcon },

        // Legacy seed codes (still referenced by sample/test fixtures)
        { "electronics",    "tv" },
        { "groceries",      "shopping-cart" },
        { "clothing",       "shirt" },
        { "home_goods",     "home" },
        { "beauty",         "sparkles" },
        { "dining",         "utensils" },
        { "travel",         "plane" },
    };

    public static string Resolve(string? key) =>
        key is { } k && ByKey.TryGetValue(k, out var icon) ? icon : DefaultIcon;
}

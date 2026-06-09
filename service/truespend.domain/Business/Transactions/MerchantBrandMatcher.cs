using System.Text;

namespace TrueSpend.Domain.Business.Transactions;

// Decides whether a transaction's Plaid merchant_name belongs to the brand a merchant-locked
// reward rule requires (e.g. does "DoubleTree #4471" satisfy the "Hilton Hotels & Resorts" 12x rule?).
//
// merchant_brand on the reward rule is the raw RewardsCC leaf name. The alias families below map a
// brand to the normalized tokens that identify its portfolio in a Plaid merchant string. Match is a
// substring test on the normalized merchant name. Unknown brands fall back to a conservative
// whole-phrase match so a miss under-credits (safe) rather than over-credits (phantom missed reward).
public static class MerchantBrandMatcher
{
    private static readonly Dictionary<string, string[]> AliasesByBrand = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Hilton Hotels & Resorts"] = new[]
        {
            "hilton", "doubletree", "hampton", "embassy suites", "waldorf", "conrad", "canopy",
            "curio", "tapestry", "motto", "homewood", "home2", "signia", "tempo", "lxr",
        },
        ["Marriott"] = new[]
        {
            "marriott", "ritz carlton", "sheraton", "westin", "courtyard", "residence inn",
            "fairfield", "springhill", "renaissance", "st regis", "le meridien", "aloft",
            "element", "moxy", "gaylord", "ac hotel", "delta hotels", "four points", "towneplace",
        },
        ["Delta"] = new[] { "delta air" },
        ["United"] = new[] { "united air" },
        ["American Airlines"] = new[] { "american airlines" },
        ["Southwest"] = new[] { "southwest air" },
    };

    // Generic words stripped before the unknown-brand fallback so "Hotels"/"Resorts"/"Airlines"
    // don't drive a match on their own.
    private static readonly HashSet<string> GenericWords = new(StringComparer.Ordinal)
    {
        "hotels", "hotel", "resorts", "resort", "airlines", "airline", "air", "the", "and",
        "of", "stores", "store", "co", "inc", "company",
    };

    public static string Normalize(string? merchantName)
    {
        if (string.IsNullOrWhiteSpace(merchantName)) return string.Empty;
        var sb = new StringBuilder(merchantName.Length);
        foreach (var ch in merchantName.ToLowerInvariant())
        {
            if (char.IsLetter(ch) || char.IsWhiteSpace(ch)) sb.Append(ch);
            else if (char.IsDigit(ch)) { /* drop store numbers */ }
            else sb.Append(' '); // punctuation -> separator
        }
        return string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    public static bool Matches(string? merchantBrand, string? plaidMerchantName)
    {
        if (string.IsNullOrWhiteSpace(merchantBrand)) return false;
        var merchant = Normalize(plaidMerchantName);
        if (merchant.Length == 0) return false;

        if (AliasesByBrand.TryGetValue(merchantBrand, out var aliases))
            return aliases.Any(a => merchant.Contains(a, StringComparison.Ordinal));

        // No curated family: require the brand's significant words (whole phrase) to appear.
        var significant = Normalize(merchantBrand)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 2 && !GenericWords.Contains(w))
            .ToArray();
        if (significant.Length == 0) return false;
        return merchant.Contains(string.Join(' ', significant), StringComparison.Ordinal);
    }
}

namespace TrueSpend.Domain.Services.Catalog;

// Decides whether a RewardsCC reward rule is brand/merchant-locked (bonus applies only at a
// specific merchant, e.g. 12x "Hilton Hotels & Resorts") vs generic (applies across the whole
// subcategory_group, e.g. 6x "Dining").
//
// Detection is a SAFE-BY-DEFAULT allowlist of generic leaf names (spendBonusCategoryName).
// Anything NOT on the list is treated as merchant-locked. Rationale:
//   - false positive (real generic marked locked)  -> under-credit  -> safe, quiet
//   - false negative (real brand marked generic)    -> over-credit   -> phantom missed reward (bad)
// So the list contains ONLY names we are confident are generic; ambiguous names fall through to
// locked. Expand the list as the full RewardsCC catalog is reviewed.
public static class RewardsCcBrandDetection
{
    private static readonly HashSet<string> GenericCategoryNames = new(StringComparer.OrdinalIgnoreCase)
    {
        // Dining
        "Dining", "Restaurants", "Restaurant",
        // Grocery
        "Grocery", "Grocery Stores", "Groceries", "Supermarkets", "Wholesale Clubs",
        // Auto / gas
        "Gas", "Gas Stations", "EV Charging",
        // Travel (generic only — branded hotels/airlines are NOT here)
        "Travel", "Hotel", "Hotels", "Flights", "Airfare", "Airlines", "Car Rental", "Car Rentals", "Rental Cars", "Cruises",
        // Transit
        "Transit", "Public Transit", "Rideshare", "Commuting", "Tolls", "Parking",
        // Shopping
        "Online Shopping", "Department Stores", "Clothing", "Electronics", "Office Supplies", "Office Supply Stores",
        // Entertainment / media
        "Entertainment", "Streaming", "Streaming Services",
        // Health
        "Drugstores", "Pharmacy", "Pharmacies",
        // Utilities / services
        "Internet", "Cable", "Phone", "Cell Phone", "Wireless", "Utilities", "Gym", "Gyms", "Fitness",
        "Advertising", "Shipping",
    };

    public static bool IsMerchantLocked(string spendBonusCategoryName) =>
        !GenericCategoryNames.Contains(spendBonusCategoryName.Trim());
}

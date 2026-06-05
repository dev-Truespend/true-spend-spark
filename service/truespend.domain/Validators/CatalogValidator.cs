using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Domain.Validators;

public sealed class CatalogValidator
{
    public IReadOnlyList<string> ValidateCreateCardProductRequest(CreateCardProductRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.IssuerName)) errors.Add("Issuer name is required.");
        if (string.IsNullOrWhiteSpace(request.CardName)) errors.Add("Card name is required.");
        return errors;
    }
}

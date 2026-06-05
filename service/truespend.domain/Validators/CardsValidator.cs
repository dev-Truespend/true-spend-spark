using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Validators;

public sealed class CardsValidator
{
    public IReadOnlyList<string> ValidateCreateManualCard(CreateManualCardRequest request)
    {
        var errors = new List<string>();
        if (request.CardProductId <= 0) errors.Add("Card product is required.");
        if (request.IssuerId <= 0) errors.Add("Issuer is required.");
        if (!string.IsNullOrWhiteSpace(request.LastFour) && request.LastFour.Length != 4) errors.Add("Last four must be four digits.");
        return errors;
    }

    public IReadOnlyList<string> ValidateUpdateCard(UpdateCardRequest request)
    {
        var errors = new List<string>();
        if (!string.IsNullOrWhiteSpace(request.LastFour) && request.LastFour.Length != 4) errors.Add("Last four must be four digits.");
        return errors;
    }

    public IReadOnlyList<string> ValidateUpsertRewardOverride(UpsertRewardOverrideRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.CategoryCode)) errors.Add("Category code is required.");
        if (request.Multiplier <= 0) errors.Add("Multiplier must be greater than zero.");
        return errors;
    }

    public IReadOnlyList<string> ValidateDeleteRewardOverride(DeleteRewardOverrideRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.CategoryCode)) errors.Add("Category code is required.");
        return errors;
    }
}

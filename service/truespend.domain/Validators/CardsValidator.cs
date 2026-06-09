using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Validators;

public sealed class CardsValidator
{
    public IReadOnlyList<string> ValidateCreateManualCard(CreateManualCardRequest request)
    {
        var errors = new List<string>();
        if (request.CardProductId <= 0) errors.Add("Card product is required.");
        if (request.IssuerId <= 0) errors.Add("Issuer is required.");
        // Last four is required so a later Plaid link can confidently match and adopt this card.
        if (string.IsNullOrWhiteSpace(request.LastFour)) errors.Add("Last four is required.");
        else if (!IsFourDigits(request.LastFour)) errors.Add("Last four must be four digits.");
        return errors;
    }

    public IReadOnlyList<string> ValidateUpdateCard(UpdateCardRequest request)
    {
        var errors = new List<string>();
        if (!string.IsNullOrWhiteSpace(request.LastFour) && !IsFourDigits(request.LastFour)) errors.Add("Last four must be four digits.");
        return errors;
    }

    private static bool IsFourDigits(string value) => value.Length == 4 && value.All(char.IsDigit);

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

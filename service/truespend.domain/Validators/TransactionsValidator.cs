using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.Validators;

public sealed class TransactionsValidator
{
    public IReadOnlyList<string> ValidateCreate(CreateTransactionRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.MerchantName))
            errors.Add("Merchant name is required.");
        else if (request.MerchantName.Length > TransactionsConstants.MaxMerchantNameLength)
            errors.Add($"Merchant name must be {TransactionsConstants.MaxMerchantNameLength} characters or fewer.");

        if (request.Amount < TransactionsConstants.MinimumAmount)
            errors.Add("Amount must be greater than zero.");

        if (request.CardId <= 0)
            errors.Add("A valid card is required.");

        if (string.IsNullOrWhiteSpace(request.CategoryCode))
            errors.Add("Category is required.");

        return errors;
    }

    public IReadOnlyList<string> ValidateUpdate(UpdateTransactionRequest request)
    {
        var errors = new List<string>();

        if (request.MerchantName is not null && request.MerchantName.Length > TransactionsConstants.MaxMerchantNameLength)
            errors.Add($"Merchant name must be {TransactionsConstants.MaxMerchantNameLength} characters or fewer.");

        if (request.Amount.HasValue && request.Amount.Value < TransactionsConstants.MinimumAmount)
            errors.Add("Amount must be greater than zero.");

        if (request.CardId.HasValue && request.CardId.Value <= 0)
            errors.Add("A valid card is required.");

        return errors;
    }
}

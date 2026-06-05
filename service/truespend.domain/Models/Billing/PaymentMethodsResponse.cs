namespace TrueSpend.Domain.Models.Billing;

public sealed record PaymentMethodsResponse(IReadOnlyList<PaymentMethod> PaymentMethods);

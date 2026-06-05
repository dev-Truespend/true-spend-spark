namespace TrueSpend.Api.ViewModels.Billing;

public sealed record PaymentMethodsResponseVm(IReadOnlyList<PaymentMethodVm> PaymentMethods);

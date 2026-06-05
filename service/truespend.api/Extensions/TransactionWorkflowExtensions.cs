using TrueSpend.Api.Mappers;
using TrueSpend.Domain.Business.Transactions;
using TrueSpend.Domain.BusinessInterfaces.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Services.Transactions;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Api.Extensions;

public static class TransactionWorkflowExtensions
{
    public static IServiceCollection AddTransactionWorkflow(this IServiceCollection services)
    {
        services.AddScoped<ITransactionsReadService, TransactionsReadService>();
        services.AddScoped<ITransactionsInsertService, TransactionsInsertService>();
        services.AddScoped<ITransactionsUpdateService, TransactionsUpdateService>();
        services.AddScoped<ITransactionsDeleteService, TransactionsDeleteService>();

        services.AddScoped<ITransactionsReadBusiness, TransactionsReadBusiness>();
        services.AddScoped<ITransactionsInsertBusiness, TransactionsInsertBusiness>();
        services.AddScoped<ITransactionsUpdateBusiness, TransactionsUpdateBusiness>();
        services.AddScoped<ITransactionsDeleteBusiness, TransactionsDeleteBusiness>();

        services.AddScoped<TransactionsValidator>();

        services.AddScoped<ITransactionsMapper, TransactionsMapper>();
        return services;
    }
}

using TrueSpend.Api.Mappers;
using TrueSpend.Domain.Business.Lookup;
using TrueSpend.Domain.Business.Permissions;
using TrueSpend.Domain.Business.Preferences;
using TrueSpend.Domain.Business.Profile;
using TrueSpend.Domain.BusinessInterfaces.Lookup;
using TrueSpend.Domain.BusinessInterfaces.Permissions;
using TrueSpend.Domain.BusinessInterfaces.Preferences;
using TrueSpend.Domain.BusinessInterfaces.Profile;
using TrueSpend.Domain.ServiceInterfaces.Lookup;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Preferences;
using TrueSpend.Domain.ServiceInterfaces.Profile;
using TrueSpend.Domain.ServiceInterfaces.Storage;
using TrueSpend.Domain.Services.Lookup;
using TrueSpend.Domain.Services.Messaging;
using TrueSpend.Domain.Services.Persistence;
using TrueSpend.Domain.Services.Preferences;
using TrueSpend.Domain.Services.Profile;
using TrueSpend.Domain.Services.Storage;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Api.Extensions;

public static class ProfileWorkflowExtensions
{
    public static IServiceCollection AddProfileWorkflow(this IServiceCollection services, IConfiguration configuration)
    {
        services.TryAddScopedSafe<IUnitOfWork, UnitOfWork>();
        services.TryAddScopedSafe<IMessagingInsertService, MessagingInsertService>();

        services.AddScoped<IProfileReadService, ProfileReadService>();
        services.AddScoped<IProfileUpdateService, ProfileUpdateService>();
        services.AddScoped<IProfileLookupService, ProfileLookupService>();
        services.AddScoped<IPreferencesReadService, PreferencesReadService>();
        services.AddScoped<IPreferencesUpdateService, PreferencesUpdateService>();
        services.AddScoped<ILookupReadService, LookupReadService>();

        services.AddScoped<IProfileReadBusiness, ProfileReadBusiness>();
        services.AddScoped<IProfileUpdateBusiness, ProfileUpdateBusiness>();
        services.AddScoped<IPreferencesReadBusiness, PreferencesReadBusiness>();
        services.AddScoped<IPreferencesUpdateBusiness, PreferencesUpdateBusiness>();
        services.AddScoped<ILookupReadBusiness, LookupReadBusiness>();
        services.AddScoped<IPermissionsReadBusiness, PermissionsReadBusiness>();

        services.AddScoped<ProfileValidator>();
        services.AddScoped<PreferencesValidator>();

        services.AddScoped<IProfileMapper, ProfileMapper>();
        services.AddScoped<IPreferencesMapper, PreferencesMapper>();
        services.AddScoped<ILookupsMapper, LookupsMapper>();

        AddStorageProvider(services, configuration);
        return services;
    }

    private static void AddStorageProvider(IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection("SupabaseStorage");
        var options = new SupabaseStorageOptions();
        section.Bind(options);
        services.Configure<SupabaseStorageOptions>(section);

        if (string.IsNullOrWhiteSpace(options.Url) || string.IsNullOrWhiteSpace(options.ServiceRoleKey))
        {
            services.AddScoped<IStorageProvider, StoragePlaceholderProvider>();
            return;
        }

        services.AddHttpClient<SupabaseStorageProvider>();
        services.AddScoped<IStorageProvider, SupabaseStorageProvider>();
    }

    private static void TryAddScopedSafe<TInterface, TImpl>(this IServiceCollection services)
        where TInterface : class
        where TImpl : class, TInterface
    {
        if (services.Any(s => s.ServiceType == typeof(TInterface))) return;
        services.AddScoped<TInterface, TImpl>();
    }
}

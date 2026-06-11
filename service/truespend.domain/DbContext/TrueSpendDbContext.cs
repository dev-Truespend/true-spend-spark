using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Entities.App;
using TrueSpend.Domain.Entities.Billing;
using TrueSpend.Domain.Entities.Catalog;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Entities.Foursquare;
using TrueSpend.Domain.Entities.Insights;
using TrueSpend.Domain.Entities.Lookup;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Entities.Privacy;
using TrueSpend.Domain.Entities.Security;

namespace TrueSpend.Domain.DbContext;

public sealed class TrueSpendDbContext(DbContextOptions<TrueSpendDbContext> options) : Microsoft.EntityFrameworkCore.DbContext(options)
{
    public DbSet<ProfileEntity> Profiles => Set<ProfileEntity>();
    public DbSet<OnboardingStateEntity> OnboardingStates => Set<OnboardingStateEntity>();
    public DbSet<UserPreferenceEntity> UserPreferences => Set<UserPreferenceEntity>();
    public DbSet<UserPermissionEntity> UserPermissions => Set<UserPermissionEntity>();
    public DbSet<UserDevicePermissionEntity> UserDevicePermissions => Set<UserDevicePermissionEntity>();
    public DbSet<UserDailyUsageEntity> UserDailyUsages => Set<UserDailyUsageEntity>();

    public DbSet<CountryEntity> Countries => Set<CountryEntity>();
    public DbSet<PlanEntity> Plans => Set<PlanEntity>();
    public DbSet<PlanPriceEntity> PlanPrices => Set<PlanPriceEntity>();
    public DbSet<FeatureEntity> Features => Set<FeatureEntity>();
    public DbSet<PlanFeatureEntity> PlanFeatures => Set<PlanFeatureEntity>();
    public DbSet<StripeCustomerEntity> StripeCustomers => Set<StripeCustomerEntity>();
    public DbSet<SubscriptionEntity> Subscriptions => Set<SubscriptionEntity>();
    public DbSet<PaymentMethodEntity> PaymentMethods => Set<PaymentMethodEntity>();
    public DbSet<StripeWebhookEventEntity> StripeWebhookEvents => Set<StripeWebhookEventEntity>();

    public DbSet<CardIssuerEntity> CardIssuers => Set<CardIssuerEntity>();
    public DbSet<CardProductEntity> CardProducts => Set<CardProductEntity>();
    public DbSet<CardProductRequestEntity> CardProductRequests => Set<CardProductRequestEntity>();
    public DbSet<CategoryEntity> Categories => Set<CategoryEntity>();
    public DbSet<CategoryAliasEntity> CategoryAliases => Set<CategoryAliasEntity>();
    public DbSet<RewardRuleEntity> RewardRules => Set<RewardRuleEntity>();
    public DbSet<CardProductReviewItemEntity> CardProductReviewItems => Set<CardProductReviewItemEntity>();

    public DbSet<PlaidItemEntity> PlaidItems => Set<PlaidItemEntity>();
    public DbSet<PlaidAccountEntity> PlaidAccounts => Set<PlaidAccountEntity>();
    public DbSet<PlaidInstitutionEntity> PlaidInstitutions => Set<PlaidInstitutionEntity>();
    public DbSet<UserCardEntity> UserCards => Set<UserCardEntity>();
    public DbSet<CardRewardOverrideEntity> CardRewardOverrides => Set<CardRewardOverrideEntity>();
    public DbSet<MerchantEntity> Merchants => Set<MerchantEntity>();
    public DbSet<MerchantVisitEntity> MerchantVisits => Set<MerchantVisitEntity>();
    public DbSet<RecommendationEntity> Recommendations => Set<RecommendationEntity>();
    public DbSet<TransactionEntity> Transactions => Set<TransactionEntity>();
    public DbSet<TransactionCategoryEntity> TransactionCategories => Set<TransactionCategoryEntity>();
    public DbSet<TransactionCategoryBridgeEntity> TransactionCategoryBridges => Set<TransactionCategoryBridgeEntity>();
    public DbSet<TransactionRewardResultEntity> TransactionRewardResults => Set<TransactionRewardResultEntity>();
    public DbSet<MissedRewardEventEntity> MissedRewardEvents => Set<MissedRewardEventEntity>();
    public DbSet<FoursquareWebhookEventEntity> FoursquareWebhookEvents => Set<FoursquareWebhookEventEntity>();
    public DbSet<PlaidWebhookEventEntity> PlaidWebhookEvents => Set<PlaidWebhookEventEntity>();
    public DbSet<LocationEventEntity> LocationEvents => Set<LocationEventEntity>();

    public DbSet<FoursquareChainEntity> FoursquareChains => Set<FoursquareChainEntity>();
    public DbSet<FoursquarePlaceEntity> FoursquarePlaces => Set<FoursquarePlaceEntity>();
    public DbSet<FoursquareCategoryBridgeEntity> FoursquareCategoryBridges => Set<FoursquareCategoryBridgeEntity>();

    public DbSet<CurrencyEntity> Currencies => Set<CurrencyEntity>();
    public DbSet<OnboardingStepEntity> OnboardingSteps => Set<OnboardingStepEntity>();
    public DbSet<PermissionStateEntity> PermissionStates => Set<PermissionStateEntity>();
    public DbSet<DevicePlatformEntity> DevicePlatforms => Set<DevicePlatformEntity>();
    public DbSet<RoleEntity> Roles => Set<RoleEntity>();
    public DbSet<CardNetworkEntity> CardNetworks => Set<CardNetworkEntity>();
    public DbSet<RewardCurrencyEntity> RewardCurrencies => Set<RewardCurrencyEntity>();
    public DbSet<PlaidItemStatusEntity> PlaidItemStatuses => Set<PlaidItemStatusEntity>();
    public DbSet<CardSourceEntity> CardSources => Set<CardSourceEntity>();
    public DbSet<PeriodEntity> Periods => Set<PeriodEntity>();
    public DbSet<SubscriptionStatusEntity> SubscriptionStatuses => Set<SubscriptionStatusEntity>();
    public DbSet<RecommendationContextEntity> RecommendationContexts => Set<RecommendationContextEntity>();
    public DbSet<LocationEventTypeEntity> LocationEventTypes => Set<LocationEventTypeEntity>();
    public DbSet<EventOutboxStatusEntity> EventOutboxStatuses => Set<EventOutboxStatusEntity>();
    public DbSet<EventDeliveryStatusEntity> EventDeliveryStatuses => Set<EventDeliveryStatusEntity>();

    public DbSet<DeviceEntity> Devices => Set<DeviceEntity>();
    public DbSet<NotificationPreferenceEntity> NotificationPreferences => Set<NotificationPreferenceEntity>();
    public DbSet<NotificationTypeEntity> NotificationTypes => Set<NotificationTypeEntity>();
    public DbSet<NotificationTypePreferenceEntity> NotificationTypePreferences => Set<NotificationTypePreferenceEntity>();
    public DbSet<NotificationEntity> Notifications => Set<NotificationEntity>();
    public DbSet<NotificationReminderEntity> NotificationReminders => Set<NotificationReminderEntity>();
    public DbSet<NotificationDeliveryEntity> NotificationDeliveries => Set<NotificationDeliveryEntity>();
    public DbSet<EventOutboxEntity> EventOutbox => Set<EventOutboxEntity>();
    public DbSet<EventSubscriptionEntity> EventSubscriptions => Set<EventSubscriptionEntity>();
    public DbSet<EventDeliveryEntity> EventDeliveries => Set<EventDeliveryEntity>();
    public DbSet<AdminNotificationCampaignEntity> AdminNotificationCampaigns => Set<AdminNotificationCampaignEntity>();

    public DbSet<AnalyticsSnapshotEntity> AnalyticsSnapshots => Set<AnalyticsSnapshotEntity>();
    public DbSet<InsightGenerationRunEntity> InsightGenerationRuns => Set<InsightGenerationRunEntity>();
    public DbSet<AIInsightEntity> AIInsights => Set<AIInsightEntity>();

    public DbSet<AnalyticsPeriodEntity> AnalyticsPeriods => Set<AnalyticsPeriodEntity>();
    public DbSet<GenerationStatusEntity> GenerationStatuses => Set<GenerationStatusEntity>();
    public DbSet<AIInsightTypeEntity> AIInsightTypes => Set<AIInsightTypeEntity>();
    public DbSet<PriorityLevelEntity> PriorityLevels => Set<PriorityLevelEntity>();
    public DbSet<NotificationChannelEntity> NotificationChannels => Set<NotificationChannelEntity>();
    public DbSet<DeliveryStatusEntity> DeliveryStatuses => Set<DeliveryStatusEntity>();
    public DbSet<CapPeriodEntity> CapPeriods => Set<CapPeriodEntity>();

    public DbSet<PrivacySettingsEntity> PrivacySettings => Set<PrivacySettingsEntity>();
    public DbSet<AccountDeletionRequestEntity> AccountDeletionRequests => Set<AccountDeletionRequestEntity>();
    public DbSet<PrivacyAuditEventEntity> PrivacyAuditEvents => Set<PrivacyAuditEventEntity>();

    public DbSet<UserRoleEntity> UserRoles => Set<UserRoleEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TrueSpendDbContext).Assembly);
    }
}

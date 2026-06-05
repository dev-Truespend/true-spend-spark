namespace TrueSpend.Domain.Constants;

public static class PlaidConstants
{
    public const string ItemStatusActive = "active";
    public const string ItemStatusLoginRequired = "login_required";
    public const string ItemStatusError = "error";
    public const string ItemStatusDisconnected = "disconnected";

    public const string WebhookTypeItem = "ITEM";
    public const string WebhookTypeTransactions = "TRANSACTIONS";

    public const string WebhookCodeItemLoginRequired = "ITEM_LOGIN_REQUIRED";
    public const string WebhookCodeItemPendingExpiration = "PENDING_EXPIRATION";
    public const string WebhookCodeItemError = "ERROR";
    public const string WebhookCodeItemNewAccountsAvailable = "NEW_ACCOUNTS_AVAILABLE";
    public const string WebhookCodeItemUserPermissionRevoked = "USER_PERMISSION_REVOKED";
}

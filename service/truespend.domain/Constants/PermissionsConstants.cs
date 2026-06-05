namespace TrueSpend.Domain.Constants;

public static class PermissionsConstants
{
    public const string StateUnknown = "unknown";
    public const string StateNotDetermined = "not_determined";
    public const string StateDenied = "denied";
    public const string StateRestricted = "restricted";
    public const string StateLimited = "limited";
    public const string StateProvisional = "provisional";
    public const string StateGranted = "granted";
    public const string StateAuthorized = "authorized";
    public const string StateAuthorizedWhenInUse = "authorized_when_in_use";
    public const string StateAuthorizedAlways = "authorized_always";
    public const string StateAuthorizedOnce = "authorized_once";

    public static readonly HashSet<string> ValidStates = new(System.StringComparer.OrdinalIgnoreCase)
    {
        StateUnknown,
        StateNotDetermined,
        StateDenied,
        StateRestricted,
        StateLimited,
        StateProvisional,
        StateGranted,
        StateAuthorized,
        StateAuthorizedWhenInUse,
        StateAuthorizedAlways,
        StateAuthorizedOnce
    };
}

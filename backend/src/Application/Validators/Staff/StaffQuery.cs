namespace NhuNguyetSpa.Application.Validators.Staff;

/// <summary>Parses the owner's <c>status</c> filter of <c>GET /staff</c>: blank = everyone, working = false, resigned = true.</summary>
public static class StaffQuery
{
    public const int MaxSearchLength = 100;

    public static bool TryParseStatus(string? status, out bool? resigned)
    {
        resigned = null;
        switch (status?.Trim().ToLowerInvariant())
        {
            case null or "":
                return true;
            case "working":
                resigned = false;
                return true;
            case "resigned":
                resigned = true;
                return true;
            default:
                return false;
        }
    }
}

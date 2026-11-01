using System.Text.Json;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Treatments;

/// <summary>The snake_case names of <see cref="TreatmentPlanStatus"/> used in query strings, and their Vietnamese labels.</summary>
public static class TreatmentStatusText
{
    private static readonly Dictionary<string, TreatmentPlanStatus> ByName = Enum.GetValues<TreatmentPlanStatus>()
        .ToDictionary(status => JsonNamingPolicy.SnakeCaseLower.ConvertName(status.ToString()), StringComparer.Ordinal);

    /// <summary>Null or blank means "any status" and parses to null.</summary>
    public static bool TryParse(string? text, out TreatmentPlanStatus? status)
    {
        status = null;
        if (string.IsNullOrWhiteSpace(text))
            return true;
        if (!ByName.TryGetValue(text, out var value))
            return false;
        status = value;
        return true;
    }

    public static string ToVietnamese(TreatmentPlanStatus status) => status switch
    {
        TreatmentPlanStatus.NotStarted => "chưa bắt đầu",
        TreatmentPlanStatus.InProgress => "đang thực hiện",
        TreatmentPlanStatus.Completed => "đã hoàn thành",
        TreatmentPlanStatus.Paused => "tạm dừng",
        _ => "đã hủy",
    };
}

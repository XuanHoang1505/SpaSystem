using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NhuNguyetSpa.API.Serialization;

/// <summary>
/// Shift and appointment times travel as <c>HH:mm</c> (docs/specs/staff.md). Reading also accepts <c>H:mm</c> and
/// <c>HH:mm:ss</c>; a non-zero seconds part parses here and is rejected by the validators with a field error.
/// </summary>
public sealed class HourMinuteTimeOnlyJsonConverter : JsonConverter<TimeOnly>
{
    private static readonly string[] Formats = ["H:mm", "HH:mm", "HH:mm:ss"];

    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var text = reader.GetString();
        if (TimeOnly.TryParseExact(text, Formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time))
            return time;
        throw new JsonException("Giờ phải có dạng HH:mm.");
    }

    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString("HH:mm", CultureInfo.InvariantCulture));
}

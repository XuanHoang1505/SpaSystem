namespace NhuNguyetSpa.Application.Common.Models;

public sealed record ErrorDetail(string Code, string Message, string? Field = null);

using NhuNguyetSpa.Application.Common.Models;

namespace NhuNguyetSpa.API.Responses;

public sealed record ApiResponse<T>(bool Success, string? Message, T? Data, IReadOnlyCollection<ErrorDetail> Errors, string TraceId);

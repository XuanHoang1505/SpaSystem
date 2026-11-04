using FluentValidation;
using FluentValidation.Results;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The optional <c>Idempotency-Key</c> request header (BR-ORD-08): absent → null, otherwise it must be a UUID.</summary>
internal static class IdempotencyKey
{
    public const string Header = "Idempotency-Key";

    public static Guid? Parse(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (Guid.TryParse(value, out var parsed))
            return parsed;
        throw new ValidationException([new ValidationFailure(Header, "Idempotency-Key phải là một UUID.") { ErrorCode = "validation_error" }]);
    }
}

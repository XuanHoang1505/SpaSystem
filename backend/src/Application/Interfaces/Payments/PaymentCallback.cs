namespace NhuNguyetSpa.Application.Interfaces.Payments;

/// <summary>A gateway result after signature verification; the other fields mean nothing when the signature is invalid.</summary>
public sealed record PaymentCallback(
    bool IsSignatureValid,
    string? RequestCode,
    decimal Amount,
    bool IsSuccess,
    string? ResponseCode,
    string? ProviderTransactionId);

using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.DTOs.Payments;

/// <summary>Body of <c>POST /me/orders/{id}/payments</c>; the client picks the result page (default web).</summary>
public sealed record CreatePaymentRequest(PaymentClient? Client);

/// <summary><see cref="InstallmentSequenceNumber"/>: the installment this attempt pays (BR-INS-05), null for an order paid in full.</summary>
public sealed record PaymentAttemptDto(Guid PaymentId, string PaymentUrl, DateTime ExpiresAtUtc, decimal Amount = 0, int? InstallmentSequenceNumber = null);

/// <summary>What happened to a gateway result; the IPN endpoint maps it to the gateway's response codes.</summary>
public enum PaymentCallbackStatus
{
    Confirmed,
    AlreadyProcessed,
    PaymentNotFound,
    InvalidAmount,
    InvalidSignature,

    /// <summary>A verified return URL while return processing is off (Production, Q-19): shown, not recorded.</summary>
    NotProcessed,
}

public sealed record PaymentCallbackOutcome(PaymentCallbackStatus Status, Guid? OrderId);

/// <summary>Ids found for a gateway request code.</summary>
public sealed record PaymentReference(Guid PaymentId, Guid OrderId);

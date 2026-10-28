using NhuNguyetSpa.Application.DTOs.Orders;

namespace NhuNguyetSpa.Application.DTOs.Payments;

/// <summary>Body of <c>POST /me/orders/{id}/payments</c>; the client picks the result page (default web).</summary>
public sealed record CreatePaymentRequest(PaymentClient? Client);

public sealed record PaymentAttemptDto(Guid PaymentId, string PaymentUrl, DateTime ExpiresAtUtc);

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

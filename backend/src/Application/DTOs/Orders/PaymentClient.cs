namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>The app that started a payment; picks the result page the return URL redirects to (<c>web</c> / <c>mobile</c>).</summary>
public enum PaymentClient
{
    Web,
    Mobile,
}

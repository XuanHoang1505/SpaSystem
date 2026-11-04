namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>Body of <c>POST /me/orders/{id}/cancel</c> and <c>POST /orders/{id}/cancel</c>; the reason is required for both (Q-43).</summary>
public sealed record CancelOrderRequest(string? Reason);

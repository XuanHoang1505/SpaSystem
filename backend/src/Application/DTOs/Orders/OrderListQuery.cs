namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>
/// Filters of <c>GET /me/orders</c> and <c>GET /orders</c> (paging, and for the owner <c>search</c>/<c>sortBy</c>, come from
/// <c>PagedQuery</c>): <see cref="Status"/> is a snake_case order status; dates are Vietnam dates of creation, inclusive (BR-ORD-11).
/// </summary>
public sealed class OrderListQuery
{
    public string? Status { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
}

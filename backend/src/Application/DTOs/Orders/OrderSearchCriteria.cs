using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Orders;

public enum OrderSortField
{
    CreatedAtUtc,
    GrandTotal,
}

/// <summary>
/// Repository input of the order lists: <see cref="CustomerId"/> null = every customer (owner); creation time in
/// [<see cref="FromUtc"/>, <see cref="ToUtcExclusive"/>); <see cref="Search"/> matches the code or the customer (owner only).
/// Ties are broken by code.
/// </summary>
public sealed record OrderSearchCriteria(
    Guid? CustomerId,
    OrderStatus? Status,
    DateTime? FromUtc,
    DateTime? ToUtcExclusive,
    string? Search,
    OrderSortField SortBy,
    SortDirection Direction,
    int PageNumber,
    int PageSize);

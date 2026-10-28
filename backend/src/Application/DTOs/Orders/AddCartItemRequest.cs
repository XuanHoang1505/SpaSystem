namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>Exactly one of the two ids (BR-ORD-01).</summary>
public sealed record AddCartItemRequest(Guid? SpaServiceId, Guid? ServicePackageId);

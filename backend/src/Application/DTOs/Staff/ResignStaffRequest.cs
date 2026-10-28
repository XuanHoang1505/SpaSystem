namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>Body of <c>POST /staff/{id}/resign</c> (BR-STF-01).</summary>
public sealed record ResignStaffRequest(DateOnly? ResignationDate);

namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>Body of <c>POST /me/appointments/book-now</c> (UC-SPA-15 flow 1); no staff member = "any staff" (Q-26).</summary>
public sealed record BookNowRequest(Guid? SpaServiceId, DateOnly? Date, TimeOnly? StartTime, Guid? StaffMemberId, string? PromotionCode);

namespace NhuNguyetSpa.Application.DTOs.Reports;

/// <summary>Customers by recognized revenue and staff by completed visits over one range (UC-SPA-33).</summary>
public sealed record RevenueLeadersDto(
    DateOnly FromDate,
    DateOnly ToDate,
    IReadOnlyList<TopCustomerDto> TopCustomers,
    IReadOnlyList<TopStaffDto> TopStaff);

/// <summary><see cref="Revenue"/> counts recognized payments only, like the revenue report (Q-46); <see cref="OrderCount"/> is distinct orders.</summary>
public sealed record TopCustomerDto(Guid CustomerId, string FullName, string PhoneNumber, int OrderCount, decimal Revenue);

/// <summary>Appointments dated inside the range: <see cref="CompletedCount"/> completed, <see cref="AppointmentCount"/> pending, confirmed, completed or no-show.</summary>
public sealed record TopStaffDto(Guid StaffMemberId, string FullName, int CompletedCount, int AppointmentCount);

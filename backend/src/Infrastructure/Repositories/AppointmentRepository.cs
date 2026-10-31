using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.WorkSchedules;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

// Customer search uses f_unaccent(lower(x)) like the catalog; "%", "_" and "\" in the search text are literal.
public sealed class AppointmentRepository : Repository<Appointment>, IAppointmentRepository
{
    public AppointmentRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<AppointmentToReassignDto>> GetOccupyingFromAsync(
        Guid staffMemberId, DateOnly fromDate, DateTime nowUtc, CancellationToken cancellationToken) =>
        await Set.AsNoTracking()
            .Where(AppointmentOccupancy.IsOccupying(nowUtc))
            .Where(appointment => appointment.StaffMemberId == staffMemberId && appointment.Date >= fromDate)
            .OrderBy(appointment => appointment.Date)
            .ThenBy(appointment => appointment.StartTime)
            .Select(appointment => new AppointmentToReassignDto(
                appointment.Id, appointment.Date, appointment.StartTime, appointment.EndTime, appointment.Status,
                appointment.CustomerId, appointment.Customer.User.FullName))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<(TimeOnly Start, TimeOnly End)>> GetOccupyingOnAsync(
        Guid staffMemberId, DateOnly date, DateTime nowUtc, CancellationToken cancellationToken)
    {
        var slots = await Set.AsNoTracking()
            .Where(AppointmentOccupancy.IsOccupying(nowUtc))
            .Where(appointment => appointment.StaffMemberId == staffMemberId && appointment.Date == date)
            .Select(appointment => new { appointment.StartTime, appointment.EndTime })
            .ToListAsync(cancellationToken);
        return slots.Select(slot => (slot.StartTime, slot.EndTime)).ToList();
    }

    public async Task<PagedResult<AppointmentListItemDto>> SearchAsync(AppointmentSearchCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var query = Set.AsNoTracking().WithService(Context)
            .Where(row => row.Appointment.Date >= criteria.FromDate && row.Appointment.Date <= criteria.ToDate);
        if (criteria.StaffMemberId is { } staffMemberId)
            query = query.Where(row => row.Appointment.StaffMemberId == staffMemberId);
        if (criteria.Status is { } status)
            query = query.Where(row => row.Appointment.Status == status);
        if (criteria.Search is { } search)
        {
            var pattern = CatalogSearchText.Contains(search);
            query = query.Where(row =>
                EF.Functions.Like(AppDbContext.Unaccent(row.Appointment.Customer.User.FullName.ToLower()), AppDbContext.Unaccent(pattern.ToLower()), CatalogSearchText.EscapeCharacter) ||
                EF.Functions.Like(row.Appointment.Customer.User.PhoneNumber, pattern, CatalogSearchText.EscapeCharacter));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(row => row.Appointment.Date).ThenBy(row => row.Appointment.StartTime).ThenBy(row => row.Appointment.Id)
            .Skip((criteria.PageNumber - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(row => new AppointmentListItemDto(
                row.Appointment.Id, row.Appointment.Date, row.Appointment.StartTime, row.Appointment.EndTime, row.Appointment.Status,
                new AppointmentCustomerDto(row.Appointment.CustomerId, row.Appointment.Customer.User.FullName, row.Appointment.Customer.User.PhoneNumber),
                new AppointmentStaffDto(row.Appointment.StaffMemberId, row.Appointment.StaffMember.User.FullName),
                new AppointmentServiceDto(row.Service.Id, row.Service.Name)))
            .ToListAsync(cancellationToken);
        return new PagedResult<AppointmentListItemDto>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public Task<AppointmentDetailDto?> GetDetailAsync(Guid id, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(appointment => appointment.Id == id)
        .WithService(Context)
        .Select(row => new AppointmentDetailDto(
            row.Appointment.Id, row.Appointment.Date, row.Appointment.StartTime, row.Appointment.EndTime, row.Appointment.Status,
            new AppointmentCustomerDto(row.Appointment.CustomerId, row.Appointment.Customer.User.FullName, row.Appointment.Customer.User.PhoneNumber),
            new AppointmentStaffDto(row.Appointment.StaffMemberId, row.Appointment.StaffMember.User.FullName),
            new AppointmentServiceDto(row.Service.Id, row.Service.Name),
            row.Appointment.HoldExpiresAtUtc, row.Appointment.CancelledAtUtc, row.Appointment.CancellationReason, row.Appointment.Note,
            row.Appointment.CreatedAtUtc,
            // BR-CARE-02: most severe first, then by allergen.
            Context.CustomerAllergies
                .Where(allergy => allergy.CustomerId == row.Appointment.CustomerId)
                .OrderBy(allergy => allergy.Severity == AllergySeverity.Severe ? 0 : allergy.Severity == AllergySeverity.Moderate ? 1 : 2)
                .ThenBy(allergy => allergy.Allergen)
                .Select(allergy => new CustomerAllergyDto(allergy.Id, allergy.Allergen, allergy.Severity, allergy.Note, allergy.RecordedAtUtc))
                .ToList(),
            row.Appointment.TreatmentSession == null
                ? null
                : new TreatmentSessionRefDto(
                    row.Appointment.TreatmentSession.Id, row.Appointment.TreatmentSession.SequenceNumber,
                    row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackage.TotalSessions,
                    row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackageId,
                    row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackage.PackageName),
            Context.SkinProfiles.Any(profile => profile.AppointmentId == row.Appointment.Id),
            Context.SkinProfiles.Where(profile => profile.AppointmentId == row.Appointment.Id).Select(profile => (Guid?)profile.Id).FirstOrDefault()))
        .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<AssignedAppointmentDto>> ListAssignedAsync(
        Guid staffMemberId, DateOnly from, DateOnly to, AppointmentStatus? status, CancellationToken cancellationToken) =>
        await Set.AsNoTracking()
            .Where(appointment => appointment.StaffMemberId == staffMemberId && appointment.Date >= from && appointment.Date <= to &&
                                  appointment.Status != AppointmentStatus.Held && appointment.Status != AppointmentStatus.HoldExpired &&
                                  (status == null || appointment.Status == status))
            .OrderBy(appointment => appointment.Date).ThenBy(appointment => appointment.StartTime).ThenBy(appointment => appointment.Id)
            .WithService(Context)
            .Select(row => new AssignedAppointmentDto(
                row.Appointment.Id, row.Appointment.Date, row.Appointment.StartTime, row.Appointment.EndTime, row.Appointment.Status,
                new AppointmentCustomerDto(row.Appointment.CustomerId, row.Appointment.Customer.User.FullName, row.Appointment.Customer.User.PhoneNumber),
                new AppointmentServiceDto(row.Service.Id, row.Service.Name),
                row.Appointment.TreatmentSession == null
                    ? null
                    : new TreatmentSessionRefDto(
                        row.Appointment.TreatmentSession.Id, row.Appointment.TreatmentSession.SequenceNumber,
                        row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackage.TotalSessions,
                        row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackageId,
                        row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackage.PackageName),
                Context.CustomerAllergies.Any(allergy => allergy.CustomerId == row.Appointment.CustomerId),
                Context.SkinProfiles.Any(profile => profile.AppointmentId == row.Appointment.Id)))
            .ToListAsync(cancellationToken);

    public Task<AppointmentCareInfo?> GetCareInfoAsync(Guid id, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(appointment => appointment.Id == id)
        .Select(appointment => new AppointmentCareInfo(
            appointment.Id, appointment.CustomerId, appointment.StaffMemberId, appointment.Status, appointment.Date, appointment.StartTime))
        .FirstOrDefaultAsync(cancellationToken);

    public async Task<(Appointment Appointment, Guid SpaServiceId)?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken)
    {
        await Context.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM appointments WHERE id = {id} FOR UPDATE", cancellationToken);
        var appointment = await Set
            .Include(item => item.ServiceEntitlement)
            .Include(item => item.TreatmentSession)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (appointment is null)
            return null;
        var spaServiceId = await GetSpaServiceIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException($"Appointment {id} has no derivable service.");
        return (appointment, spaServiceId);
    }

    public Task<Guid?> GetSpaServiceIdAsync(Guid id, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(appointment => appointment.Id == id)
        .WithService(Context)
        .Select(row => (Guid?)row.Service.Id)
        .FirstOrDefaultAsync(cancellationToken);

    public Task<bool> IsInCareAsync(Guid staffMemberId, Guid customerId, CancellationToken cancellationToken) =>
        Set.AnyAsync(appointment => appointment.StaffMemberId == staffMemberId && appointment.CustomerId == customerId &&
                                    (appointment.Status == AppointmentStatus.PendingConfirmation ||
                                     appointment.Status == AppointmentStatus.Confirmed ||
                                     appointment.Status == AppointmentStatus.Completed),
            cancellationToken);

    public Task<bool> HasSkinProfileAsync(Guid appointmentId, CancellationToken cancellationToken) =>
        Context.SkinProfiles.AnyAsync(profile => profile.AppointmentId == appointmentId, cancellationToken);

    public async Task<IReadOnlyList<(TimeOnly Start, TimeOnly End)>> GetCustomerOccupyingOnAsync(
        Guid customerId, DateOnly date, DateTime nowUtc, Guid? excludeId, CancellationToken cancellationToken)
    {
        var slots = await Set.AsNoTracking()
            .Where(AppointmentOccupancy.IsOccupying(nowUtc))
            .Where(appointment => appointment.CustomerId == customerId && appointment.Date == date && appointment.Id != excludeId)
            .Select(appointment => new { appointment.StartTime, appointment.EndTime })
            .ToListAsync(cancellationToken);
        return slots.Select(slot => (slot.StartTime, slot.EndTime)).ToList();
    }

    public async Task<IReadOnlyList<(Guid StaffMemberId, TimeOnly Start, TimeOnly End)>> GetOccupyingForStaffOnAsync(
        IReadOnlyCollection<Guid> staffMemberIds, DateOnly date, DateTime nowUtc, Guid? excludeId, CancellationToken cancellationToken)
    {
        var slots = await Set.AsNoTracking()
            .Where(AppointmentOccupancy.IsOccupying(nowUtc))
            .Where(appointment => staffMemberIds.Contains(appointment.StaffMemberId) && appointment.Date == date && appointment.Id != excludeId)
            .Select(appointment => new { appointment.StaffMemberId, appointment.StartTime, appointment.EndTime })
            .ToListAsync(cancellationToken);
        return slots.Select(slot => (slot.StaffMemberId, slot.StartTime, slot.EndTime)).ToList();
    }

    public Task<int> ExpireHeldAsync(Guid staffMemberId, DateOnly date, DateTime nowUtc, CancellationToken cancellationToken) => Set
        .Where(appointment => appointment.StaffMemberId == staffMemberId && appointment.Date == date &&
                              appointment.Status == AppointmentStatus.Held &&
                              (appointment.HoldExpiresAtUtc == null || appointment.HoldExpiresAtUtc <= nowUtc))
        .ExecuteUpdateAsync(setters => setters.SetProperty(appointment => appointment.Status, AppointmentStatus.HoldExpired), cancellationToken);

    public Task LockCustomerForBookingAsync(Guid customerId, CancellationToken cancellationToken) =>
        Context.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM customers WHERE id = {customerId} FOR NO KEY UPDATE", cancellationToken);

    public Task<MyAppointmentDto?> GetMineAsync(Guid id, Guid customerId, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(appointment => appointment.Id == id && appointment.CustomerId == customerId)
        .WithService(Context)
        .Select(row => new MyAppointmentDto(
            row.Appointment.Id, row.Appointment.Date, row.Appointment.StartTime, row.Appointment.EndTime, row.Appointment.Status,
            row.Appointment.HoldExpiresAtUtc, row.Appointment.CancelledAtUtc, row.Appointment.CancellationReason, row.Appointment.CreatedAtUtc,
            new AppointmentServiceDto(row.Service.Id, row.Service.Name),
            new AppointmentStaffDto(row.Appointment.StaffMemberId, row.Appointment.StaffMember.User.FullName),
            row.Appointment.TreatmentSessionId != null
                ? AppointmentBookingSource.Session
                : row.Appointment.OrderItemId != null ? AppointmentBookingSource.BookNow : AppointmentBookingSource.Entitlement,
            row.Appointment.ServiceEntitlementId,
            row.Appointment.TreatmentSession == null
                ? null
                : new MyTreatmentSessionRefDto(
                    row.Appointment.TreatmentSession.Id, row.Appointment.TreatmentSession.SequenceNumber,
                    row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackageId,
                    row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackage.PackageName),
            row.Appointment.OrderItem == null
                ? null
                : new MyAppointmentOrderDto(row.Appointment.OrderItem.OrderId, row.Appointment.OrderItem.Order.Code, row.Appointment.OrderItem.Order.Status)))
        .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<Appointment>> GetHoldsForOrdersAsync(IReadOnlyCollection<Guid> orderIds, CancellationToken cancellationToken) =>
        await Set
            .Where(appointment => appointment.OrderItemId != null && orderIds.Contains(appointment.OrderItem!.OrderId) &&
                                  (appointment.Status == AppointmentStatus.Held || appointment.Status == AppointmentStatus.HoldExpired))
            .ToListAsync(cancellationToken);
}

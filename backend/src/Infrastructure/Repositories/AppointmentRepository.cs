using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Bookings;
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

    public async Task<PagedResult<(MyAppointmentListItemDto Item, AppointmentChangeFacts Facts)>> SearchMineAsync(
        Guid customerId, MyAppointmentSearchCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var query = Set.AsNoTracking().Where(appointment => appointment.CustomerId == customerId).WithService(Context);
        if (criteria.Scope is { } scope)
        {
            var statuses = MyAppointmentScopes.StatusesOf(scope).ToList();
            query = query.Where(row => statuses.Contains(row.Appointment.Status));
        }
        if (criteria.Status is { } status)
            query = query.Where(row => row.Appointment.Status == status);
        if (criteria.FromDate is { } from)
            query = query.Where(row => row.Appointment.Date >= from);
        if (criteria.ToDate is { } to)
            query = query.Where(row => row.Appointment.Date <= to);

        var total = await query.CountAsync(cancellationToken);
        var ordered = criteria.Scope == MyAppointmentScope.Upcoming
            ? query.OrderBy(row => row.Appointment.Date).ThenBy(row => row.Appointment.StartTime).ThenBy(row => row.Appointment.Id)
            : query.OrderByDescending(row => row.Appointment.Date).ThenByDescending(row => row.Appointment.StartTime).ThenBy(row => row.Appointment.Id);
        var rows = await ordered
            .Skip((criteria.PageNumber - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(row => new
            {
                Item = new MyAppointmentListItemDto(
                    row.Appointment.Id, row.Appointment.Date, row.Appointment.StartTime, row.Appointment.EndTime, row.Appointment.Status,
                    row.Appointment.HoldExpiresAtUtc,
                    new AppointmentServiceDto(row.Service.Id, row.Service.Name),
                    new AppointmentStaffDto(row.Appointment.StaffMemberId, row.Appointment.StaffMember.User.FullName),
                    row.Appointment.TreatmentSessionId != null
                        ? AppointmentBookingSource.Session
                        : row.Appointment.OrderItemId != null ? AppointmentBookingSource.BookNow : AppointmentBookingSource.Entitlement,
                    row.Appointment.TreatmentSession == null
                        ? null
                        : new MyTreatmentSessionRefDto(
                            row.Appointment.TreatmentSession.Id, row.Appointment.TreatmentSession.SequenceNumber,
                            row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackageId,
                            row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackage.PackageName)),
                Facts = new AppointmentChangeFacts(
                    row.Appointment.Status, row.Appointment.Date, row.Appointment.StartTime,
                    row.Appointment.TreatmentSession == null ? null : row.Appointment.TreatmentSession.TreatmentPlan.Status,
                    row.Appointment.TreatmentSession == null ? null : row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackage.Status,
                    row.Appointment.TreatmentSession == null ? null : row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackage.ExpiresAtUtc,
                    row.Appointment.ServiceEntitlement == null ? null : row.Appointment.ServiceEntitlement.ExpiresAtUtc),
            })
            .ToListAsync(cancellationToken);
        return new PagedResult<(MyAppointmentListItemDto Item, AppointmentChangeFacts Facts)>(
            rows.Select(row => (row.Item, row.Facts)), criteria.PageNumber, criteria.PageSize, total);
    }

    public Task<MyAppointmentRow?> GetMineAsync(Guid id, Guid customerId, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(appointment => appointment.Id == id && appointment.CustomerId == customerId)
        .WithService(Context)
        .Select(row => new MyAppointmentRow(new MyAppointmentDto(
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
                : new MyAppointmentOrderDto(row.Appointment.OrderItem.OrderId, row.Appointment.OrderItem.Order.Code, row.Appointment.OrderItem.Order.Status),
            // The note is the customer's while the visit is ahead; after it, staff remarks are appended to it, so it stays hidden.
            row.Appointment.Status == AppointmentStatus.Completed || row.Appointment.Status == AppointmentStatus.NoShow
                ? null
                : row.Appointment.Note),
            new AppointmentChangeFacts(
                row.Appointment.Status, row.Appointment.Date, row.Appointment.StartTime,
                row.Appointment.TreatmentSession == null ? null : row.Appointment.TreatmentSession.TreatmentPlan.Status,
                row.Appointment.TreatmentSession == null ? null : row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackage.Status,
                row.Appointment.TreatmentSession == null ? null : row.Appointment.TreatmentSession.TreatmentPlan.CustomerPackage.ExpiresAtUtc,
                row.Appointment.ServiceEntitlement == null ? null : row.Appointment.ServiceEntitlement.ExpiresAtUtc)))
        .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<Appointment>> GetHoldsForOrdersAsync(IReadOnlyCollection<Guid> orderIds, CancellationToken cancellationToken) =>
        await Set
            .Where(appointment => appointment.OrderItemId != null && orderIds.Contains(appointment.OrderItem!.OrderId) &&
                                  (appointment.Status == AppointmentStatus.Held || appointment.Status == AppointmentStatus.HoldExpired))
            .ToListAsync(cancellationToken);
    public async Task<PagedResult<ServiceHistoryItemDto>> SearchHistoryAsync(
        Guid customerId, ServiceHistoryCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var query = HistoryRows(customerId);
        if (criteria.FromDate is { } from)
            query = query.Where(row => row.Appointment.Date >= from);
        if (criteria.ToDate is { } to)
            query = query.Where(row => row.Appointment.Date <= to);
        if (criteria.SpaServiceId is { } spaServiceId)
            query = query.Where(row => row.Service.Id == spaServiceId);
        if (criteria.Status is { } status)
            query = query.Where(row => row.Appointment.Status == status);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(row => row.Appointment.Date).ThenByDescending(row => row.Appointment.StartTime).ThenBy(row => row.Appointment.Id)
            .Skip((criteria.PageNumber - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(row => new ServiceHistoryItemDto(
                row.Appointment.Id, row.Appointment.Status, row.Appointment.Date, row.Appointment.StartTime, row.Appointment.EndTime,
                row.Service.Id,
                row.Appointment.TreatmentSessionId != null
                    ? row.Appointment.TreatmentSession!.ServiceName
                    : row.Appointment.ServiceEntitlementId != null
                        ? row.Appointment.ServiceEntitlement!.OrderItem.ProductName
                        : row.Appointment.OrderItem!.ProductName,
                new StaffRefDto(row.Appointment.StaffMemberId, row.Appointment.StaffMember.User.FullName),
                row.Appointment.TreatmentSessionId != null ? "package" : "service",
                row.Appointment.TreatmentSessionId != null ? row.Appointment.TreatmentSession!.TreatmentPlanId : null,
                row.Appointment.TreatmentSessionId != null ? row.Appointment.TreatmentSession!.TreatmentPlan.CustomerPackage.PackageName : null,
                row.Appointment.TreatmentSessionId != null ? row.Appointment.TreatmentSession!.SequenceNumber : null))
            .ToListAsync(cancellationToken);
        return new PagedResult<ServiceHistoryItemDto>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public async Task<ServiceHistoryDetailDto?> GetHistoryDetailAsync(Guid customerId, Guid appointmentId, CancellationToken cancellationToken)
    {
        var row = await HistoryRows(customerId)
            .Where(item => item.Appointment.Id == appointmentId)
            .Select(item => new
            {
                Item = new ServiceHistoryItemDto(
                    item.Appointment.Id, item.Appointment.Status, item.Appointment.Date, item.Appointment.StartTime, item.Appointment.EndTime,
                    item.Service.Id,
                    item.Appointment.TreatmentSessionId != null
                        ? item.Appointment.TreatmentSession!.ServiceName
                        : item.Appointment.ServiceEntitlementId != null
                            ? item.Appointment.ServiceEntitlement!.OrderItem.ProductName
                            : item.Appointment.OrderItem!.ProductName,
                    new StaffRefDto(item.Appointment.StaffMemberId, item.Appointment.StaffMember.User.FullName),
                    item.Appointment.TreatmentSessionId != null ? "package" : "service",
                    item.Appointment.TreatmentSessionId != null ? item.Appointment.TreatmentSession!.TreatmentPlanId : null,
                    item.Appointment.TreatmentSessionId != null ? item.Appointment.TreatmentSession!.TreatmentPlan.CustomerPackage.PackageName : null,
                    item.Appointment.TreatmentSessionId != null ? item.Appointment.TreatmentSession!.SequenceNumber : null),
                Duration = item.Appointment.TreatmentSessionId != null ? item.Appointment.TreatmentSession!.DurationMinutes : item.Service.DurationMinutes,
                // UC-SPA-28 writes the result to the session note for a package visit and to the appointment note otherwise.
                Result = item.Appointment.TreatmentSessionId != null ? item.Appointment.TreatmentSession!.Note : item.Appointment.Note,
                CompletedAtUtc = item.Appointment.TreatmentSessionId != null ? item.Appointment.TreatmentSession!.CompletedAtUtc : null,
                item.Appointment.ServiceEntitlementId,
                item.Appointment.TreatmentSessionId,
                OrderId = item.Appointment.TreatmentSessionId != null
                    ? (Guid?)item.Appointment.TreatmentSession!.TreatmentPlan.CustomerPackage.OrderItem.OrderId
                    : item.Appointment.ServiceEntitlementId != null
                        ? item.Appointment.ServiceEntitlement!.OrderItem.OrderId
                        : item.Appointment.OrderItem!.OrderId,
                OrderCode = item.Appointment.TreatmentSessionId != null
                    ? item.Appointment.TreatmentSession!.TreatmentPlan.CustomerPackage.OrderItem.Order.Code
                    : item.Appointment.ServiceEntitlementId != null
                        ? item.Appointment.ServiceEntitlement!.OrderItem.Order.Code
                        : item.Appointment.OrderItem!.Order.Code,
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (row is null)
            return null;
        var item = row.Item;
        return new ServiceHistoryDetailDto(
            item.AppointmentId, item.Status, item.Date, item.StartTime, item.EndTime, item.SpaServiceId, item.ServiceName, item.Staff, item.Source,
            item.TreatmentPlanId, item.PackageName, item.SequenceNumber, row.Duration,
            item.Status == AppointmentStatus.NoShow ? null : row.Result, row.CompletedAtUtc, row.ServiceEntitlementId, row.TreatmentSessionId,
            row.OrderId is { } orderId && row.OrderCode is { } code ? new PurchaseOrderRefDto(orderId, code) : null);
    }

    /// <summary>BR-TRT-11, Q-40: only completed and no-show visits of the customer count as history.</summary>
    private IQueryable<AppointmentWithService> HistoryRows(Guid customerId) => Set.AsNoTracking()
        .Where(appointment => appointment.CustomerId == customerId &&
                              (appointment.Status == AppointmentStatus.Completed || appointment.Status == AppointmentStatus.NoShow))
        .WithService(Context);
}

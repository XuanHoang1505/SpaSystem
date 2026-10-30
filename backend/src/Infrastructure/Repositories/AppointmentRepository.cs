using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;
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
            Context.CustomerAllergies
                .Where(allergy => allergy.CustomerId == row.Appointment.CustomerId)
                .OrderBy(allergy => allergy.Allergen)
                .Select(allergy => new CustomerAllergyDto(allergy.Allergen, allergy.Severity, allergy.Note))
                .ToList(),
            row.Appointment.TreatmentSession == null
                ? null
                : new TreatmentSessionRefDto(row.Appointment.TreatmentSession.Id, row.Appointment.TreatmentSession.SequenceNumber),
            Context.SkinProfiles.Any(profile => profile.AppointmentId == row.Appointment.Id)))
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
}

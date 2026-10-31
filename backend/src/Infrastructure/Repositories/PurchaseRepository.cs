using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

// Lists are ordered by the purchase order's creation time (orders are paid within minutes of being created).
public sealed class PurchaseRepository : IPurchaseRepository
{
    private readonly AppDbContext _context;

    public PurchaseRepository(AppDbContext context) => _context = context;

    public async Task<(ServiceEntitlement Entitlement, Guid SpaServiceId)?> GetEntitlementForBookingAsync(
        Guid id, Guid customerId, CancellationToken cancellationToken)
    {
        var row = await _context.ServiceEntitlements
            .Where(entitlement => entitlement.Id == id && entitlement.CustomerId == customerId)
            .Select(entitlement => new { Entitlement = entitlement, entitlement.OrderItem.SpaServiceId })
            .FirstOrDefaultAsync(cancellationToken);
        return row is null ? null : (row.Entitlement, row.SpaServiceId!.Value);
    }

    public async Task<SessionBookingFacts?> GetSessionFactsAsync(Guid sessionId, Guid customerId, CancellationToken cancellationToken)
    {
        var facts = await FactsAsync([sessionId], customerId, cancellationToken);
        return facts.TryGetValue(sessionId, out var found) ? found.Facts : null;
    }

    public Task<TreatmentSession?> GetSessionForUpdateAsync(Guid sessionId, CancellationToken cancellationToken) =>
        _context.TreatmentSessions.FirstOrDefaultAsync(session => session.Id == sessionId, cancellationToken);

    public async Task<(CustomerPackage Package, TreatmentPlan Plan)> GetPackageForUpdateAsync(Guid treatmentPlanId, CancellationToken cancellationToken)
    {
        // The row lock comes first, so the tracked package read after it carries the latest used_sessions.
        var package = await _context.CustomerPackages
            .FromSql($"SELECT p.* FROM customer_packages p JOIN treatment_plans t ON t.customer_package_id = p.id WHERE t.id = {treatmentPlanId} FOR UPDATE OF p")
            .SingleAsync(cancellationToken);
        var plan = await _context.TreatmentPlans.SingleAsync(item => item.Id == treatmentPlanId, cancellationToken);
        return (package, plan);
    }

    public async Task<IReadOnlyList<PurchasedServiceRow>> ListServicesAsync(Guid customerId, int max, CancellationToken cancellationToken) =>
        await ServiceRows(_context.ServiceEntitlements.Where(entitlement => entitlement.CustomerId == customerId)
                .OrderByDescending(entitlement => entitlement.OrderItem.Order.CreatedAtUtc).ThenBy(entitlement => entitlement.Id)
                .Take(max))
            .ToListAsync(cancellationToken);

    public Task<PurchasedServiceRow?> GetServiceAsync(Guid id, Guid customerId, CancellationToken cancellationToken) =>
        ServiceRows(_context.ServiceEntitlements.Where(entitlement => entitlement.Id == id && entitlement.CustomerId == customerId))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<PurchasedPackageRow>> ListPackagesAsync(Guid customerId, int max, CancellationToken cancellationToken)
    {
        var rows = await PackageRows(_context.CustomerPackages.Where(package => package.CustomerId == customerId)
                .OrderByDescending(package => package.PurchasedAtUtc).ThenBy(package => package.Id)
                .Take(max))
            .ToListAsync(cancellationToken);
        return await WithSessionsAsync(rows, customerId, withItems: false, cancellationToken);
    }

    public async Task<PurchasedPackageRow?> GetPackageAsync(Guid id, Guid customerId, bool withItems, CancellationToken cancellationToken)
    {
        var row = await PackageRows(_context.CustomerPackages.Where(package => package.Id == id && package.CustomerId == customerId))
            .FirstOrDefaultAsync(cancellationToken);
        return row is null ? null : (await WithSessionsAsync([row], customerId, withItems, cancellationToken))[0];
    }

    private IQueryable<PurchasedServiceRow> ServiceRows(IQueryable<ServiceEntitlement> entitlements) =>
        entitlements.AsNoTracking().Select(entitlement => new PurchasedServiceRow(
            entitlement.Id,
            entitlement.OrderItem.SpaServiceId!.Value,
            entitlement.OrderItem.ProductName,
            entitlement.OrderItem.SpaService!.ImageUrl,
            entitlement.OrderItem.SpaService.DurationMinutes,
            entitlement.Status,
            entitlement.ExpiresAtUtc,
            // A zero-amount order is paid when created and has no payment row.
            entitlement.OrderItem.Order.Payments.Where(payment => payment.Status == PaymentStatus.Succeeded)
                .Select(payment => payment.PaidAtUtc).FirstOrDefault() ?? entitlement.OrderItem.Order.CreatedAtUtc,
            _context.Appointments
                .Where(appointment => appointment.ServiceEntitlementId == entitlement.Id &&
                                      (appointment.Status == AppointmentStatus.PendingConfirmation ||
                                       appointment.Status == AppointmentStatus.Confirmed ||
                                       appointment.Status == AppointmentStatus.Completed))
                .OrderByDescending(appointment => appointment.Date).ThenByDescending(appointment => appointment.StartTime)
                .Select(appointment => new PurchaseAppointmentDto(
                    appointment.Id, appointment.Date, appointment.StartTime, appointment.EndTime, appointment.Status))
                .FirstOrDefault(),
            new PurchaseOrderRefDto(entitlement.OrderItem.OrderId, entitlement.OrderItem.Order.Code)));

    private IQueryable<PurchasedPackageRow> PackageRows(IQueryable<CustomerPackage> packages) =>
        from package in packages.AsNoTracking()
        join plan in _context.TreatmentPlans on package.Id equals plan.CustomerPackageId
        select new PurchasedPackageRow(
            package.Id,
            package.OrderItem.ServicePackageId!.Value,
            package.PackageName,
            package.OrderItem.ServicePackage!.ImageUrl,
            package.Status,
            package.PurchasedAtUtc,
            package.ActivatedAtUtc,
            package.ExpiresAtUtc,
            package.TotalSessions,
            package.UsedSessions,
            plan.Sessions.Count(session => session.Status == TreatmentSessionStatus.Booked),
            plan.Id,
            plan.Status,
            null,
            null,
            null,
            new PurchaseOrderRefDto(package.OrderItem.OrderId, package.OrderItem.Order.Code));

    /// <summary>Adds the lowest not-booked session's facts (BR-TRT-05) and, for the detail, the per-service progress.</summary>
    private async Task<IReadOnlyList<PurchasedPackageRow>> WithSessionsAsync(
        IReadOnlyList<PurchasedPackageRow> rows, Guid customerId, bool withItems, CancellationToken cancellationToken)
    {
        if (rows.Count == 0)
            return rows;
        var planIds = rows.Select(row => row.TreatmentPlanId).ToList();
        var sessions = await _context.TreatmentSessions.AsNoTracking()
            .Where(session => planIds.Contains(session.TreatmentPlanId))
            .Select(session => new { session.Id, session.TreatmentPlanId, session.SpaServiceId, session.ServiceName, session.SequenceNumber, session.Status })
            .ToListAsync(cancellationToken);
        var nextIds = sessions.Where(session => session.Status == TreatmentSessionStatus.NotBooked)
            .GroupBy(session => session.TreatmentPlanId)
            .ToDictionary(group => group.Key, group => group.OrderBy(session => session.SequenceNumber).First().Id);
        var facts = await FactsAsync(nextIds.Values.ToList(), customerId, cancellationToken);

        return rows.Select(row =>
        {
            (SessionBookingFacts Facts, string ServiceName)? next =
                nextIds.TryGetValue(row.TreatmentPlanId, out var nextId) && facts.TryGetValue(nextId, out var found) ? found : null;
            var items = withItems
                ? sessions.Where(session => session.TreatmentPlanId == row.TreatmentPlanId)
                    .GroupBy(session => session.SpaServiceId)
                    .OrderBy(group => group.Min(session => session.SequenceNumber))
                    .Select(group => new PackageItemProgressDto(
                        group.Key,
                        group.OrderBy(session => session.SequenceNumber).First().ServiceName,
                        group.Count(),
                        group.Count(session => session.Status == TreatmentSessionStatus.Completed),
                        group.Count(session => session.Status == TreatmentSessionStatus.Booked)))
                    .ToList()
                : null;
            return row with { NextSession = next?.Facts, NextSessionServiceName = next?.ServiceName, Items = items };
        }).ToList();
    }

    /// <summary>BR-BKG-05 facts for the given sessions of the customer's packages; sessions of other customers are left out.</summary>
    private async Task<Dictionary<Guid, (SessionBookingFacts Facts, string ServiceName)>> FactsAsync(
        IReadOnlyCollection<Guid> sessionIds, Guid customerId, CancellationToken cancellationToken)
    {
        if (sessionIds.Count == 0)
            return [];
        var targets = await _context.TreatmentSessions.AsNoTracking()
            .Where(session => sessionIds.Contains(session.Id) && session.TreatmentPlan.CustomerPackage.CustomerId == customerId)
            .Select(session => new
            {
                session.Id,
                session.TreatmentPlanId,
                session.SpaServiceId,
                session.ServiceName,
                session.DurationMinutes,
                session.SequenceNumber,
                session.Status,
                PlanStatus = session.TreatmentPlan.Status,
                PackageStatus = session.TreatmentPlan.CustomerPackage.Status,
                PackageExpiresAtUtc = session.TreatmentPlan.CustomerPackage.ExpiresAtUtc,
                session.TreatmentPlan.CustomerPackage.OrderItem.ServicePackageId,
            })
            .ToListAsync(cancellationToken);
        if (targets.Count == 0)
            return [];

        var planIds = targets.Select(target => target.TreatmentPlanId).Distinct().ToList();
        var siblings = await _context.TreatmentSessions.AsNoTracking()
            .Where(session => planIds.Contains(session.TreatmentPlanId))
            .Select(session => new { session.Id, session.TreatmentPlanId, session.SequenceNumber, session.Status })
            .ToListAsync(cancellationToken);
        var previousIds = targets
            .Select(target => siblings.FirstOrDefault(session =>
                session.TreatmentPlanId == target.TreatmentPlanId && session.SequenceNumber == target.SequenceNumber - 1)?.Id)
            .OfType<Guid>()
            .ToList();
        var visits = await _context.Appointments.AsNoTracking()
            .Where(appointment => appointment.TreatmentSessionId != null && previousIds.Contains(appointment.TreatmentSessionId.Value) &&
                                  (appointment.Status == AppointmentStatus.PendingConfirmation ||
                                   appointment.Status == AppointmentStatus.Confirmed ||
                                   appointment.Status == AppointmentStatus.Completed ||
                                   appointment.Status == AppointmentStatus.NoShow))
            .Select(appointment => new { SessionId = appointment.TreatmentSessionId!.Value, appointment.Date, appointment.EndTime })
            .ToListAsync(cancellationToken);
        var packageIds = targets.Select(target => target.ServicePackageId).OfType<Guid>().Distinct().ToList();
        // Q-23 style: the gap is read from the package's current configuration.
        var gaps = await _context.ServicePackageItems.AsNoTracking()
            .Where(item => packageIds.Contains(item.ServicePackageId))
            .Select(item => new { item.ServicePackageId, item.SpaServiceId, item.MinDaysBetweenSessions })
            .ToListAsync(cancellationToken);

        return targets.ToDictionary(target => target.Id, target =>
        {
            var previous = siblings.FirstOrDefault(session =>
                session.TreatmentPlanId == target.TreatmentPlanId && session.SequenceNumber == target.SequenceNumber - 1);
            var visit = previous is null
                ? null
                : visits.Where(item => item.SessionId == previous.Id)
                    .OrderByDescending(item => item.Date).ThenByDescending(item => item.EndTime)
                    .Select(item => new PreviousVisit(item.Date, item.EndTime))
                    .FirstOrDefault();
            var earlierDone = siblings
                .Where(session => session.TreatmentPlanId == target.TreatmentPlanId && session.SequenceNumber < target.SequenceNumber)
                .All(session => session.Status != TreatmentSessionStatus.NotBooked);
            var minDays = gaps.FirstOrDefault(gap => gap.ServicePackageId == target.ServicePackageId && gap.SpaServiceId == target.SpaServiceId)
                ?.MinDaysBetweenSessions ?? 0;
            var facts = new SessionBookingFacts(
                target.Id, target.SpaServiceId, target.DurationMinutes, target.SequenceNumber, target.Status, target.PackageStatus,
                target.PackageExpiresAtUtc, target.PlanStatus, earlierDone, visit, minDays);
            return (facts, target.ServiceName);
        });
    }
}

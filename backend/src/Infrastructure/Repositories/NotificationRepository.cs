using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class NotificationRepository : Repository<Notification>, INotificationRepository
{
    public NotificationRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PagedResult<Notification>> ListForUserAsync(Guid userId, bool unreadOnly, NotificationType? type, PagedQuery paging,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(paging);
        var query = Set.AsNoTracking().Where(notification => notification.UserId == userId);
        if (unreadOnly)
            query = query.Where(notification => notification.ReadAtUtc == null);
        if (type is { } wanted)
            query = query.Where(notification => notification.Type == wanted);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(notification => notification.CreatedAtUtc)
            .ThenByDescending(notification => notification.Id)
            .Skip((paging.PageNumber - 1) * paging.PageSize)
            .Take(paging.PageSize)
            .ToListAsync(cancellationToken);
        return new PagedResult<Notification>(items, paging.PageNumber, paging.PageSize, total);
    }

    public Task<Notification?> GetForUserAsync(Guid id, Guid userId, CancellationToken cancellationToken) =>
        Set.FirstOrDefaultAsync(notification => notification.Id == id && notification.UserId == userId, cancellationToken);

    public Task<int> CountUnreadAsync(Guid userId, CancellationToken cancellationToken) =>
        Set.CountAsync(notification => notification.UserId == userId && notification.ReadAtUtc == null, cancellationToken);

    public Task<int> MarkAllReadAsync(Guid userId, DateTime nowUtc, CancellationToken cancellationToken) =>
        Set.Where(notification => notification.UserId == userId && notification.ReadAtUtc == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(notification => notification.ReadAtUtc, nowUtc), cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetActiveOwnerIdsAsync(CancellationToken cancellationToken) =>
        await Context.Set<User>().AsNoTracking()
            .Where(user => user.Role == UserRole.Owner && user.Status == UserStatus.Active)
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

    public async Task<NoticeNames> GetNamesAsync(IReadOnlyCollection<Guid> spaServiceIds, IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken)
    {
        var services = spaServiceIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await Context.Set<SpaService>().AsNoTracking().Where(service => spaServiceIds.Contains(service.Id))
                .ToDictionaryAsync(service => service.Id, service => service.Name, cancellationToken);
        var users = userIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await Context.Set<User>().AsNoTracking().Where(user => userIds.Contains(user.Id))
                .ToDictionaryAsync(user => user.Id, user => user.FullName, cancellationToken);
        return new NoticeNames(services, users);
    }

    public async Task<IReadOnlyList<ReminderCandidate>> GetReminderCandidatesAsync(DateOnly fromDate, DateOnly toDate, int skip, int take,
        CancellationToken cancellationToken) =>
        await Context.Appointments.AsNoTracking()
            .Where(appointment => appointment.Status == AppointmentStatus.Confirmed && appointment.Date >= fromDate && appointment.Date <= toDate)
            .WithService(Context)
            .OrderBy(row => row.Appointment.Date).ThenBy(row => row.Appointment.StartTime).ThenBy(row => row.Appointment.Id)
            .Skip(skip)
            .Take(take)
            .Select(row => new ReminderCandidate(row.Appointment.Id, row.Appointment.CustomerId, row.Service.Name,
                row.Appointment.TreatmentSessionId != null, row.Appointment.Date, row.Appointment.StartTime, row.Appointment.CreatedAtUtc))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlySet<string>> GetExistingDedupKeysAsync(IReadOnlyCollection<string> dedupKeys, CancellationToken cancellationToken)
    {
        if (dedupKeys.Count == 0)
            return new HashSet<string>();
        var found = await Set.AsNoTracking()
            .Where(notification => notification.DedupKey != null && dedupKeys.Contains(notification.DedupKey))
            .Select(notification => notification.DedupKey!)
            .ToListAsync(cancellationToken);
        return found.ToHashSet(StringComparer.Ordinal);
    }
}

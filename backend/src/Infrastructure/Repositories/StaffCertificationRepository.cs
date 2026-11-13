using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class StaffCertificationRepository : Repository<StaffCertification>, IStaffCertificationRepository
{
    public StaffCertificationRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<StaffCertification>> ListForStaffAsync(Guid staffMemberId, CancellationToken cancellationToken) =>
        await Set.AsNoTracking()
            .Where(certification => certification.StaffMemberId == staffMemberId)
            .ToListAsync(cancellationToken);

    public Task<int> CountForStaffAsync(Guid staffMemberId, CancellationToken cancellationToken) =>
        Set.CountAsync(certification => certification.StaffMemberId == staffMemberId, cancellationToken);

    public Task<StaffCertification?> GetForStaffAsync(Guid id, Guid staffMemberId, CancellationToken cancellationToken) =>
        Set.FirstOrDefaultAsync(certification => certification.Id == id && certification.StaffMemberId == staffMemberId, cancellationToken);
}

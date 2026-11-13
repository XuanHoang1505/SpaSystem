using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>Certifications of staff members (docs/specs/staff.md, UC-SPA-22 bổ sung).</summary>
public interface IStaffCertificationRepository : IRepository<StaffCertification>
{
    /// <summary>Every certification of the staff member, untracked.</summary>
    Task<IReadOnlyList<StaffCertification>> ListForStaffAsync(Guid staffMemberId, CancellationToken cancellationToken);

    Task<int> CountForStaffAsync(Guid staffMemberId, CancellationToken cancellationToken);

    /// <summary>The certification, tracked, only when it belongs to <paramref name="staffMemberId"/>.</summary>
    Task<StaffCertification?> GetForStaffAsync(Guid id, Guid staffMemberId, CancellationToken cancellationToken);
}

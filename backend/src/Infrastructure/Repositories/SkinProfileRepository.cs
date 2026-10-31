using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class SkinProfileRepository : Repository<SkinProfile>, ISkinProfileRepository
{
    public SkinProfileRepository(AppDbContext context) : base(context)
    {
    }

    public Task<SkinProfileDto?> GetDtoByAppointmentAsync(Guid appointmentId, CancellationToken cancellationToken) =>
        Project(Set.AsNoTracking().Where(profile => profile.AppointmentId == appointmentId)).FirstOrDefaultAsync(cancellationToken);

    public Task<SkinProfileDto?> GetDtoAsync(Guid id, CancellationToken cancellationToken) =>
        Project(Set.AsNoTracking().Where(profile => profile.Id == id)).FirstOrDefaultAsync(cancellationToken);

    private static IQueryable<SkinProfileDto> Project(IQueryable<SkinProfile> profiles) => profiles.Select(profile => new SkinProfileDto(
        profile.Id, profile.AppointmentId, profile.CustomerId,
        new AppointmentStaffDto(profile.AssessedByStaffMemberId, profile.AssessedByStaffMember.User.FullName),
        profile.AssessedAtUtc, profile.SkinType, profile.MainConcerns, profile.CurrentProducts, profile.CareGoals,
        profile.RecommendedTreatment, profile.Note, profile.CreatedAtUtc, profile.UpdatedAtUtc));
}

using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>Skin profiles (UC-SPA-27); one per appointment (<c>ux_skin_profiles_appointment_id</c>).</summary>
public interface ISkinProfileRepository : IRepository<SkinProfile>
{
    Task<SkinProfileDto?> GetDtoByAppointmentAsync(Guid appointmentId, CancellationToken cancellationToken);

    Task<SkinProfileDto?> GetDtoAsync(Guid id, CancellationToken cancellationToken);
}

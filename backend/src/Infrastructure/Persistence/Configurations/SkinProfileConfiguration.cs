using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class SkinProfileConfiguration : IEntityTypeConfiguration<SkinProfile>
{
    /// <summary>One profile per appointment (BR-CARE-01); a violation is translated to <c>409 skin_profile_exists</c>.</summary>
    public const string UniqueAppointment = "ux_skin_profiles_appointment_id";

    public void Configure(EntityTypeBuilder<SkinProfile> builder)
    {
        builder.ToTable("skin_profiles", table =>
        {
            table.HasCheckConstraint("ck_skin_profiles_skin_type", "skin_type IN ('normal', 'dry', 'oily', 'combination', 'sensitive')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.HasIndex(x => x.AppointmentId).IsUnique().HasDatabaseName(UniqueAppointment);
        builder.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.AssessedByStaffMember).WithMany().HasForeignKey(x => x.AssessedByStaffMemberId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Appointment).WithOne().HasForeignKey<SkinProfile>(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
    }
}

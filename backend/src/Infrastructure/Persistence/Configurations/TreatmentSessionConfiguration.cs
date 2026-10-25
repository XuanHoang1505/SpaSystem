using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class TreatmentSessionConfiguration : IEntityTypeConfiguration<TreatmentSession>
{
    public void Configure(EntityTypeBuilder<TreatmentSession> builder)
    {
        builder.ToTable("treatment_sessions", table =>
        {
            table.HasCheckConstraint("ck_treatment_sessions_sequence_number_positive", "sequence_number > 0");
            table.HasCheckConstraint("ck_treatment_sessions_duration_minutes_positive", "duration_minutes > 0");
            table.HasCheckConstraint("ck_treatment_sessions_status", "status IN ('not_booked', 'booked', 'completed', 'skipped')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.ServiceName).HasMaxLength(150);
        builder.HasIndex(x => new { x.TreatmentPlanId, x.SequenceNumber }).IsUnique().HasDatabaseName("ux_treatment_sessions_treatment_plan_id_sequence_number");
        builder.HasOne(x => x.TreatmentPlan).WithMany(x => x.Sessions).HasForeignKey(x => x.TreatmentPlanId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.SpaService).WithMany().HasForeignKey(x => x.SpaServiceId).OnDelete(DeleteBehavior.Restrict);
    }
}

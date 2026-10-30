using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> builder)
    {
        builder.ToTable("appointments", table =>
        {
            table.HasCheckConstraint("ck_appointments_time_range", "end_time > start_time");
            table.HasCheckConstraint(AppointmentConstraints.SourceRequired, "num_nonnulls(service_entitlement_id, treatment_session_id, order_item_id) >= 1");
            table.HasCheckConstraint("ck_appointments_status", "status IN ('held', 'pending_confirmation', 'confirmed', 'completed', 'cancelled', 'no_show', 'hold_expired')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.HasIndex(x => new { x.StaffMemberId, x.Date });
        builder.HasIndex(x => new { x.CustomerId, x.Date });
        builder.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.StaffMember).WithMany().HasForeignKey(x => x.StaffMemberId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ServiceEntitlement).WithMany().HasForeignKey(x => x.ServiceEntitlementId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.TreatmentSession).WithMany().HasForeignKey(x => x.TreatmentSessionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.OrderItem).WithMany().HasForeignKey(x => x.OrderItemId).OnDelete(DeleteBehavior.Restrict);
    }
}

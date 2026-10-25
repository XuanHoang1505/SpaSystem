using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class TreatmentPlanConfiguration : IEntityTypeConfiguration<TreatmentPlan>
{
    public void Configure(EntityTypeBuilder<TreatmentPlan> builder)
    {
        builder.ToTable("treatment_plans", table =>
        {
            table.HasCheckConstraint("ck_treatment_plans_status", "status IN ('not_started', 'in_progress', 'completed', 'paused', 'cancelled')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.HasIndex(x => x.CustomerPackageId).IsUnique().HasDatabaseName("ux_treatment_plans_customer_package_id");
        builder.HasOne(x => x.CustomerPackage).WithOne().HasForeignKey<TreatmentPlan>(x => x.CustomerPackageId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.PrimaryStaffMember).WithMany().HasForeignKey(x => x.PrimaryStaffMemberId).OnDelete(DeleteBehavior.Restrict);
    }
}

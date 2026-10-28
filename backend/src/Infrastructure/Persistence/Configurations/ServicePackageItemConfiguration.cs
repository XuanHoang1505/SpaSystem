using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class ServicePackageItemConfiguration : IEntityTypeConfiguration<ServicePackageItem>
{
    public void Configure(EntityTypeBuilder<ServicePackageItem> builder)
    {
        builder.ToTable("service_package_items", table =>
        {
            table.HasCheckConstraint("ck_service_package_items_session_count_positive", "session_count > 0");
            table.HasCheckConstraint("ck_service_package_items_min_days_between_sessions_non_negative", "min_days_between_sessions >= 0");
            table.HasCheckConstraint("ck_service_package_items_sort_order_positive", "sort_order > 0");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        // BR-CAT-02: one row per position and per service inside a package.
        builder.HasIndex(x => new { x.ServicePackageId, x.SortOrder }).IsUnique()
            .HasDatabaseName("ux_service_package_items_service_package_id_sort_order");
        builder.HasIndex(x => new { x.ServicePackageId, x.SpaServiceId }).IsUnique()
            .HasDatabaseName("ux_service_package_items_service_package_id_spa_service_id");
        builder.HasOne(x => x.SpaService).WithMany().HasForeignKey(x => x.SpaServiceId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ServicePackage).WithMany(x => x.Items).HasForeignKey(x => x.ServicePackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

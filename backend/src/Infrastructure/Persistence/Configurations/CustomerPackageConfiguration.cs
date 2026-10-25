using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class CustomerPackageConfiguration : IEntityTypeConfiguration<CustomerPackage>
{
    public void Configure(EntityTypeBuilder<CustomerPackage> builder)
    {
        builder.ToTable("customer_packages", table =>
        {
            table.HasCheckConstraint("ck_customer_packages_total_sessions_positive", "total_sessions > 0");
            table.HasCheckConstraint("ck_customer_packages_used_sessions", "used_sessions >= 0 AND used_sessions <= total_sessions");
            table.HasCheckConstraint("ck_customer_packages_status", "status IN ('active', 'completed', 'expired', 'cancelled')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.PackageName).HasMaxLength(150);
        builder.HasIndex(x => x.OrderItemId).IsUnique().HasDatabaseName("ux_customer_packages_order_item_id");
        builder.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.OrderItem).WithOne().HasForeignKey<CustomerPackage>(x => x.OrderItemId).OnDelete(DeleteBehavior.Restrict);
    }
}

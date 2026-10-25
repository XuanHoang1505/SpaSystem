using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class ServiceEntitlementConfiguration : IEntityTypeConfiguration<ServiceEntitlement>
{
    public void Configure(EntityTypeBuilder<ServiceEntitlement> builder)
    {
        builder.ToTable("service_entitlements", table =>
        {
            table.HasCheckConstraint("ck_service_entitlements_status", "status IN ('available', 'booked', 'used', 'expired')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.HasIndex(x => x.OrderItemId).IsUnique().HasDatabaseName("ux_service_entitlements_order_item_id");
        builder.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.OrderItem).WithOne().HasForeignKey<ServiceEntitlement>(x => x.OrderItemId).OnDelete(DeleteBehavior.Restrict);
    }
}

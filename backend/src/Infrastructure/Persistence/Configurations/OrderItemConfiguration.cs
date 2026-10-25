using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("order_items", table =>
        {
            table.HasCheckConstraint("ck_order_items_single_product", "num_nonnulls(spa_service_id, service_package_id) = 1");
            table.HasCheckConstraint("ck_order_items_unit_price_non_negative", "unit_price >= 0");
            table.HasCheckConstraint("ck_order_items_discount_amount", "discount_amount >= 0 AND discount_amount <= unit_price");
            table.HasCheckConstraint("ck_order_items_line_total", "line_total = unit_price - discount_amount");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.ProductName).HasMaxLength(150);
        builder.Property(x => x.UnitPrice).HasPrecision(12, 0);
        builder.Property(x => x.DiscountAmount).HasPrecision(12, 0);
        builder.Property(x => x.LineTotal).HasPrecision(12, 0);
        builder.HasOne(x => x.Order).WithMany(x => x.Items).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.SpaService).WithMany().HasForeignKey(x => x.SpaServiceId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ServicePackage).WithMany().HasForeignKey(x => x.ServicePackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

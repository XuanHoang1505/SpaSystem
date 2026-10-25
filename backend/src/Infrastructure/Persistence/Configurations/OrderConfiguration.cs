using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders", table =>
        {
            table.HasCheckConstraint("ck_orders_subtotal_non_negative", "subtotal >= 0");
            table.HasCheckConstraint("ck_orders_discount_total", "discount_total >= 0 AND discount_total <= subtotal");
            table.HasCheckConstraint("ck_orders_grand_total", "grand_total = subtotal - discount_total");
            table.HasCheckConstraint("ck_orders_status", "status IN ('pending_payment', 'paid', 'cancelled', 'expired')");
            table.HasCheckConstraint("ck_orders_payment_due_after_created", "payment_due_at_utc > created_at_utc");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Code).HasMaxLength(50);
        builder.Property(x => x.Subtotal).HasPrecision(12, 0);
        builder.Property(x => x.DiscountTotal).HasPrecision(12, 0);
        builder.Property(x => x.GrandTotal).HasPrecision(12, 0);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("ux_orders_code");
        builder.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
    }
}

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
            // BR-ORD-04: a cancelled order always records when, and only a cancelled one does.
            table.HasCheckConstraint("ck_orders_cancellation", "(status = 'cancelled') = (cancelled_at_utc IS NOT NULL)");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Code).HasMaxLength(50);
        builder.Property(x => x.Subtotal).HasPrecision(12, 0);
        builder.Property(x => x.DiscountTotal).HasPrecision(12, 0);
        builder.Property(x => x.GrandTotal).HasPrecision(12, 0);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("ux_orders_code");
        // Idempotency-Key of POST /me/orders (BR-ORD-08) and the scan of OrderExpiryJob (BR-ORD-03).
        builder.HasIndex(x => x.CustomerId);
        builder.HasIndex(x => new { x.CustomerId, x.IdempotencyKey }).IsUnique()
            .HasFilter("idempotency_key IS NOT NULL").HasDatabaseName("ux_orders_customer_id_idempotency_key");
        builder.HasIndex(x => x.PaymentDueAtUtc)
            .HasFilter("status = 'pending_payment'").HasDatabaseName("ix_orders_pending_payment_due");
        // The owner's order list, newest first (BR-ORD-11).
        builder.HasIndex(x => x.CreatedAtUtc).HasDatabaseName("ix_orders_created_at_utc");
        builder.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
    }
}

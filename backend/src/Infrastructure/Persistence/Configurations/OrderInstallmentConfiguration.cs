using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

/// <summary>Installments of an installment order (docs/specs/order-installments.md, BR-INS-02, 03).</summary>
internal sealed class OrderInstallmentConfiguration : IEntityTypeConfiguration<OrderInstallment>
{
    public const string UniqueSequence = "ux_order_installments_order_id_sequence_number";

    public void Configure(EntityTypeBuilder<OrderInstallment> builder)
    {
        builder.ToTable("order_installments", table =>
        {
            table.HasCheckConstraint("ck_order_installments_status", "status IN ('pending', 'paid', 'cancelled')");
            table.HasCheckConstraint("ck_order_installments_sequence_number", "sequence_number >= 1");
            table.HasCheckConstraint("ck_order_installments_sessions",
                "first_session_number >= 1 AND first_session_number <= last_session_number");
            table.HasCheckConstraint("ck_order_installments_amount_positive", "amount > 0");
            table.HasCheckConstraint("ck_order_installments_paid", "(status = 'paid') = (paid_at_utc IS NOT NULL)");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Amount).HasPrecision(12, 0);
        builder.HasIndex(x => new { x.OrderId, x.SequenceNumber }).IsUnique().HasDatabaseName(UniqueSequence);
        builder.HasOne(x => x.Order).WithMany(x => x.Installments).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
    }
}

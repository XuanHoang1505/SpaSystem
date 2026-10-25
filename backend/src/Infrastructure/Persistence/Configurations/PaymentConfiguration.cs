using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("payments", table =>
        {
            table.HasCheckConstraint("ck_payments_amount_non_negative", "amount >= 0");
            table.HasCheckConstraint("ck_payments_status", "status IN ('pending', 'succeeded', 'failed', 'expired')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Provider).HasMaxLength(50);
        builder.Property(x => x.Amount).HasPrecision(12, 0);
        builder.Property(x => x.RequestCode).HasMaxLength(50);
        builder.Property(x => x.ProviderTransactionId).HasMaxLength(100);
        builder.Property(x => x.PaymentUrl).HasMaxLength(1000);
        builder.HasIndex(x => x.RequestCode).IsUnique().HasDatabaseName("ux_payments_request_code");
        builder.HasIndex(x => x.PaidAtUtc);
        builder.HasOne(x => x.Order).WithMany(x => x.Payments).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
    }
}

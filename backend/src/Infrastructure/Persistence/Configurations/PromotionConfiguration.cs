using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class PromotionConfiguration : IEntityTypeConfiguration<Promotion>
{
    public void Configure(EntityTypeBuilder<Promotion> builder)
    {
        builder.ToTable("promotions", table =>
        {
            table.HasCheckConstraint("ck_promotions_discount_type", "discount_type IN ('percentage', 'fixed_amount')");
            table.HasCheckConstraint("ck_promotions_discount_value", "discount_value > 0 AND (discount_type <> 'percentage' OR discount_value <= 100)");
            table.HasCheckConstraint("ck_promotions_min_order_amount_non_negative", "min_order_amount >= 0");
            table.HasCheckConstraint("ck_promotions_max_discount_amount_positive", "max_discount_amount > 0");
            table.HasCheckConstraint("ck_promotions_period", "ends_at_utc > starts_at_utc");
            table.HasCheckConstraint("ck_promotions_per_customer_limit_positive", "per_customer_limit > 0");
            table.HasCheckConstraint("ck_promotions_usage_limit_positive", "usage_limit > 0");
            table.HasCheckConstraint("ck_promotions_status", "status IN ('active', 'stopped')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Code).HasMaxLength(50);
        builder.Property(x => x.DiscountValue).HasPrecision(12, 2);
        builder.Property(x => x.MinOrderAmount).HasPrecision(12, 0);
        builder.Property(x => x.MaxDiscountAmount).HasPrecision(12, 0);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("ux_promotions_code");
    }
}

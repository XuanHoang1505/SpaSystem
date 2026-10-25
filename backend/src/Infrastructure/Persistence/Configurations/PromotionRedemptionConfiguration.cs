using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class PromotionRedemptionConfiguration : IEntityTypeConfiguration<PromotionRedemption>
{
    public void Configure(EntityTypeBuilder<PromotionRedemption> builder)
    {
        builder.ToTable("promotion_redemptions", table =>
        {
            table.HasCheckConstraint("ck_promotion_redemptions_discount_amount_non_negative", "discount_amount >= 0");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.PromotionCode).HasMaxLength(50);
        builder.Property(x => x.DiscountAmount).HasPrecision(12, 0);
        builder.HasIndex(x => x.OrderId).IsUnique().HasDatabaseName("ux_promotion_redemptions_order_id");
        builder.HasOne(x => x.Order).WithOne().HasForeignKey<PromotionRedemption>(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Promotion).WithMany().HasForeignKey(x => x.PromotionId).OnDelete(DeleteBehavior.Restrict);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class CartItemConfiguration : IEntityTypeConfiguration<CartItem>
{
    public void Configure(EntityTypeBuilder<CartItem> builder)
    {
        builder.ToTable("cart_items", table =>
        {
            table.HasCheckConstraint("ck_cart_items_single_product", "num_nonnulls(spa_service_id, service_package_id) = 1");
            table.HasCheckConstraint("ck_cart_items_unit_price_non_negative", "unit_price >= 0");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.UnitPrice).HasPrecision(12, 0);
        // A product appears at most once per cart (BR-ORD-01); the plain cart_id index stays for the cascade delete.
        builder.HasIndex(x => x.CartId);
        builder.HasIndex(x => new { x.CartId, x.SpaServiceId }).IsUnique()
            .HasFilter("spa_service_id IS NOT NULL").HasDatabaseName(CartItemIndexes.UniqueService);
        builder.HasIndex(x => new { x.CartId, x.ServicePackageId }).IsUnique()
            .HasFilter("service_package_id IS NOT NULL").HasDatabaseName(CartItemIndexes.UniquePackage);
        builder.HasOne(x => x.Cart).WithMany(x => x.Items).HasForeignKey(x => x.CartId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.SpaService).WithMany().HasForeignKey(x => x.SpaServiceId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ServicePackage).WithMany().HasForeignKey(x => x.ServicePackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

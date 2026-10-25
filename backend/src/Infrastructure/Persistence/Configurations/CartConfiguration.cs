using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class CartConfiguration : IEntityTypeConfiguration<Cart>
{
    public void Configure(EntityTypeBuilder<Cart> builder)
    {
        builder.ToTable("carts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.HasIndex(x => x.CustomerId).IsUnique().HasDatabaseName("ux_carts_customer_id");
        builder.HasOne(x => x.Customer).WithOne().HasForeignKey<Cart>(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
    }
}

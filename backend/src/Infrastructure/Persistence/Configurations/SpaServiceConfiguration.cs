using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class SpaServiceConfiguration : IEntityTypeConfiguration<SpaService>
{
    public void Configure(EntityTypeBuilder<SpaService> builder)
    {
        builder.ToTable("spa_services", table =>
        {
            table.HasCheckConstraint("ck_spa_services_duration_minutes_positive", "duration_minutes > 0");
            table.HasCheckConstraint("ck_spa_services_price_non_negative", "price >= 0");
            table.HasCheckConstraint("ck_spa_services_status", "status IN ('on_sale', 'discontinued')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Name).HasMaxLength(150);
        builder.Property(x => x.ShortDescription).HasMaxLength(200);
        builder.HasMany(x => x.Steps).WithOne().HasForeignKey(x => x.SpaServiceId).OnDelete(DeleteBehavior.Restrict);
        builder.Property(x => x.Price).HasPrecision(12, 0);
        builder.Property(x => x.ImageUrl).HasMaxLength(500);
        builder.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.CategoryId);
    }
}

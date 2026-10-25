using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class ServicePackageConfiguration : IEntityTypeConfiguration<ServicePackage>
{
    public void Configure(EntityTypeBuilder<ServicePackage> builder)
    {
        builder.ToTable("service_packages", table =>
        {
            table.HasCheckConstraint("ck_service_packages_price_non_negative", "price >= 0");
            table.HasCheckConstraint("ck_service_packages_validity_days_positive", "validity_days > 0");
            table.HasCheckConstraint("ck_service_packages_status", "status IN ('on_sale', 'discontinued')");
            table.HasCheckConstraint("ck_service_packages_sale_period", "sale_end_date >= sale_start_date");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Name).HasMaxLength(150);
        builder.Property(x => x.Price).HasPrecision(12, 0);
    }
}

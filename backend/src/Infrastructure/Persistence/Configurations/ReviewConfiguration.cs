using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("reviews", table =>
        {
            table.HasCheckConstraint("ck_reviews_single_product", "num_nonnulls(spa_service_id, service_package_id) = 1");
            table.HasCheckConstraint("ck_reviews_rating_range", "rating BETWEEN 1 AND 5");
            table.HasCheckConstraint("ck_reviews_status", "status IN ('visible', 'hidden')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.ImageUrl).HasMaxLength(500);
        builder.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.SpaService).WithMany().HasForeignKey(x => x.SpaServiceId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ServicePackage).WithMany().HasForeignKey(x => x.ServicePackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

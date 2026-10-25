using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class CustomerAllergyConfiguration : IEntityTypeConfiguration<CustomerAllergy>
{
    public void Configure(EntityTypeBuilder<CustomerAllergy> builder)
    {
        builder.ToTable("customer_allergies", table =>
        {
            table.HasCheckConstraint("ck_customer_allergies_severity", "severity IN ('mild', 'moderate', 'severe')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Allergen).HasMaxLength(255);
        builder.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
    }
}

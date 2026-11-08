using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class ServiceCategoryConfiguration : IEntityTypeConfiguration<ServiceCategory>
{
    /// <summary>
    /// Unique on <c>f_unaccent(lower(name))</c> (BR-CAT-10). An expression index cannot be modelled in EF, so the migration
    /// creates it with SQL; the name is kept here for <c>UnitOfWork</c> to translate violations to 409.
    /// </summary>
    public const string UniqueName = "ux_service_categories_name_unaccent";

    public void Configure(EntityTypeBuilder<ServiceCategory> builder)
    {
        builder.ToTable("service_categories", table =>
            table.HasCheckConstraint("ck_service_categories_sort_order", "sort_order BETWEEN 0 AND 999"));
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Name).HasMaxLength(100);
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
    }
}

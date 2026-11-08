using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class ServiceStepConfiguration : IEntityTypeConfiguration<ServiceStep>
{
    public void Configure(EntityTypeBuilder<ServiceStep> builder)
    {
        builder.ToTable("service_steps", table =>
        {
            table.HasCheckConstraint("ck_service_steps_sort_order", "sort_order BETWEEN 1 AND 12");
            table.HasCheckConstraint("ck_service_steps_duration_minutes", "duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 600");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Title).HasMaxLength(100);
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.HasIndex(x => new { x.SpaServiceId, x.SortOrder }).IsUnique().HasDatabaseName("ux_service_steps_spa_service_id_sort_order");
    }
}

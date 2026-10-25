using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class SpaProfileConfiguration : IEntityTypeConfiguration<SpaProfile>
{
    public void Configure(EntityTypeBuilder<SpaProfile> builder)
    {
        builder.ToTable("spa_profiles");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Name).HasMaxLength(150);
        builder.Property(x => x.Address).HasMaxLength(255);
        builder.Property(x => x.PhoneNumber).HasMaxLength(15);
        builder.Property(x => x.OpeningHours).HasColumnType("jsonb");
        builder.Property(x => x.Policies).HasColumnType("jsonb");
    }
}

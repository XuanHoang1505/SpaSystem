using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class OtpCodeConfiguration : IEntityTypeConfiguration<OtpCode>
{
    public void Configure(EntityTypeBuilder<OtpCode> builder)
    {
        builder.ToTable("otp_codes", table =>
        {
            table.HasCheckConstraint("ck_otp_codes_purpose", "purpose IN ('registration', 'password_reset')");
            table.HasCheckConstraint("ck_otp_codes_failed_attempts_non_negative", "failed_attempts >= 0");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Email).HasColumnType("citext");
        builder.Property(x => x.CodeHash).HasMaxLength(255);
        builder.Property(x => x.PendingRegistration).HasColumnType("jsonb");
        builder.HasIndex(x => x.Email);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class StaffCertificationConfiguration : IEntityTypeConfiguration<StaffCertification>
{
    public void Configure(EntityTypeBuilder<StaffCertification> builder)
    {
        builder.ToTable("staff_certifications", table =>
        {
            table.HasCheckConstraint("ck_staff_certifications_dates", "expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on");
            table.HasCheckConstraint(
                "ck_staff_certifications_verification_status", "verification_status IN ('pending', 'verified', 'rejected')");
            table.HasCheckConstraint(
                "ck_staff_certifications_rejection", "(verification_status = 'rejected') = (rejection_reason IS NOT NULL)");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Name).HasMaxLength(200);
        builder.Property(x => x.Issuer).HasMaxLength(200);
        builder.Property(x => x.CredentialNumber).HasMaxLength(100);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.ImageUrl).HasMaxLength(500);
        builder.Property(x => x.RejectionReason).HasMaxLength(500);
        builder.Property(x => x.IsPublic).HasDefaultValue(true);
        builder.Property(x => x.VerificationStatus).HasDefaultValueSql("'pending'");
        builder.HasIndex(x => x.StaffMemberId);
        builder.HasOne(x => x.StaffMember).WithMany().HasForeignKey(x => x.StaffMemberId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.ReviewedBy).WithMany().HasForeignKey(x => x.ReviewedByUserId).OnDelete(DeleteBehavior.Restrict);
    }
}

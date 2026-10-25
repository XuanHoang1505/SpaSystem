using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class StaffMemberConfiguration : IEntityTypeConfiguration<StaffMember>
{
    public void Configure(EntityTypeBuilder<StaffMember> builder)
    {
        builder.ToTable("staff_members", table =>
        {
            table.HasCheckConstraint("ck_staff_members_resignation_after_hire", "resignation_date >= hire_date");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Specialty).HasMaxLength(255);
        builder.HasOne(x => x.User).WithOne().HasForeignKey<StaffMember>(x => x.Id).OnDelete(DeleteBehavior.Restrict);
    }
}

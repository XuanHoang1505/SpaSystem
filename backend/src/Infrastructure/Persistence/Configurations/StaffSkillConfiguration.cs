using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class StaffSkillConfiguration : IEntityTypeConfiguration<StaffSkill>
{
    public void Configure(EntityTypeBuilder<StaffSkill> builder)
    {
        builder.ToTable("staff_skills");
        builder.HasKey(x => new { x.StaffMemberId, x.SpaServiceId });
        builder.HasOne(x => x.StaffMember).WithMany(x => x.Skills).HasForeignKey(x => x.StaffMemberId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.SpaService).WithMany().HasForeignKey(x => x.SpaServiceId).OnDelete(DeleteBehavior.Restrict);
    }
}

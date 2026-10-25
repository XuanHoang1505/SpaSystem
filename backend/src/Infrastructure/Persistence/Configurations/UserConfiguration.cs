using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users", table =>
        {
            table.HasCheckConstraint("ck_users_role", "role IN ('customer', 'staff', 'owner')");
            table.HasCheckConstraint("ck_users_status", "status IN ('active', 'locked', 'inactive')");
            table.HasCheckConstraint("ck_users_gender", "gender IN ('male', 'female', 'other')");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.FullName).HasMaxLength(100);
        builder.Property(x => x.Email).HasColumnType("citext");
        builder.Property(x => x.PhoneNumber).HasMaxLength(15);
        builder.Property(x => x.PasswordHash).HasMaxLength(255);
        builder.Property(x => x.AvatarUrl).HasMaxLength(500);
        builder.HasIndex(x => x.Email).IsUnique().HasDatabaseName("ux_users_email");
        builder.HasIndex(x => x.PhoneNumber).IsUnique().HasDatabaseName("ux_users_phone_number");
    }
}

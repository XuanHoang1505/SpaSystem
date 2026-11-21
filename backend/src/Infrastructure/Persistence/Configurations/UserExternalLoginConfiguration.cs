using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class UserExternalLoginConfiguration : IEntityTypeConfiguration<UserExternalLogin>
{
    public const string UniqueProviderKey = "ux_user_external_logins_provider_provider_key";
    public const string UniqueUserProvider = "ux_user_external_logins_user_id_provider";

    public void Configure(EntityTypeBuilder<UserExternalLogin> builder)
    {
        builder.ToTable("user_external_logins", table =>
            table.HasCheckConstraint("ck_user_external_logins_provider", "provider IN ('google')"));
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.ProviderKey).HasMaxLength(255);
        builder.Property(x => x.Email).HasColumnType("citext");
        builder.HasIndex(x => new { x.Provider, x.ProviderKey }).IsUnique().HasDatabaseName(UniqueProviderKey);
        builder.HasIndex(x => new { x.UserId, x.Provider }).IsUnique().HasDatabaseName(UniqueUserProvider);
        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}

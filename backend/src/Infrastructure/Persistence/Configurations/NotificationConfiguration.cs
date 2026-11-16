using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Configurations;

internal sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    /// <summary>One reminder (or other deduplicated notice) per user and key (BR-NTF-06).</summary>
    public const string UniqueDedupKey = "ux_notifications_user_id_dedup_key";

    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("notifications", table =>
        {
            table.HasCheckConstraint("ck_notifications_type", "type IN ('appointment', 'payment', 'treatment', 'promotion', 'system')");
            table.HasCheckConstraint("ck_notifications_reference_type",
                "reference_type IN ('appointment', 'order', 'treatment_plan', 'review', 'work_schedule')");
            // BR-NTF-07: a reference has both parts or neither.
            table.HasCheckConstraint("ck_notifications_reference", "num_nonnulls(reference_type, reference_id) <> 1");
        });
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Title).HasMaxLength(Notification.TitleMaxLength);
        builder.Property(x => x.DedupKey).HasMaxLength(Notification.DedupKeyMaxLength);
        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => new { x.UserId, x.CreatedAtUtc })
            .IsDescending(false, true)
            .HasDatabaseName("ix_notifications_user_id_created_at_utc");
        builder.HasIndex(x => x.UserId)
            .HasFilter("read_at_utc IS NULL")
            .HasDatabaseName("ix_notifications_user_id_unread");
        builder.HasIndex(x => new { x.UserId, x.DedupKey })
            .IsUnique()
            .HasFilter("dedup_key IS NOT NULL")
            .HasDatabaseName(UniqueDedupKey);
    }
}

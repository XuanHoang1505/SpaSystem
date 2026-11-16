using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationReferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_notifications_user_id",
                table: "notifications");

            migrationBuilder.AddColumn<string>(
                name: "dedup_key",
                table: "notifications",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "reference_id",
                table: "notifications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "reference_type",
                table: "notifications",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_notifications_user_id_created_at_utc",
                table: "notifications",
                columns: new[] { "user_id", "created_at_utc" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "ix_notifications_user_id_unread",
                table: "notifications",
                column: "user_id",
                filter: "read_at_utc IS NULL");

            migrationBuilder.CreateIndex(
                name: "ux_notifications_user_id_dedup_key",
                table: "notifications",
                columns: new[] { "user_id", "dedup_key" },
                unique: true,
                filter: "dedup_key IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_notifications_reference",
                table: "notifications",
                sql: "num_nonnulls(reference_type, reference_id) <> 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_notifications_reference_type",
                table: "notifications",
                sql: "reference_type IN ('appointment', 'order', 'treatment_plan', 'review', 'work_schedule')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_notifications_user_id_created_at_utc",
                table: "notifications");

            migrationBuilder.DropIndex(
                name: "ix_notifications_user_id_unread",
                table: "notifications");

            migrationBuilder.DropIndex(
                name: "ux_notifications_user_id_dedup_key",
                table: "notifications");

            migrationBuilder.DropCheckConstraint(
                name: "ck_notifications_reference",
                table: "notifications");

            migrationBuilder.DropCheckConstraint(
                name: "ck_notifications_reference_type",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "dedup_key",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "reference_id",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "reference_type",
                table: "notifications");

            migrationBuilder.CreateIndex(
                name: "ix_notifications_user_id",
                table: "notifications",
                column: "user_id");
        }
    }
}

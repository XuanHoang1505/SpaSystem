using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStaffCertifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "staff_certifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    staff_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    issuer = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    credential_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    issued_on = table.Column<DateOnly>(type: "date", nullable: true),
                    expires_on = table.Column<DateOnly>(type: "date", nullable: true),
                    is_public = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    verification_status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValueSql: "'pending'"),
                    rejection_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    reviewed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_staff_certifications", x => x.id);
                    table.CheckConstraint("ck_staff_certifications_dates", "expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on");
                    table.CheckConstraint("ck_staff_certifications_rejection", "(verification_status = 'rejected') = (rejection_reason IS NOT NULL)");
                    table.CheckConstraint("ck_staff_certifications_verification_status", "verification_status IN ('pending', 'verified', 'rejected')");
                    table.ForeignKey(
                        name: "fk_staff_certifications_staff_members_staff_member_id",
                        column: x => x.staff_member_id,
                        principalTable: "staff_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_staff_certifications_users_reviewed_by_user_id",
                        column: x => x.reviewed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_staff_certifications_reviewed_by_user_id",
                table: "staff_certifications",
                column: "reviewed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_staff_certifications_staff_member_id",
                table: "staff_certifications",
                column: "staff_member_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "staff_certifications");
        }
    }
}

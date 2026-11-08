using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceShortDescriptionAndSteps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "short_description",
                table: "spa_services",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "short_description",
                table: "service_packages",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "service_steps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    spa_service_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    duration_minutes = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_service_steps", x => x.id);
                    table.CheckConstraint("ck_service_steps_duration_minutes", "duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 600");
                    table.CheckConstraint("ck_service_steps_sort_order", "sort_order BETWEEN 1 AND 12");
                    table.ForeignKey(
                        name: "fk_service_steps_spa_services_spa_service_id",
                        column: x => x.spa_service_id,
                        principalTable: "spa_services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ux_service_steps_spa_service_id_sort_order",
                table: "service_steps",
                columns: new[] { "spa_service_id", "sort_order" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "service_steps");

            migrationBuilder.DropColumn(
                name: "short_description",
                table: "spa_services");

            migrationBuilder.DropColumn(
                name: "short_description",
                table: "service_packages");
        }
    }
}

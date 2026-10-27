using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServicePackageImageAndItemUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_service_package_items_service_package_id",
                table: "service_package_items");

            migrationBuilder.AddColumn<string>(
                name: "image_url",
                table: "service_packages",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ux_service_package_items_service_package_id_sort_order",
                table: "service_package_items",
                columns: new[] { "service_package_id", "sort_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_service_package_items_service_package_id_spa_service_id",
                table: "service_package_items",
                columns: new[] { "service_package_id", "spa_service_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_service_package_items_service_package_id_sort_order",
                table: "service_package_items");

            migrationBuilder.DropIndex(
                name: "ux_service_package_items_service_package_id_spa_service_id",
                table: "service_package_items");

            migrationBuilder.DropColumn(
                name: "image_url",
                table: "service_packages");

            migrationBuilder.CreateIndex(
                name: "ix_service_package_items_service_package_id",
                table: "service_package_items",
                column: "service_package_id");
        }
    }
}

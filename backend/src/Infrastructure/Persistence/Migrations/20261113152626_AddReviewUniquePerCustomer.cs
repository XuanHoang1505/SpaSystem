using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewUniquePerCustomer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_reviews_customer_id",
                table: "reviews");

            migrationBuilder.CreateIndex(
                name: "ux_reviews_customer_package",
                table: "reviews",
                columns: new[] { "customer_id", "service_package_id" },
                unique: true,
                filter: "service_package_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ux_reviews_customer_service",
                table: "reviews",
                columns: new[] { "customer_id", "spa_service_id" },
                unique: true,
                filter: "spa_service_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_reviews_customer_package",
                table: "reviews");

            migrationBuilder.DropIndex(
                name: "ux_reviews_customer_service",
                table: "reviews");

            migrationBuilder.CreateIndex(
                name: "ix_reviews_customer_id",
                table: "reviews",
                column: "customer_id");
        }
    }
}

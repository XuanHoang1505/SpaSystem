using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderingConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "idempotency_key",
                table: "orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_promotions_code_upper",
                table: "promotions",
                sql: "code = upper(code)");

            migrationBuilder.CreateIndex(
                name: "ix_orders_pending_payment_due",
                table: "orders",
                column: "payment_due_at_utc",
                filter: "status = 'pending_payment'");

            migrationBuilder.CreateIndex(
                name: "ux_orders_customer_id_idempotency_key",
                table: "orders",
                columns: new[] { "customer_id", "idempotency_key" },
                unique: true,
                filter: "idempotency_key IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ux_cart_items_cart_id_service_package_id",
                table: "cart_items",
                columns: new[] { "cart_id", "service_package_id" },
                unique: true,
                filter: "service_package_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ux_cart_items_cart_id_spa_service_id",
                table: "cart_items",
                columns: new[] { "cart_id", "spa_service_id" },
                unique: true,
                filter: "spa_service_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_promotions_code_upper",
                table: "promotions");

            migrationBuilder.DropIndex(
                name: "ix_orders_pending_payment_due",
                table: "orders");

            migrationBuilder.DropIndex(
                name: "ux_orders_customer_id_idempotency_key",
                table: "orders");

            migrationBuilder.DropIndex(
                name: "ux_cart_items_cart_id_service_package_id",
                table: "cart_items");

            migrationBuilder.DropIndex(
                name: "ux_cart_items_cart_id_spa_service_id",
                table: "cart_items");

            migrationBuilder.DropColumn(
                name: "idempotency_key",
                table: "orders");
        }
    }
}

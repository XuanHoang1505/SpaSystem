using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderInstallments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_orders_status",
                table: "orders");

            migrationBuilder.AddColumn<Guid>(
                name: "installment_id",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payment_plan",
                table: "orders",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "full"); // Existing orders were all paid in full.

            migrationBuilder.CreateTable(
                name: "order_installments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence_number = table.Column<int>(type: "integer", nullable: false),
                    first_session_number = table.Column<int>(type: "integer", nullable: false),
                    last_session_number = table.Column<int>(type: "integer", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    paid_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_order_installments", x => x.id);
                    table.CheckConstraint("ck_order_installments_amount_positive", "amount > 0");
                    table.CheckConstraint("ck_order_installments_paid", "(status = 'paid') = (paid_at_utc IS NOT NULL)");
                    table.CheckConstraint("ck_order_installments_sequence_number", "sequence_number >= 1");
                    table.CheckConstraint("ck_order_installments_sessions", "first_session_number >= 1 AND first_session_number <= last_session_number");
                    table.CheckConstraint("ck_order_installments_status", "status IN ('pending', 'paid', 'cancelled')");
                    table.ForeignKey(
                        name: "fk_order_installments_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_payments_installment_id",
                table: "payments",
                column: "installment_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_orders_payment_plan",
                table: "orders",
                sql: "payment_plan IN ('full', 'installment')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_orders_status",
                table: "orders",
                sql: "status IN ('pending_payment', 'partially_paid', 'paid', 'cancelled', 'expired')");

            migrationBuilder.CreateIndex(
                name: "ux_order_installments_order_id_sequence_number",
                table: "order_installments",
                columns: new[] { "order_id", "sequence_number" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_payments_order_installments_installment_id",
                table: "payments",
                column: "installment_id",
                principalTable: "order_installments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_payments_order_installments_installment_id",
                table: "payments");

            migrationBuilder.DropTable(
                name: "order_installments");

            migrationBuilder.DropIndex(
                name: "ix_payments_installment_id",
                table: "payments");

            migrationBuilder.DropCheckConstraint(
                name: "ck_orders_payment_plan",
                table: "orders");

            migrationBuilder.DropCheckConstraint(
                name: "ck_orders_status",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "installment_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "payment_plan",
                table: "orders");

            migrationBuilder.AddCheckConstraint(
                name: "ck_orders_status",
                table: "orders",
                sql: "status IN ('pending_payment', 'paid', 'cancelled', 'expired')");
        }
    }
}

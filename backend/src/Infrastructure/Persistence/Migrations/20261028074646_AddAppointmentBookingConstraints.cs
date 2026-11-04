using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentBookingConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_appointments_customer_id",
                table: "appointments");

            migrationBuilder.CreateIndex(
                name: "ix_appointments_customer_id_date",
                table: "appointments",
                columns: new[] { "customer_id", "date" });

            migrationBuilder.AddCheckConstraint(
                name: "ck_appointments_source",
                table: "appointments",
                sql: "num_nonnulls(service_entitlement_id, treatment_session_id, order_item_id) >= 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_appointments_customer_id_date",
                table: "appointments");

            migrationBuilder.DropCheckConstraint(
                name: "ck_appointments_source",
                table: "appointments");

            migrationBuilder.CreateIndex(
                name: "ix_appointments_customer_id",
                table: "appointments",
                column: "customer_id");
        }
    }
}

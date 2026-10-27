using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkScheduleOverlapConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // BR-STF-03: active shifts of one staff member never overlap (docs/specs/staff.md).
            migrationBuilder.Sql(WorkScheduleConstraints.CreateNoOverlapSql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(WorkScheduleConstraints.DropNoOverlapSql);
        }
    }
}

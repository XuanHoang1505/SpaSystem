using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Q-13: moves the free-text <c>spa_services.category</c> into <c>service_categories</c>. Spellings that differ only in
    /// case, accents or spaces become one category, named after the earliest service's spelling (docs/specs/catalog.md).
    /// </summary>
    public partial class AddServiceCategories : Migration
    {
        // Normalized old category text: trimmed, inner spaces collapsed; blank values get a fallback name.
        private const string NormalizedCategory =
            @"COALESCE(NULLIF(regexp_replace(btrim(s.category), '\s+', ' ', 'g'), ''), 'Chưa phân loại')";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "service_categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_service_categories", x => x.id);
                    table.CheckConstraint("ck_service_categories_sort_order", "sort_order BETWEEN 0 AND 999");
                });

            // BR-CAT-10: unique ignoring case and accents (expression index, not expressible in the EF model).
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX ux_service_categories_name_unaccent ON service_categories (public.f_unaccent(lower(name)));");

            migrationBuilder.AddColumn<Guid>(
                name: "category_id",
                table: "spa_services",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql($@"
INSERT INTO service_categories (id, name, sort_order, is_active, created_at_utc)
SELECT gen_random_uuid(), g.name, LEAST(row_number() OVER (ORDER BY g.name) - 1, 999), true, now()
FROM (
    SELECT DISTINCT ON (public.f_unaccent(lower({NormalizedCategory}))) {NormalizedCategory} AS name
    FROM spa_services s
    ORDER BY public.f_unaccent(lower({NormalizedCategory})), s.created_at_utc, s.id
) g;

UPDATE spa_services s
SET category_id = c.id
FROM service_categories c
WHERE public.f_unaccent(lower(c.name)) = public.f_unaccent(lower({NormalizedCategory}));");

            migrationBuilder.AlterColumn<Guid>(
                name: "category_id",
                table: "spa_services",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.DropIndex(
                name: "ix_spa_services_category",
                table: "spa_services");

            migrationBuilder.DropColumn(
                name: "category",
                table: "spa_services");

            migrationBuilder.CreateIndex(
                name: "ix_spa_services_category_id",
                table: "spa_services",
                column: "category_id");

            migrationBuilder.AddForeignKey(
                name: "fk_spa_services_service_categories_category_id",
                table: "spa_services",
                column: "category_id",
                principalTable: "service_categories",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "category",
                table: "spa_services",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE spa_services s
SET category = c.name
FROM service_categories c
WHERE c.id = s.category_id;");

            migrationBuilder.AlterColumn<string>(
                name: "category",
                table: "spa_services",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_spa_services_category",
                table: "spa_services",
                column: "category");

            migrationBuilder.DropForeignKey(
                name: "fk_spa_services_service_categories_category_id",
                table: "spa_services");

            migrationBuilder.DropIndex(
                name: "ix_spa_services_category_id",
                table: "spa_services");

            migrationBuilder.DropColumn(
                name: "category_id",
                table: "spa_services");

            migrationBuilder.DropTable(
                name: "service_categories");
        }
    }
}

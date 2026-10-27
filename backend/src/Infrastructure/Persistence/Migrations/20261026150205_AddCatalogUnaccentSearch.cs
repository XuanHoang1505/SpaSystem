using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogUnaccentSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:btree_gist", ",,")
                .Annotation("Npgsql:PostgresExtension:citext", ",,")
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .Annotation("Npgsql:PostgresExtension:unaccent", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:btree_gist", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:citext", ",,");

            // unaccent() is only STABLE (it reads a dictionary), so an IMMUTABLE wrapper with a fixed dictionary
            // is needed to use it in an index expression (BR-CAT-05). Queries call it through AppDbContext.Unaccent.
            migrationBuilder.Sql("""
                CREATE OR REPLACE FUNCTION public.f_unaccent(text) RETURNS text
                    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
                    AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
                """);
            migrationBuilder.Sql("CREATE INDEX ix_spa_services_name_unaccent_trgm ON spa_services USING gin (public.f_unaccent(lower(name)) gin_trgm_ops);");
            migrationBuilder.Sql("CREATE INDEX ix_service_packages_name_unaccent_trgm ON service_packages USING gin (public.f_unaccent(lower(name)) gin_trgm_ops);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_service_packages_name_unaccent_trgm;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_spa_services_name_unaccent_trgm;");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS public.f_unaccent(text);");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:btree_gist", ",,")
                .Annotation("Npgsql:PostgresExtension:citext", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:btree_gist", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:citext", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:unaccent", ",,");
        }
    }
}

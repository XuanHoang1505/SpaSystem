using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NhuNguyetSpa.Infrastructure.Persistence;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:btree_gist", ",,")
                .Annotation("Npgsql:PostgresExtension:citext", ",,");

            migrationBuilder.CreateTable(
                name: "otp_codes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "citext", nullable: false),
                    purpose = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    code_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    pending_registration = table.Column<string>(type: "jsonb", nullable: true),
                    failed_attempts = table.Column<int>(type: "integer", nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    used_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_otp_codes", x => x.id);
                    table.CheckConstraint("ck_otp_codes_failed_attempts_non_negative", "failed_attempts >= 0");
                    table.CheckConstraint("ck_otp_codes_purpose", "purpose IN ('registration', 'password_reset')");
                });

            migrationBuilder.CreateTable(
                name: "promotions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    discount_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    discount_value = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    min_order_amount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    max_discount_amount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: true),
                    starts_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ends_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    per_customer_limit = table.Column<int>(type: "integer", nullable: true),
                    usage_limit = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_promotions", x => x.id);
                    table.CheckConstraint("ck_promotions_discount_type", "discount_type IN ('percentage', 'fixed_amount')");
                    table.CheckConstraint("ck_promotions_discount_value", "discount_value > 0 AND (discount_type <> 'percentage' OR discount_value <= 100)");
                    table.CheckConstraint("ck_promotions_max_discount_amount_positive", "max_discount_amount > 0");
                    table.CheckConstraint("ck_promotions_min_order_amount_non_negative", "min_order_amount >= 0");
                    table.CheckConstraint("ck_promotions_per_customer_limit_positive", "per_customer_limit > 0");
                    table.CheckConstraint("ck_promotions_period", "ends_at_utc > starts_at_utc");
                    table.CheckConstraint("ck_promotions_status", "status IN ('active', 'stopped')");
                    table.CheckConstraint("ck_promotions_usage_limit_positive", "usage_limit > 0");
                });

            migrationBuilder.CreateTable(
                name: "service_packages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    price = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    validity_days = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    sale_start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    sale_end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_service_packages", x => x.id);
                    table.CheckConstraint("ck_service_packages_price_non_negative", "price >= 0");
                    table.CheckConstraint("ck_service_packages_sale_period", "sale_end_date >= sale_start_date");
                    table.CheckConstraint("ck_service_packages_status", "status IN ('on_sale', 'discontinued')");
                    table.CheckConstraint("ck_service_packages_validity_days_positive", "validity_days > 0");
                });

            migrationBuilder.CreateTable(
                name: "spa_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    introduction = table.Column<string>(type: "text", nullable: true),
                    address = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    phone_number = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    opening_hours = table.Column<string>(type: "jsonb", nullable: true),
                    policies = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_spa_profiles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "spa_services",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    price = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    image_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_spa_services", x => x.id);
                    table.CheckConstraint("ck_spa_services_duration_minutes_positive", "duration_minutes > 0");
                    table.CheckConstraint("ck_spa_services_price_non_negative", "price >= 0");
                    table.CheckConstraint("ck_spa_services_status", "status IN ('on_sale', 'discontinued')");
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "citext", nullable: false),
                    phone_number = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    role = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    avatar_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    date_of_birth = table.Column<DateOnly>(type: "date", nullable: true),
                    gender = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                    table.CheckConstraint("ck_users_gender", "gender IN ('male', 'female', 'other')");
                    table.CheckConstraint("ck_users_role", "role IN ('customer', 'staff', 'owner')");
                    table.CheckConstraint("ck_users_status", "status IN ('active', 'locked', 'inactive')");
                });

            migrationBuilder.CreateTable(
                name: "service_package_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    spa_service_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_package_id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_count = table.Column<int>(type: "integer", nullable: false),
                    min_days_between_sessions = table.Column<int>(type: "integer", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_service_package_items", x => x.id);
                    table.CheckConstraint("ck_service_package_items_min_days_between_sessions_non_negative", "min_days_between_sessions >= 0");
                    table.CheckConstraint("ck_service_package_items_session_count_positive", "session_count > 0");
                    table.CheckConstraint("ck_service_package_items_sort_order_positive", "sort_order > 0");
                    table.ForeignKey(
                        name: "fk_service_package_items_service_packages_service_package_id",
                        column: x => x.service_package_id,
                        principalTable: "service_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_service_package_items_spa_services_spa_service_id",
                        column: x => x.spa_service_id,
                        principalTable: "spa_services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "customers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customers", x => x.id);
                    table.ForeignKey(
                        name: "fk_customers_users_id",
                        column: x => x.id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    body = table.Column<string>(type: "text", nullable: false),
                    type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    read_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_notifications", x => x.id);
                    table.CheckConstraint("ck_notifications_type", "type IN ('appointment', 'payment', 'treatment', 'promotion', 'system')");
                    table.ForeignKey(
                        name: "fk_notifications_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "owner_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_owner_profiles", x => x.id);
                    table.ForeignKey(
                        name: "fk_owner_profiles_users_id",
                        column: x => x.id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    revoked_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_refresh_tokens", x => x.id);
                    table.ForeignKey(
                        name: "fk_refresh_tokens_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "staff_members",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    hire_date = table.Column<DateOnly>(type: "date", nullable: false),
                    specialty = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    resignation_date = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_staff_members", x => x.id);
                    table.CheckConstraint("ck_staff_members_resignation_after_hire", "resignation_date >= hire_date");
                    table.ForeignKey(
                        name: "fk_staff_members_users_id",
                        column: x => x.id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ai_chat_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    question = table.Column<string>(type: "text", nullable: false),
                    answer = table.Column<string>(type: "text", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ai_chat_messages", x => x.id);
                    table.ForeignKey(
                        name: "fk_ai_chat_messages_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "carts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_carts", x => x.id);
                    table.ForeignKey(
                        name: "fk_carts_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "customer_allergies",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    allergen = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    severity = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    recorded_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customer_allergies", x => x.id);
                    table.CheckConstraint("ck_customer_allergies_severity", "severity IN ('mild', 'moderate', 'severe')");
                    table.ForeignKey(
                        name: "fk_customer_allergies_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "orders",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    discount_total = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    grand_total = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    payment_due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_orders", x => x.id);
                    table.CheckConstraint("ck_orders_discount_total", "discount_total >= 0 AND discount_total <= subtotal");
                    table.CheckConstraint("ck_orders_grand_total", "grand_total = subtotal - discount_total");
                    table.CheckConstraint("ck_orders_payment_due_after_created", "payment_due_at_utc > created_at_utc");
                    table.CheckConstraint("ck_orders_status", "status IN ('pending_payment', 'paid', 'cancelled', 'expired')");
                    table.CheckConstraint("ck_orders_subtotal_non_negative", "subtotal >= 0");
                    table.ForeignKey(
                        name: "fk_orders_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reviews",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    spa_service_id = table.Column<Guid>(type: "uuid", nullable: true),
                    service_package_id = table.Column<Guid>(type: "uuid", nullable: true),
                    comment = table.Column<string>(type: "text", nullable: true),
                    owner_reply = table.Column<string>(type: "text", nullable: true),
                    replied_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    rating = table.Column<int>(type: "integer", nullable: false),
                    image_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reviews", x => x.id);
                    table.CheckConstraint("ck_reviews_rating_range", "rating BETWEEN 1 AND 5");
                    table.CheckConstraint("ck_reviews_single_product", "num_nonnulls(spa_service_id, service_package_id) = 1");
                    table.CheckConstraint("ck_reviews_status", "status IN ('visible', 'hidden')");
                    table.ForeignKey(
                        name: "fk_reviews_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_reviews_service_packages_service_package_id",
                        column: x => x.service_package_id,
                        principalTable: "service_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_reviews_spa_services_spa_service_id",
                        column: x => x.spa_service_id,
                        principalTable: "spa_services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "staff_skills",
                columns: table => new
                {
                    staff_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    spa_service_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_staff_skills", x => new { x.staff_member_id, x.spa_service_id });
                    table.ForeignKey(
                        name: "fk_staff_skills_spa_services_spa_service_id",
                        column: x => x.spa_service_id,
                        principalTable: "spa_services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_staff_skills_staff_members_staff_member_id",
                        column: x => x.staff_member_id,
                        principalTable: "staff_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "work_schedules",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    staff_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    start_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    end_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_work_schedules", x => x.id);
                    table.CheckConstraint("ck_work_schedules_status", "status IN ('active', 'cancelled')");
                    table.CheckConstraint("ck_work_schedules_time_range", "end_time > start_time");
                    table.ForeignKey(
                        name: "fk_work_schedules_staff_members_staff_member_id",
                        column: x => x.staff_member_id,
                        principalTable: "staff_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cart_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    cart_id = table.Column<Guid>(type: "uuid", nullable: false),
                    spa_service_id = table.Column<Guid>(type: "uuid", nullable: true),
                    service_package_id = table.Column<Guid>(type: "uuid", nullable: true),
                    unit_price = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    added_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_cart_items", x => x.id);
                    table.CheckConstraint("ck_cart_items_single_product", "num_nonnulls(spa_service_id, service_package_id) = 1");
                    table.CheckConstraint("ck_cart_items_unit_price_non_negative", "unit_price >= 0");
                    table.ForeignKey(
                        name: "fk_cart_items_carts_cart_id",
                        column: x => x.cart_id,
                        principalTable: "carts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_cart_items_service_packages_service_package_id",
                        column: x => x.service_package_id,
                        principalTable: "service_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_cart_items_spa_services_spa_service_id",
                        column: x => x.spa_service_id,
                        principalTable: "spa_services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    spa_service_id = table.Column<Guid>(type: "uuid", nullable: true),
                    service_package_id = table.Column<Guid>(type: "uuid", nullable: true),
                    product_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    line_total = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_order_items", x => x.id);
                    table.CheckConstraint("ck_order_items_discount_amount", "discount_amount >= 0 AND discount_amount <= unit_price");
                    table.CheckConstraint("ck_order_items_line_total", "line_total = unit_price - discount_amount");
                    table.CheckConstraint("ck_order_items_single_product", "num_nonnulls(spa_service_id, service_package_id) = 1");
                    table.CheckConstraint("ck_order_items_unit_price_non_negative", "unit_price >= 0");
                    table.ForeignKey(
                        name: "fk_order_items_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_order_items_service_packages_service_package_id",
                        column: x => x.service_package_id,
                        principalTable: "service_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_order_items_spa_services_spa_service_id",
                        column: x => x.spa_service_id,
                        principalTable: "spa_services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    request_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    provider_transaction_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    payment_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    paid_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_payments", x => x.id);
                    table.CheckConstraint("ck_payments_amount_non_negative", "amount >= 0");
                    table.CheckConstraint("ck_payments_status", "status IN ('pending', 'succeeded', 'failed', 'expired')");
                    table.ForeignKey(
                        name: "fk_payments_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "promotion_redemptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    promotion_id = table.Column<Guid>(type: "uuid", nullable: false),
                    promotion_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    redeemed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_promotion_redemptions", x => x.id);
                    table.CheckConstraint("ck_promotion_redemptions_discount_amount_non_negative", "discount_amount >= 0");
                    table.ForeignKey(
                        name: "fk_promotion_redemptions_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_promotion_redemptions_promotions_promotion_id",
                        column: x => x.promotion_id,
                        principalTable: "promotions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "customer_packages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    package_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    purchased_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    activated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    total_sessions = table.Column<int>(type: "integer", nullable: false),
                    used_sessions = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customer_packages", x => x.id);
                    table.CheckConstraint("ck_customer_packages_status", "status IN ('active', 'completed', 'expired', 'cancelled')");
                    table.CheckConstraint("ck_customer_packages_total_sessions_positive", "total_sessions > 0");
                    table.CheckConstraint("ck_customer_packages_used_sessions", "used_sessions >= 0 AND used_sessions <= total_sessions");
                    table.ForeignKey(
                        name: "fk_customer_packages_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customer_packages_order_items_order_item_id",
                        column: x => x.order_item_id,
                        principalTable: "order_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "service_entitlements",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_service_entitlements", x => x.id);
                    table.CheckConstraint("ck_service_entitlements_status", "status IN ('available', 'booked', 'used', 'expired')");
                    table.ForeignKey(
                        name: "fk_service_entitlements_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_service_entitlements_order_items_order_item_id",
                        column: x => x.order_item_id,
                        principalTable: "order_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "treatment_plans",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_package_id = table.Column<Guid>(type: "uuid", nullable: false),
                    primary_staff_member_id = table.Column<Guid>(type: "uuid", nullable: true),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    expected_end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    actual_end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    goal = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_treatment_plans", x => x.id);
                    table.CheckConstraint("ck_treatment_plans_status", "status IN ('not_started', 'in_progress', 'completed', 'paused', 'cancelled')");
                    table.ForeignKey(
                        name: "fk_treatment_plans_customer_packages_customer_package_id",
                        column: x => x.customer_package_id,
                        principalTable: "customer_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_treatment_plans_staff_members_primary_staff_member_id",
                        column: x => x.primary_staff_member_id,
                        principalTable: "staff_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "treatment_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    treatment_plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    spa_service_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sequence_number = table.Column<int>(type: "integer", nullable: false),
                    service_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_treatment_sessions", x => x.id);
                    table.CheckConstraint("ck_treatment_sessions_duration_minutes_positive", "duration_minutes > 0");
                    table.CheckConstraint("ck_treatment_sessions_sequence_number_positive", "sequence_number > 0");
                    table.CheckConstraint("ck_treatment_sessions_status", "status IN ('not_booked', 'booked', 'completed', 'skipped')");
                    table.ForeignKey(
                        name: "fk_treatment_sessions_spa_services_spa_service_id",
                        column: x => x.spa_service_id,
                        principalTable: "spa_services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_treatment_sessions_treatment_plans_treatment_plan_id",
                        column: x => x.treatment_plan_id,
                        principalTable: "treatment_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "appointments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    staff_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_entitlement_id = table.Column<Guid>(type: "uuid", nullable: true),
                    treatment_session_id = table.Column<Guid>(type: "uuid", nullable: true),
                    order_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    hold_expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    start_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    end_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    cancelled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancellation_reason = table.Column<string>(type: "text", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_appointments", x => x.id);
                    table.CheckConstraint("ck_appointments_status", "status IN ('held', 'pending_confirmation', 'confirmed', 'completed', 'cancelled', 'no_show', 'hold_expired')");
                    table.CheckConstraint("ck_appointments_time_range", "end_time > start_time");
                    table.ForeignKey(
                        name: "fk_appointments_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_appointments_order_items_order_item_id",
                        column: x => x.order_item_id,
                        principalTable: "order_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_appointments_service_entitlements_service_entitlement_id",
                        column: x => x.service_entitlement_id,
                        principalTable: "service_entitlements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_appointments_staff_members_staff_member_id",
                        column: x => x.staff_member_id,
                        principalTable: "staff_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_appointments_treatment_sessions_treatment_session_id",
                        column: x => x.treatment_session_id,
                        principalTable: "treatment_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "skin_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assessed_by_staff_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    appointment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assessed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    skin_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    main_concerns = table.Column<string>(type: "text", nullable: true),
                    current_products = table.Column<string>(type: "text", nullable: true),
                    care_goals = table.Column<string>(type: "text", nullable: true),
                    recommended_treatment = table.Column<string>(type: "text", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_skin_profiles", x => x.id);
                    table.CheckConstraint("ck_skin_profiles_skin_type", "skin_type IN ('normal', 'dry', 'oily', 'combination', 'sensitive')");
                    table.ForeignKey(
                        name: "fk_skin_profiles_appointments_appointment_id",
                        column: x => x.appointment_id,
                        principalTable: "appointments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_skin_profiles_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_skin_profiles_staff_members_assessed_by_staff_member_id",
                        column: x => x.assessed_by_staff_member_id,
                        principalTable: "staff_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_ai_chat_messages_customer_id",
                table: "ai_chat_messages",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_appointments_customer_id",
                table: "appointments",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_appointments_order_item_id",
                table: "appointments",
                column: "order_item_id");

            migrationBuilder.CreateIndex(
                name: "ix_appointments_service_entitlement_id",
                table: "appointments",
                column: "service_entitlement_id");

            migrationBuilder.CreateIndex(
                name: "ix_appointments_staff_member_id_date",
                table: "appointments",
                columns: new[] { "staff_member_id", "date" });

            migrationBuilder.CreateIndex(
                name: "ix_appointments_treatment_session_id",
                table: "appointments",
                column: "treatment_session_id");

            migrationBuilder.CreateIndex(
                name: "ix_cart_items_cart_id",
                table: "cart_items",
                column: "cart_id");

            migrationBuilder.CreateIndex(
                name: "ix_cart_items_service_package_id",
                table: "cart_items",
                column: "service_package_id");

            migrationBuilder.CreateIndex(
                name: "ix_cart_items_spa_service_id",
                table: "cart_items",
                column: "spa_service_id");

            migrationBuilder.CreateIndex(
                name: "ux_carts_customer_id",
                table: "carts",
                column: "customer_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_customer_allergies_customer_id",
                table: "customer_allergies",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_customer_packages_customer_id",
                table: "customer_packages",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ux_customer_packages_order_item_id",
                table: "customer_packages",
                column: "order_item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_notifications_user_id",
                table: "notifications",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_order_items_order_id",
                table: "order_items",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "ix_order_items_service_package_id",
                table: "order_items",
                column: "service_package_id");

            migrationBuilder.CreateIndex(
                name: "ix_order_items_spa_service_id",
                table: "order_items",
                column: "spa_service_id");

            migrationBuilder.CreateIndex(
                name: "ix_orders_customer_id",
                table: "orders",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ux_orders_code",
                table: "orders",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_otp_codes_email",
                table: "otp_codes",
                column: "email");

            migrationBuilder.CreateIndex(
                name: "ix_payments_order_id",
                table: "payments",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "ix_payments_paid_at_utc",
                table: "payments",
                column: "paid_at_utc");

            migrationBuilder.CreateIndex(
                name: "ux_payments_request_code",
                table: "payments",
                column: "request_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_promotion_redemptions_promotion_id",
                table: "promotion_redemptions",
                column: "promotion_id");

            migrationBuilder.CreateIndex(
                name: "ux_promotion_redemptions_order_id",
                table: "promotion_redemptions",
                column: "order_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_promotions_code",
                table: "promotions",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_user_id",
                table: "refresh_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ux_refresh_tokens_token_hash",
                table: "refresh_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_reviews_customer_id",
                table: "reviews",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_reviews_service_package_id",
                table: "reviews",
                column: "service_package_id");

            migrationBuilder.CreateIndex(
                name: "ix_reviews_spa_service_id",
                table: "reviews",
                column: "spa_service_id");

            migrationBuilder.CreateIndex(
                name: "ix_service_entitlements_customer_id",
                table: "service_entitlements",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ux_service_entitlements_order_item_id",
                table: "service_entitlements",
                column: "order_item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_service_package_items_service_package_id",
                table: "service_package_items",
                column: "service_package_id");

            migrationBuilder.CreateIndex(
                name: "ix_service_package_items_spa_service_id",
                table: "service_package_items",
                column: "spa_service_id");

            migrationBuilder.CreateIndex(
                name: "ix_skin_profiles_assessed_by_staff_member_id",
                table: "skin_profiles",
                column: "assessed_by_staff_member_id");

            migrationBuilder.CreateIndex(
                name: "ix_skin_profiles_customer_id",
                table: "skin_profiles",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ux_skin_profiles_appointment_id",
                table: "skin_profiles",
                column: "appointment_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_spa_services_category",
                table: "spa_services",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "ix_staff_skills_spa_service_id",
                table: "staff_skills",
                column: "spa_service_id");

            migrationBuilder.CreateIndex(
                name: "ix_treatment_plans_primary_staff_member_id",
                table: "treatment_plans",
                column: "primary_staff_member_id");

            migrationBuilder.CreateIndex(
                name: "ux_treatment_plans_customer_package_id",
                table: "treatment_plans",
                column: "customer_package_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_treatment_sessions_spa_service_id",
                table: "treatment_sessions",
                column: "spa_service_id");

            migrationBuilder.CreateIndex(
                name: "ux_treatment_sessions_treatment_plan_id_sequence_number",
                table: "treatment_sessions",
                columns: new[] { "treatment_plan_id", "sequence_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_users_phone_number",
                table: "users",
                column: "phone_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_work_schedules_staff_member_id_date",
                table: "work_schedules",
                columns: new[] { "staff_member_id", "date" });

            // ADR-0003: a staff member cannot hold two occupying appointments in overlapping time ranges.
            migrationBuilder.Sql(AppointmentConstraints.CreateStaffNoOverlapSql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(AppointmentConstraints.DropStaffNoOverlapSql);

            migrationBuilder.DropTable(
                name: "ai_chat_messages");

            migrationBuilder.DropTable(
                name: "cart_items");

            migrationBuilder.DropTable(
                name: "customer_allergies");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "otp_codes");

            migrationBuilder.DropTable(
                name: "owner_profiles");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "promotion_redemptions");

            migrationBuilder.DropTable(
                name: "refresh_tokens");

            migrationBuilder.DropTable(
                name: "reviews");

            migrationBuilder.DropTable(
                name: "service_package_items");

            migrationBuilder.DropTable(
                name: "skin_profiles");

            migrationBuilder.DropTable(
                name: "spa_profiles");

            migrationBuilder.DropTable(
                name: "staff_skills");

            migrationBuilder.DropTable(
                name: "work_schedules");

            migrationBuilder.DropTable(
                name: "carts");

            migrationBuilder.DropTable(
                name: "promotions");

            migrationBuilder.DropTable(
                name: "appointments");

            migrationBuilder.DropTable(
                name: "service_entitlements");

            migrationBuilder.DropTable(
                name: "treatment_sessions");

            migrationBuilder.DropTable(
                name: "treatment_plans");

            migrationBuilder.DropTable(
                name: "customer_packages");

            migrationBuilder.DropTable(
                name: "staff_members");

            migrationBuilder.DropTable(
                name: "order_items");

            migrationBuilder.DropTable(
                name: "orders");

            migrationBuilder.DropTable(
                name: "service_packages");

            migrationBuilder.DropTable(
                name: "spa_services");

            migrationBuilder.DropTable(
                name: "customers");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}

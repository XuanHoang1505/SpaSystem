using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure;
using NhuNguyetSpa.Infrastructure.Persistence;
using NhuNguyetSpa.Infrastructure.Persistence.Conversions;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests;

/// <summary>
/// Guards that the EF Core model matches docs/domain/data-model.md. Builds the model only; no database is needed.
/// Expected tables, columns and enum values are generated from docs/spec-source/data_db.py.
/// </summary>
public sealed class PersistenceModelTests
{
    private static readonly Dictionary<string, string> ExpectedColumns = new()
    {
        ["users"] = "id,full_name,email,phone_number,password_hash,role,avatar_url,status,date_of_birth,gender,created_at_utc,updated_at_utc,created_by,updated_by",
        ["owner_profiles"] = "id,note",
        ["customers"] = "id,note",
        ["staff_members"] = "id,hire_date,specialty,resignation_date",
        ["spa_services"] = "id,name,category,description,duration_minutes,price,image_url,status,created_at_utc,updated_at_utc,created_by,updated_by",
        ["service_packages"] = "id,name,description,price,validity_days,status,sale_start_date,sale_end_date,created_at_utc,updated_at_utc,created_by,updated_by",
        ["service_package_items"] = "id,spa_service_id,service_package_id,session_count,min_days_between_sessions,sort_order,note",
        ["staff_skills"] = "staff_member_id,spa_service_id",
        ["work_schedules"] = "id,staff_member_id,date,start_time,end_time,status",
        ["promotions"] = "id,code,description,discount_type,discount_value,min_order_amount,max_discount_amount,starts_at_utc,ends_at_utc,per_customer_limit,usage_limit,status",
        ["carts"] = "id,customer_id,created_at_utc,updated_at_utc,created_by,updated_by",
        ["cart_items"] = "id,cart_id,spa_service_id,service_package_id,unit_price,added_at_utc",
        ["orders"] = "id,code,customer_id,subtotal,discount_total,grand_total,status,note,payment_due_at_utc,created_at_utc,updated_at_utc,created_by,updated_by",
        ["order_items"] = "id,order_id,spa_service_id,service_package_id,product_name,unit_price,discount_amount,line_total,note",
        ["payments"] = "id,order_id,provider,amount,status,request_code,provider_transaction_id,payment_url,expires_at_utc,paid_at_utc,created_at_utc,updated_at_utc,created_by,updated_by",
        ["promotion_redemptions"] = "id,order_id,promotion_id,promotion_code,discount_amount,redeemed_at_utc",
        ["service_entitlements"] = "id,customer_id,order_item_id,expires_at_utc,status",
        ["customer_packages"] = "id,customer_id,order_item_id,package_name,purchased_at_utc,activated_at_utc,expires_at_utc,total_sessions,used_sessions,status",
        ["treatment_plans"] = "id,customer_package_id,primary_staff_member_id,start_date,expected_end_date,actual_end_date,goal,status,note",
        ["treatment_sessions"] = "id,treatment_plan_id,spa_service_id,sequence_number,service_name,duration_minutes,status,note,completed_at_utc",
        ["appointments"] = "id,customer_id,staff_member_id,service_entitlement_id,treatment_session_id,order_item_id,hold_expires_at_utc,date,start_time,end_time,status,cancelled_at_utc,cancellation_reason,note,created_at_utc",
        ["skin_profiles"] = "id,customer_id,assessed_by_staff_member_id,appointment_id,assessed_at_utc,skin_type,main_concerns,current_products,care_goals,recommended_treatment,note,created_at_utc,updated_at_utc,created_by,updated_by",
        ["customer_allergies"] = "id,customer_id,allergen,severity,note,recorded_at_utc",
        ["reviews"] = "id,customer_id,spa_service_id,service_package_id,comment,owner_reply,replied_at_utc,rating,image_url,status,created_at_utc,updated_at_utc,created_by,updated_by",
        ["ai_chat_messages"] = "id,customer_id,question,answer,created_at_utc",
        ["notifications"] = "id,user_id,title,body,type,read_at_utc,created_at_utc",
        ["otp_codes"] = "id,email,purpose,code_hash,pending_registration,failed_attempts,expires_at_utc,used_at_utc,created_at_utc",
        ["refresh_tokens"] = "id,user_id,token_hash,expires_at_utc,revoked_at_utc,created_at_utc",
        ["spa_profiles"] = "id,name,introduction,address,phone_number,opening_hours,policies",
    };

    public static TheoryData<string, string, string> EnumColumns => new()
    {
        { "users", "role", "customer,staff,owner" },
        { "users", "status", "active,locked,inactive" },
        { "users", "gender", "male,female,other" },
        { "spa_services", "status", "on_sale,discontinued" },
        { "service_packages", "status", "on_sale,discontinued" },
        { "work_schedules", "status", "active,cancelled" },
        { "promotions", "discount_type", "percentage,fixed_amount" },
        { "promotions", "status", "active,stopped" },
        { "orders", "status", "pending_payment,paid,cancelled,expired" },
        { "payments", "status", "pending,succeeded,failed,expired" },
        { "service_entitlements", "status", "available,booked,used,expired" },
        { "customer_packages", "status", "active,completed,expired,cancelled" },
        { "treatment_plans", "status", "not_started,in_progress,completed,paused,cancelled" },
        { "treatment_sessions", "status", "not_booked,booked,completed,skipped" },
        { "appointments", "status", "held,pending_confirmation,confirmed,completed,cancelled,no_show,hold_expired" },
        { "skin_profiles", "skin_type", "normal,dry,oily,combination,sensitive" },
        { "customer_allergies", "severity", "mild,moderate,severe" },
        { "reviews", "status", "visible,hidden" },
        { "notifications", "type", "appointment,payment,treatment,promotion,system" },
        { "otp_codes", "purpose", "registration,password_reset" },
    };

    [Fact]
    public void TablesAndColumnsMatchDataModelDocument()
    {
        using var context = CreateContext();
        var actual = Model(context).GetEntityTypes().ToDictionary(
            entity => entity.GetTableName()!,
            entity => Columns(entity).Select(pair => pair.Column).Order().ToArray());

        actual.Keys.Should().BeEquivalentTo(ExpectedColumns.Keys);
        foreach (var (table, columns) in ExpectedColumns)
            actual[table].Should().BeEquivalentTo(columns.Split(','), $"columns of {table} must match docs/domain/data-model.md");
    }

    [Theory]
    [MemberData(nameof(EnumColumns))]
    public void EnumColumnsAreSnakeCaseTextWithCheckConstraint(string table, string column, string values)
    {
        using var context = CreateContext();
        var entity = EntityFor(context, table);
        var property = Columns(entity).Single(pair => pair.Column == column).Property;

        // The design-time model only records the converter type; the runtime model carries the resolved mapping.
        var mapping = context.Model.FindEntityType(entity.Name)!.FindProperty(property.Name)!.GetTypeMapping();
        mapping.Converter.Should().NotBeNull();
        mapping.Converter!.GetType().GetGenericTypeDefinition().Should().Be(typeof(SnakeCaseEnumConverter<>));
        mapping.Converter.ProviderClrType.Should().Be<string>();
        property.GetColumnType().Should().Be($"character varying({AppDbContext.EnumMaxLength})");
        var check = entity.GetCheckConstraints().Single(constraint => constraint.Name == $"ck_{table}_{column}");
        foreach (var value in values.Split(','))
            check.Sql.Should().Contain($"'{value}'");
    }

    [Fact]
    public void EnumConverterRoundTripsSnakeCaseValues()
    {
        SnakeCaseEnumConverter<AppointmentStatus>.ToProvider(AppointmentStatus.PendingConfirmation).Should().Be("pending_confirmation");
        SnakeCaseEnumConverter<OrderStatus>.FromProvider("pending_payment").Should().Be(OrderStatus.PendingPayment);
        foreach (var status in Enum.GetValues<AppointmentStatus>())
            SnakeCaseEnumConverter<AppointmentStatus>.FromProvider(SnakeCaseEnumConverter<AppointmentStatus>.ToProvider(status)).Should().Be(status);
        FluentActions.Invoking(() => SnakeCaseEnumConverter<OrderStatus>.FromProvider("PendingPayment")).Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData("users", "email", "citext")]
    [InlineData("orders", "grand_total", "numeric(12,0)")]
    [InlineData("promotions", "discount_value", "numeric(12,2)")]
    [InlineData("appointments", "date", "date")]
    [InlineData("appointments", "start_time", "time without time zone")]
    [InlineData("appointments", "hold_expires_at_utc", "timestamp with time zone")]
    [InlineData("otp_codes", "pending_registration", "jsonb")]
    [InlineData("users", "full_name", "character varying(100)")]
    public void ColumnTypesFollowDatabaseConventions(string table, string column, string storeType)
    {
        using var context = CreateContext();
        Columns(EntityFor(context, table)).Single(pair => pair.Column == column).Property.GetColumnType().Should().Be(storeType);
    }

    [Fact]
    public void ForeignKeysRestrictDeletesExceptCartItems()
    {
        using var context = CreateContext();
        foreach (var foreignKey in Model(context).GetEntityTypes().SelectMany(entity => entity.GetForeignKeys()))
        {
            var expected = foreignKey.DeclaringEntityType.GetTableName() == "cart_items" && foreignKey.PrincipalEntityType.GetTableName() == "carts"
                ? DeleteBehavior.Cascade
                : DeleteBehavior.Restrict;
            foreignKey.DeleteBehavior.Should().Be(expected, $"{foreignKey.DeclaringEntityType.GetTableName()} → {foreignKey.PrincipalEntityType.GetTableName()}");
        }
    }

    [Fact]
    public void ModelHasNoChangesMissingFromMigrations()
    {
        using var context = CreateContext();
        context.Database.GetMigrations().Should().NotBeEmpty();
        context.Database.HasPendingModelChanges().Should().BeFalse("run dotnet ef migrations add after changing entities or configurations");
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>();
        DependencyInjection.ConfigureDbContext(options, "Host=localhost;Database=model_only");
        return new AppDbContext(options.Options);
    }

    private static IModel Model(AppDbContext context) => context.GetService<IDesignTimeModel>().Model;

    private static IEntityType EntityFor(AppDbContext context, string table) =>
        Model(context).GetEntityTypes().Single(entity => entity.GetTableName() == table);

    private static IEnumerable<(string Column, IProperty Property)> Columns(IEntityType entity)
    {
        var store = StoreObjectIdentifier.Table(entity.GetTableName()!, entity.GetSchema());
        return entity.GetProperties().Select(property => (property.GetColumnName(store)!, property));
    }
}

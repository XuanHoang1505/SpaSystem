using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence.Conversions;

namespace NhuNguyetSpa.Infrastructure.Persistence;

/// <summary>EF Core context for the schema in docs/domain/data-model.md (PostgreSQL, snake_case names).</summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public const int EnumMaxLength = 30;

    public DbSet<User> Users => Set<User>();
    public DbSet<OwnerProfile> OwnerProfiles => Set<OwnerProfile>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<StaffMember> StaffMembers => Set<StaffMember>();
    public DbSet<SpaService> SpaServices => Set<SpaService>();
    public DbSet<ServicePackage> ServicePackages => Set<ServicePackage>();
    public DbSet<ServicePackageItem> ServicePackageItems => Set<ServicePackageItem>();
    public DbSet<StaffSkill> StaffSkills => Set<StaffSkill>();
    public DbSet<WorkSchedule> WorkSchedules => Set<WorkSchedule>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<PromotionRedemption> PromotionRedemptions => Set<PromotionRedemption>();
    public DbSet<ServiceEntitlement> ServiceEntitlements => Set<ServiceEntitlement>();
    public DbSet<CustomerPackage> CustomerPackages => Set<CustomerPackage>();
    public DbSet<TreatmentPlan> TreatmentPlans => Set<TreatmentPlan>();
    public DbSet<TreatmentSession> TreatmentSessions => Set<TreatmentSession>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<SkinProfile> SkinProfiles => Set<SkinProfile>();
    public DbSet<CustomerAllergy> CustomerAllergies => Set<CustomerAllergy>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<AiChatMessage> AiChatMessages => Set<AiChatMessage>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<SpaProfile> SpaProfiles => Set<SpaProfile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // citext: case-insensitive email; btree_gist: uuid equality inside the appointments EXCLUDE constraint (ADR-0003).
        modelBuilder.HasPostgresExtension("citext");
        modelBuilder.HasPostgresExtension("btree_gist");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Every Domain enum is stored as snake_case text, matching the JSON contract and the CHECK constraints.
        var enumTypes = typeof(UserRole).Assembly.GetTypes().Where(type => type.IsEnum && type.Namespace == typeof(UserRole).Namespace);
        foreach (var enumType in enumTypes)
        {
            configurationBuilder.Properties(enumType)
                .HaveConversion(typeof(SnakeCaseEnumConverter<>).MakeGenericType(enumType))
                .HaveMaxLength(EnumMaxLength);
        }
    }
}

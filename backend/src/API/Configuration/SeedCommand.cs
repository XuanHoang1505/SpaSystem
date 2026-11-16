using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;
using NhuNguyetSpa.Infrastructure.Persistence.Seeds;

namespace NhuNguyetSpa.API.Configuration;

/// <summary>
/// <c>dotnet run --project backend/src/API -- --seed-dev</c> (npm run db:seed): seeds the owner account, then exits. With
/// <c>--seed-demo</c> (npm run db:seed:demo) it also recreates the demo catalog, staff, customers and purchases (<see cref="DemoDataSeeder"/>).
/// <c>--seed-catalog</c> (npm run db:seed:catalog) only creates or resets the sample catalog (<see cref="CatalogDataSeeder"/>).
/// </summary>
public static class SeedCommand
{
    public const string Argument = "--seed-dev";
    public const string DemoArgument = "--seed-demo";
    public const string CatalogArgument = "--seed-catalog";
    public const string SeedNotificationsArgument = "--seed-notifications";

    /// <summary>Sample categories, services and packages for testing the catalog screens; no account is needed.</summary>
    public static async Task RunCatalogAsync(WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);
        if (!app.Environment.IsDevelopment())
        {
            app.Logger.LogError("{Argument} only runs in the Development environment (current: {Environment})",
                CatalogArgument, app.Environment.EnvironmentName);
            Environment.ExitCode = 1;
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<CatalogDataSeeder>().SeedAsync(CancellationToken.None);
    }

    public static async Task RunAsync(WebApplication app, bool withDemo = false)
    {
        ArgumentNullException.ThrowIfNull(app);
        if (!app.Environment.IsDevelopment())
        {
            app.Logger.LogError("{Argument} only runs in the Development environment (current: {Environment})",
                Argument, app.Environment.EnvironmentName);
            Environment.ExitCode = 1;
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        try
        {
            var outcome = await scope.ServiceProvider.GetRequiredService<DevelopmentSeeder>().SeedOwnerAsync(CancellationToken.None);
            app.Logger.LogInformation("Development seed finished: owner {Outcome}", outcome);
            if (withDemo)
                await scope.ServiceProvider.GetRequiredService<DemoDataSeeder>().SeedAsync(CancellationToken.None);
        }
        catch (InvalidOperationException exception)
        {
            app.Logger.LogError("Development seed failed: {Reason}", exception.Message);
            Environment.ExitCode = 1;
        }
    }

    public static async Task SeedCustomerNotificationsAsync(WebApplication app, string email)
    {
        ArgumentNullException.ThrowIfNull(app);
        if (!app.Environment.IsDevelopment())
        {
            app.Logger.LogError("{Argument} only runs in the Development environment (current: {Environment})",
                SeedNotificationsArgument, app.Environment.EnvironmentName);
            Environment.ExitCode = 1;
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            app.Logger.LogInformation("Account {Email} not found. Creating customer user...", email);
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
            var options = scope.ServiceProvider.GetRequiredService<IOptions<SeedOptions>>();
            var password = options.Value.DemoPassword ?? options.Value.OwnerPassword ?? "Spa123456";
            user = new User
            {
                FullName = "Khách Hàng (customer@gmail.com)",
                Email = email,
                PhoneNumber = "0909999888",
                PasswordHash = hasher.Hash(password),
                Role = UserRole.Customer,
                Status = UserStatus.Active,
            };
            context.Users.Add(user);
            context.Customers.Add(new Customer { Id = user.Id });
            await context.SaveChangesAsync();
            app.Logger.LogInformation("Customer account {Email} created (Id: {Id})", email, user.Id);
        }

        var now = DateTime.UtcNow;
        var sampleNotifications = new List<Notification>
        {
            // 1. Nhắc lịch hẹn ngày mai (Chưa đọc)
            Notification.Create(
                user.Id,
                NotificationType.Appointment,
                "Nhắc lịch hẹn ngày mai",
                "Bạn có lịch hẹn Chăm sóc da chuyên sâu lúc 14:00 ngày mai. Vui lòng đến trước 10 phút để được đón tiếp chu đáo nhất!",
                null,
                $"seed_reminder_{user.Id}_{now.Ticks}_1",
                now.AddMinutes(-15)
            ),
            // 2. Thanh toán thành công (Chưa đọc)
            Notification.Create(
                user.Id,
                NotificationType.Payment,
                "Thanh toán thành công",
                "Đơn hàng ĐH-88231 đã thanh toán thành công 850.000 đ qua VNPay. Cảm ơn quý khách đã tin tưởng dịch vụ của Như Nguyệt Spa.",
                null,
                $"seed_payment_{user.Id}_{now.Ticks}_2",
                now.AddHours(-2)
            ),
            // 3. Xác nhận đặt lịch (Chưa đọc)
            Notification.Create(
                user.Id,
                NotificationType.Appointment,
                "Lịch hẹn đã được xác nhận",
                "Lịch hẹn Massage cổ vai gáy thảo dược lúc 10:00 ngày 18/11/2026 với kỹ thuật viên Nguyễn Thị An đã được xác nhận.",
                null,
                $"seed_apt_{user.Id}_{now.Ticks}_3",
                now.AddHours(-5)
            ),
            // 4. Liệu trình chăm sóc (Đã đọc)
            Notification.Create(
                user.Id,
                NotificationType.Treatment,
                "Hoàn thành buổi chăm sóc",
                "Buổi 2/5 liệu trình Trị mụn chuyên sâu của bạn đã hoàn thành. Hãy uống đủ nước và thoa serum phục hồi đều đặn nhé!",
                null,
                $"seed_trt_{user.Id}_{now.Ticks}_4",
                now.AddDays(-1)
            ),
            // 5. Khuyến mãi đặc quyền (Đã đọc)
            Notification.Create(
                user.Id,
                NotificationType.Promotion,
                "Ưu đãi đặc quyền thành viên",
                "Tặng bạn mã GIAM20 giảm 20% cho tất cả các dịch vụ chăm sóc da mặt cao cấp trong tuần lễ tri ân khách hàng.",
                null,
                $"seed_promo_{user.Id}_{now.Ticks}_5",
                now.AddDays(-2)
            ),
            // 6. Tin hệ thống chào mừng (Đã đọc)
            Notification.Create(
                user.Id,
                NotificationType.System,
                "Chào mừng bạn đến với Như Nguyệt Spa",
                "Tài khoản của bạn đã được kích hoạt thành công. Trải nghiệm ngay các dịch vụ thư giãn và chăm sóc sắc đẹp đẳng cấp.",
                null,
                $"seed_sys_{user.Id}_{now.Ticks}_6",
                now.AddDays(-3)
            ),
        };

        sampleNotifications[3].MarkRead(now.AddHours(-12));
        sampleNotifications[4].MarkRead(now.AddDays(-1));
        sampleNotifications[5].MarkRead(now.AddDays(-2));

        // The audit interceptor stamps CreatedAtUtc = now on insert, so the staggered times are written back in a second save.
        var createdTimes = sampleNotifications.Select(notification => notification.CreatedAtUtc).ToList();
        context.Notifications.AddRange(sampleNotifications);
        await context.SaveChangesAsync();
        for (var i = 0; i < sampleNotifications.Count; i++)
            sampleNotifications[i].CreatedAtUtc = createdTimes[i];
        await context.SaveChangesAsync();
        app.Logger.LogInformation("Seeded {Count} notifications for {Email} ({Unread} unread)", sampleNotifications.Count, email, 3);
    }
}

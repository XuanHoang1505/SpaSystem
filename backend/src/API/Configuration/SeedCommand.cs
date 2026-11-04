using NhuNguyetSpa.Infrastructure.Persistence.Seeds;

namespace NhuNguyetSpa.API.Configuration;

/// <summary>
/// <c>dotnet run --project backend/src/API -- --seed-dev</c> (npm run db:seed): seeds the owner account, then exits. With
/// <c>--seed-demo</c> (npm run db:seed:demo) it also recreates the demo catalog, staff, customers and purchases (<see cref="DemoDataSeeder"/>).
/// </summary>
public static class SeedCommand
{
    public const string Argument = "--seed-dev";
    public const string DemoArgument = "--seed-demo";

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
}

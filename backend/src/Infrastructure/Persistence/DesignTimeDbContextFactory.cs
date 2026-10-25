using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace NhuNguyetSpa.Infrastructure.Persistence;

/// <summary>
/// Used by <c>dotnet ef</c> only. Reads <c>CONNECTION_STRING</c> from the environment or from
/// <c>backend/src/API/.env</c> (the same file the API loads through EnvLoader).
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    private const string ConnectionStringVariable = "CONNECTION_STRING";

    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable(ConnectionStringVariable)
            ?? ReadFromEnvFile()
            ?? throw new InvalidOperationException(
                $"{ConnectionStringVariable} is not set. Copy backend/src/API/.env.example to .env before running EF migrations.");

        var options = new DbContextOptionsBuilder<AppDbContext>();
        DependencyInjection.ConfigureDbContext(options, connectionString);
        return new AppDbContext(options.Options);
    }

    private static string? ReadFromEnvFile()
    {
        var cwd = Directory.GetCurrentDirectory();
        var candidates = new[]
        {
            Path.Combine(cwd, ".env"),
            Path.Combine(cwd, "backend", "src", "API", ".env"),
            Path.Combine(cwd, "src", "API", ".env"),
            Path.Combine(cwd, "..", "API", ".env"),
        };
        var envFile = candidates.Select(Path.GetFullPath).FirstOrDefault(File.Exists);
        if (envFile is null) return null;

        return DotNetEnv.Env.NoEnvVars().Load(envFile)
            .Where(pair => pair.Key == ConnectionStringVariable)
            .Select(pair => pair.Value)
            .LastOrDefault();
    }
}

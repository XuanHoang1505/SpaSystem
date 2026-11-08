using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Infrastructure;
using NhuNguyetSpa.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Infrastructure;

/// <summary>One PostgreSQL 17 container per test run with all migrations applied. Requires Docker.</summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();

    public AppDbContext CreateContext() => CreateContext(database: null);

    /// <summary>A context on another database of the same container (for migration tests on an empty database).</summary>
    public AppDbContext CreateContext(string? database)
    {
        var connectionString = database is null
            ? ConnectionString
            : new Npgsql.NpgsqlConnectionStringBuilder(ConnectionString) { Database = database }.ConnectionString;
        var options = new DbContextOptionsBuilder<AppDbContext>();
        DependencyInjection.ConfigureDbContext(options, connectionString);
        return new AppDbContext(options.Options);
    }
}

[CollectionDefinition(Name)]
public sealed class PostgresCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "postgres";
}

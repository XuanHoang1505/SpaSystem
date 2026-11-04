using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests;

/// <summary>
/// Once the operation inside <c>ExecuteInTransactionAsync</c> has finished (for staff creation: the credentials mail is sent),
/// a request cancelled at that moment must not roll the work back (docs/specs/staff.md, BR-STF-08).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class UnitOfWorkTransactionTests
{
    private readonly PostgresFixture _postgres;

    public UnitOfWorkTransactionTests(PostgresFixture postgres) => _postgres = postgres;

    [Fact]
    public async Task CancellationAfterTheOperationStillCommits()
    {
        using var cancellation = new CancellationTokenSource();
        var service = new SpaService { Name = "Giao dịch " + Guid.NewGuid().ToString("N")[..8], Category = "Kiểm tra", DurationMinutes = 30, Price = 1 };
        await using (var context = _postgres.CreateContext())
        {
            var unitOfWork = new UnitOfWork(context);
            await unitOfWork.ExecuteInTransactionAsync(async token =>
            {
                context.SpaServices.Add(service);
                await unitOfWork.SaveChangesAsync(token);
                // The side effect (mail) is done; the client disconnects right now.
                await cancellation.CancelAsync();
            }, cancellation.Token);
        }

        await using var check = _postgres.CreateContext();
        (await check.SpaServices.AnyAsync(row => row.Id == service.Id)).Should().BeTrue();
    }
}

using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.UseCases.AiAssistant;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Bookings;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.AiAssistant;

/// <summary>
/// <c>POST /ai/chat</c> and <c>GET /me/ai/history</c> end to end with <see cref="FakeAiChatModel"/>
/// (docs/specs/ai-assistant.md: AI-T01…T03, T05, T07, T08, T10, T11, T17, T18).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class AiAssistantEndpointsTests : IAsyncLifetime
{
    private const string Chat = "/api/v1/ai/chat";
    private const string History = "/api/v1/me/ai/history";

    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CustomerBookingApi _booking = null!;

    public AiAssistantEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    private CatalogApi Api => _booking.Api;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _booking = new CustomerBookingApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        Api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task GuestChat()
    {
        var before = await CountMessagesAsync();

        var (response, body) = await AskAsync("Spa có dịch vụ gì?");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("answer").GetString().Should().Be("Chào bạn");
        data.GetProperty("saved").GetBoolean().Should().BeFalse();
        (await CountMessagesAsync()).Should().Be(before);
        _factory.Ai.Requests.Last().Tools.Should().HaveCount(6);
    }

    [Fact]
    public async Task CustomerChatAndHistory()
    {
        var (token, customerId) = await _booking.Booking.LoginCustomerAsync();
        var (other, _) = await _booking.Booking.LoginCustomerAsync();

        var (first, firstBody) = await AskAsync("Câu một", token);
        _factory.Clock.Offset += TimeSpan.FromMinutes(1);
        await AskAsync("Câu hai", token);

        first.StatusCode.Should().Be(HttpStatusCode.OK);
        CatalogApi.Data(firstBody).GetProperty("saved").GetBoolean().Should().BeTrue();
        CatalogApi.Data(firstBody).GetProperty("messageId").GetGuid().Should().NotBeEmpty();
        _factory.Ai.Requests.Last().History.Should().ContainSingle().Which.Question.Should().Be("Câu một");

        var (page1Response, page1) = await Api.GetAsync(History + "?limit=1", token);
        page1Response.StatusCode.Should().Be(HttpStatusCode.OK);
        var newest = CatalogApi.Data(page1).GetProperty("items")[0];
        newest.GetProperty("question").GetString().Should().Be("Câu hai");
        CatalogApi.Data(page1).GetProperty("hasMore").GetBoolean().Should().BeTrue();

        var cursor = Uri.EscapeDataString(newest.GetProperty("createdAtUtc").GetString()!);
        var (_, page2) = await Api.GetAsync($"{History}?limit=1&before={cursor}", token);
        CatalogApi.Data(page2).GetProperty("items")[0].GetProperty("question").GetString().Should().Be("Câu một");
        CatalogApi.Data(page2).GetProperty("hasMore").GetBoolean().Should().BeFalse();

        var (_, otherPage) = await Api.GetAsync(History, other);
        CatalogApi.Data(otherPage).GetProperty("items").GetArrayLength().Should().Be(0);
        customerId.Should().NotBeEmpty();
    }

    [Fact]
    public async Task PackagesToolUsesJwtCustomer()
    {
        var (token, customerA) = await _booking.Booking.LoginCustomerAsync();
        var (_, customerB) = await _booking.Booking.LoginCustomerAsync();
        var service = await Api.SeedServiceAsync(CatalogApi.NewTag() + " da mặt");
        var packageA = await Api.SeedPackageAsync(CatalogApi.NewTag() + " gói A", [service]);
        var packageB = await Api.SeedPackageAsync(CatalogApi.NewTag() + " gói B", [service]);
        await _booking.Purchases.SeedPackageAsync(customerA, packageA, [service], [TreatmentSessionStatus.Completed]);
        await _booking.Purchases.SeedPackageAsync(customerB, packageB, [service]);
        _factory.Ai.CallThenAnswer([("list_my_packages", new { })], "in_scope", "Bạn còn buổi.");

        var (response, _) = await AskAsync("Gói của tôi còn mấy buổi?", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = JsonDocument.Parse(_factory.Ai.ToolResults.Last().Result).RootElement;
        var packages = result.GetProperty("packages").EnumerateArray().ToList();
        packages.Should().ContainSingle().Which.GetProperty("packageName").GetString().Should().Be(packageA.Name);
        packages[0].GetProperty("usedSessions").GetInt32().Should().Be(1);
        packages[0].GetProperty("remainingSessions").GetInt32().Should().Be(packages[0].GetProperty("totalSessions").GetInt32() - 1);
    }

    [Fact]
    public async Task SuggestionsAndProposalsEndToEnd()
    {
        var (service, _) = await _booking.SeedServiceWithStaffAsync();
        var day = BookingApi.D(CustomerBookingApi.Day);
        var appointments = await CountAsync(context => context.Appointments.CountAsync());
        var orders = await CountAsync(context => context.Orders.CountAsync());
        _factory.Ai.CallThenAnswer([
            ("suggest_products", new { items = new[] { new { productType = "service", id = service.Id } } }),
            ("find_available_slots", new { serviceId = service.Id, date = day }),
            ("propose_booking", new { spaServiceId = service.Id, date = day, startTime = "09:00" }),
        ], "in_scope", "Mời bạn bấm thẻ để đặt lịch.");

        var (response, body) = await AskAsync("Đặt giúp tôi lúc 9 giờ");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = CatalogApi.Data(body);
        data.GetProperty("suggestions")[0].GetProperty("path").GetString().Should().Be($"/services/{service.Id}");
        var proposal = data.GetProperty("bookingProposals")[0];
        proposal.GetProperty("kind").GetString().Should().Be("book_now");
        proposal.GetProperty("startTime").GetString().Should().Be("09:00");
        proposal.GetProperty("path").GetString().Should().Be($"/booking/new?serviceId={service.Id}&date={day}&startTime=09:00");
        (await CountAsync(context => context.Appointments.CountAsync())).Should().Be(appointments);
        (await CountAsync(context => context.Orders.CountAsync())).Should().Be(orders);
    }

    [Fact]
    public async Task MedicalCanned()
    {
        var (service, _) = await _booking.SeedServiceWithStaffAsync();
        _factory.Ai.CallThenAnswer([("suggest_products", new { items = new[] { new { productType = "service", id = service.Id } } })],
            "medical", "Bạn nên bôi kem X.");

        var (_, body) = await AskAsync("Mụn mủ sưng đau nên uống thuốc gì?");

        var data = CatalogApi.Data(body);
        data.GetProperty("answer").GetString().Should().Be(AiCannedAnswers.Medical);
        data.GetProperty("suggestions").GetArrayLength().Should().Be(0);
        data.GetProperty("bookingProposals").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Unavailable()
    {
        var (token, _) = await _booking.Booking.LoginCustomerAsync();
        var before = await CountMessagesAsync();
        _factory.Ai.Throw(AiErrors.Unavailable());

        var (response, body) = await AskAsync("Xin chào", token);

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        CatalogApi.ErrorCode(body).Should().Be("ai_unavailable");
        (await CountMessagesAsync()).Should().Be(before);
    }

    [Fact]
    public async Task Validation()
    {
        var (response, body) = await AskAsync("   ");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.RootElement.GetProperty("message").GetString().Should().Be("Validation failed.");
        var error = body.RootElement.GetProperty("errors")[0];
        error.GetProperty("field").GetString().Should().Be("Question");
        error.GetProperty("message").GetString().Should().Be("Vui lòng nhập câu hỏi.");
    }

    [Fact]
    public async Task Permissions()
    {
        var (staff, _) = await _booking.Booking.LoginStaffAsync();
        var owner = await Api.LoginAsync(UserRole.Owner);
        var (customer, _) = await _booking.Booking.LoginCustomerAsync();

        foreach (var bearer in new[] { staff, owner })
        {
            var (chat, chatBody) = await AskAsync("Xin chào", bearer);
            chat.StatusCode.Should().Be(HttpStatusCode.Forbidden);
            CatalogApi.ErrorCode(chatBody).Should().Be("forbidden");
            (await Api.GetAsync(History, bearer)).Response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
        (await Api.GetAsync(History)).Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var (tooMany, tooManyBody) = await Api.GetAsync(History + "?limit=51", customer);
        tooMany.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        tooManyBody.RootElement.GetProperty("errors")[0].GetProperty("field").GetString().Should().Be("Limit");
    }

    private Task<(HttpResponseMessage Response, JsonDocument Body)> AskAsync(string question, string? bearer = null) =>
        Api.SendJsonAsync(HttpMethod.Post, Chat, new { question }, bearer);

    private Task<int> CountMessagesAsync() => CountAsync(context => context.AiChatMessages.CountAsync());

    private async Task<int> CountAsync(Func<NhuNguyetSpa.Infrastructure.Persistence.AppDbContext, Task<int>> count)
    {
        await using var context = _postgres.CreateContext();
        return await count(context);
    }
}

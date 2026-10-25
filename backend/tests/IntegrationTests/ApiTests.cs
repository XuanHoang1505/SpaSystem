using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NhuNguyetSpa.API.Contracts;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Interfaces;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests;

public sealed class ApiTests
{
    [Fact]
    public async Task PingUsesInjectedUtcClockAndResponseContract()
    {
        var clock = Substitute.For<IDateTimeProvider>();
        var now = new DateTime(2026, 10, 4, 0, 0, 0, DateTimeKind.Utc);
        clock.UtcNow.Returns(now);
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureServices(services => services.Replace(ServiceDescriptor.Singleton(clock)));
        });
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        var response = await client.GetAsync("/api/v1/system/ping");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<SystemStatusResponse>>();
        body.Should().NotBeNull();
        body?.Success.Should().BeTrue();
        body?.Message.Should().Be("Nhu Nguyet Spa API is running");
        body?.Data?.UtcTime.Should().Be(now);
        body?.Errors.Should().BeEmpty();
        body?.TraceId.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ReadinessReportsUnhealthyWhenDatabaseIsUnreachable()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("ConnectionStrings:Default", "Host=127.0.0.1;Port=1;Database=none;Username=none;Password=none;Timeout=1");
        });
        using var client = factory.CreateClient();

        var live = await client.GetAsync("/health/live");
        var ready = await client.GetAsync("/health/ready");

        live.StatusCode.Should().Be(HttpStatusCode.OK);
        ready.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        (await ready.Content.ReadFromJsonAsync<HealthResponse>())?.Status.Should().Be("Unhealthy");
    }

    [Theory]
    [InlineData("/health/live")]
    [InlineData("/swagger/index.html")]
    [InlineData("/swagger/v1/swagger.json")]
    public async Task FoundationEndpointsAreAvailableInDevelopment(string path)
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder.UseEnvironment("Development"));
        using var client = factory.CreateClient();
        (await client.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UnknownEndpointsReturnUnifiedErrorAndProductionHidesSwagger()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder.UseEnvironment("Production"));
        using var client = factory.CreateClient();
        foreach (var path in new[] { "/missing", "/swagger/index.html" })
        {
            var response = await client.GetAsync(path);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var body = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            body?.Success.Should().BeFalse();
            body?.TraceId.Should().NotBeNullOrEmpty();
        }
    }

    [Fact]
    public async Task CorsAllowsConfiguredOriginOnly()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder.UseEnvironment("Development"));
        using var client = factory.CreateClient();
        foreach (var origin in new[] { "http://localhost:5173", "https://unconfigured.example" })
        {
            using var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/system/ping");
            request.Headers.Add("Origin", origin);
            request.Headers.Add("Access-Control-Request-Method", "GET");
            var response = await client.SendAsync(request);
            response.Headers.Contains("Access-Control-Allow-Origin").Should().Be(origin == "http://localhost:5173");
        }
    }
}

using System.Text.Json;
using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using NhuNguyetSpa.API.Middlewares;
using NhuNguyetSpa.Domain.Exceptions;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests;

public sealed class ExceptionMiddlewareTests
{
    [Theory]
    [InlineData("validation", 400)]
    [InlineData("business", 400)]
    [InlineData("missing", 404)]
    [InlineData("conflict", 409)]
    [InlineData("unauthorized", 401)]
    [InlineData("unauthenticated", 401)]
    [InlineData("forbidden", 403)]
    [InlineData("unexpected", 500)]
    public async Task MiddlewareMapsExceptionsAndDoesNotExposeInternalDetails(string kind, int status)
    {
        Exception exception = kind switch
        {
            "validation" => new ValidationException([new ValidationFailure("Name", "Name is required")]),
            "business" => new BusinessRuleException("Invalid operation"),
            "missing" => new NotFoundException("Resource missing"),
            "conflict" => new ConflictException("Resource conflict"),
            "unauthorized" => new UnauthorizedAccessException("private auth detail"),
            "unauthenticated" => new UnauthorizedException("Sai thông tin", "invalid_credentials"),
            "forbidden" => new ForbiddenException("Đã khóa", "account_locked"),
            _ => new InvalidOperationException("private stack detail")
        };
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = new ExceptionHandlingMiddleware(_ => Task.FromException(exception), NullLogger<ExceptionHandlingMiddleware>.Instance);
        await middleware.InvokeAsync(context);
        context.Response.StatusCode.Should().Be(status);
        context.Response.Body.Position = 0;
        var text = await new StreamReader(context.Response.Body).ReadToEndAsync();
        text.Should().NotContain("private").And.NotContain("stackTrace");
        using var body = JsonDocument.Parse(text);
        body.RootElement.GetProperty("success").GetBoolean().Should().BeFalse();
        body.RootElement.GetProperty("errors").GetArrayLength().Should().BeGreaterThan(0);
        body.RootElement.GetProperty("traceId").GetString().Should().NotBeNullOrEmpty();
    }

    [Theory]
    [InlineData(401, "invalid_credentials", "Email/số điện thoại hoặc mật khẩu không đúng.")]
    [InlineData(403, "account_locked", "Tài khoản đã bị khóa. Vui lòng liên hệ spa.")]
    public async Task MiddlewareReturnsAuthErrorCodesAndMessages(int status, string code, string message)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        Exception exception = status == 401 ? new UnauthorizedException(message, code) : new ForbiddenException(message, code);
        var middleware = new ExceptionHandlingMiddleware(_ => Task.FromException(exception), NullLogger<ExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(status);
        context.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(context.Response.Body);
        body.RootElement.GetProperty("message").GetString().Should().Be(message);
        var error = body.RootElement.GetProperty("errors")[0];
        error.GetProperty("code").GetString().Should().Be(code);
        error.GetProperty("message").GetString().Should().Be(message);
    }

    [Theory]
    [InlineData(503, "email_send_failed")]
    [InlineData(429, "rate_limited")]
    public async Task MiddlewareMapsUnavailableAndTooManyRequests(int status, string code)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        Exception exception = status == 503
            ? new ServiceUnavailableException("Không gửi được email.", code)
            : new TooManyRequestsException("Vui lòng chờ 30 giây.", code);
        var middleware = new ExceptionHandlingMiddleware(_ => Task.FromException(exception), NullLogger<ExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(status);
        context.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(context.Response.Body);
        body.RootElement.GetProperty("errors")[0].GetProperty("code").GetString().Should().Be(code);
    }

    [Theory]
    [InlineData(null, "conflict")]
    [InlineData("slot_unavailable", "slot_unavailable")]
    public async Task MiddlewareUsesSpecificDomainErrorCodeWhenProvided(string? code, string expectedCode)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var exception = new ConflictException("Khung giờ này vừa có người đặt.", code);
        var middleware = new ExceptionHandlingMiddleware(_ => Task.FromException(exception), NullLogger<ExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(409);
        context.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(context.Response.Body);
        var error = body.RootElement.GetProperty("errors")[0];
        error.GetProperty("code").GetString().Should().Be(expectedCode);
        error.GetProperty("message").GetString().Should().Be("Khung giờ này vừa có người đặt.");
    }

    [Fact]
    public async Task MiddlewareMapsOversizedRequestBodyTo413()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var exception = new BadHttpRequestException("Request body too large.", StatusCodes.Status413PayloadTooLarge);
        var middleware = new ExceptionHandlingMiddleware(_ => Task.FromException(exception), NullLogger<ExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(413);
        context.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(context.Response.Body);
        body.RootElement.GetProperty("errors")[0].GetProperty("code").GetString().Should().Be("request_too_large");
    }
}

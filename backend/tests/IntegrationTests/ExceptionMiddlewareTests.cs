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
}

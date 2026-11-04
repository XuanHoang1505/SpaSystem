using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.API.Extensions;
using NhuNguyetSpa.API.Responses;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests;

/// <summary>
/// An image upload over the request limit must answer 413 request_too_large (catalog spec E6). TestServer does not enforce
/// [RequestSizeLimit], so the model-state path that MVC form binding takes on real Kestrel is exercised directly.
/// </summary>
public sealed class RequestTooLargeTests
{
    public static TheoryData<Exception> OversizedBodyErrors => new()
    {
        new BadHttpRequestException("Request body too large.", StatusCodes.Status413PayloadTooLarge),
        new IOException("Failed to read the request form.", new BadHttpRequestException("Request body too large.", StatusCodes.Status413PayloadTooLarge)),
        new InvalidDataException("Multipart body length limit 10485760 exceeded."),
    };

    [Theory]
    [MemberData(nameof(OversizedBodyErrors))]
    public void InvalidModelStateCausedByOversizedBodyReturns413(Exception exception)
    {
        var context = ActionContextWithError(exception);

        var result = Factory()(context).Should().BeOfType<ObjectResult>().Subject;

        result.StatusCode.Should().Be(StatusCodes.Status413PayloadTooLarge);
        result.Value.Should().BeOfType<ApiResponse<object>>().Which.Errors.Should().ContainSingle().Which.Code.Should().Be("request_too_large");
    }

    [Fact]
    public void ModelStateMessageFromKestrelReturns413()
    {
        // What real Kestrel + MVC form binding leave behind: no exception, only this message.
        var context = new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor());
        context.ModelState.TryAddModelError(string.Empty,
            "Failed to read the request form. Request body too large. The max request body size is 10485760 bytes.");

        Factory()(context).Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(StatusCodes.Status413PayloadTooLarge);
    }

    [Fact]
    public void OtherModelStateErrorsStay400()
    {
        var result = Factory()(ActionContextWithError(new FormatException("bad"))).Should().BeOfType<BadRequestObjectResult>().Subject;

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    private static Func<ActionContext, IActionResult> Factory()
    {
        var services = new ServiceCollection();
        services.AddApiFoundation(new ConfigurationBuilder().Build());
        return services.BuildServiceProvider().GetRequiredService<IOptions<ApiBehaviorOptions>>().Value.InvalidModelStateResponseFactory;
    }

    private static ActionContext ActionContextWithError(Exception exception)
    {
        var context = new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor());
        context.ModelState.TryAddModelException(string.Empty, exception);
        return context;
    }
}

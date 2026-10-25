using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using NhuNguyetSpa.API.Contracts;
using NhuNguyetSpa.Infrastructure;
using NhuNguyetSpa.API.Middlewares;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;

namespace NhuNguyetSpa.API.Extensions;

public static class ApplicationBuilderExtensions
{
    public static IApplicationBuilder UseApiExceptionHandling(this IApplicationBuilder app) => app.UseMiddleware<ExceptionHandlingMiddleware>();

    public static IEndpointRouteBuilder MapApiHealthChecks(this IEndpointRouteBuilder endpoints)
    {
        static Task WriteStatus(HttpContext context, HealthReport report) =>
            context.Response.WriteAsJsonAsync(new HealthResponse(report.Status.ToString()), context.RequestAborted);

        // Liveness only proves the process answers; readiness also requires the database.
        endpoints.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false, ResponseWriter = WriteStatus });
        endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains(DependencyInjection.ReadinessTag),
            ResponseWriter = WriteStatus,
        });
        return endpoints;
    }

    public static IApplicationBuilder UseApiStatusCodes(this IApplicationBuilder app) => app.UseStatusCodePages(async statusContext =>
    {
        var context = statusContext.HttpContext;
        var message = context.Response.StatusCode == 404 ? "Endpoint not found." : "The request could not be completed.";
        await context.Response.WriteAsJsonAsync(new ApiResponse<object>(false, message, null,
            [new ErrorDetail("http_error", message)], context.TraceIdentifier), context.RequestAborted);
    });
}

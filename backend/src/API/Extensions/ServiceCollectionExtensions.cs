using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.API.Services;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;

namespace NhuNguyetSpa.API.Extensions;

public static class ServiceCollectionExtensions
{
    public const string CorsPolicy = "Frontend";

    public static IServiceCollection AddApiFoundation(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddControllers().AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            // Enums travel as snake_case strings, the same values stored in the database (docs/conventions/api.md).
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
        });
        services.Configure<ApiBehaviorOptions>(options => options.InvalidModelStateResponseFactory = context =>
        {
            if (context.ModelState.Values.SelectMany(entry => entry.Errors).Any(error => PayloadTooLarge.Matches(error.Exception) || PayloadTooLarge.Matches(error.ErrorMessage)))
                return new ObjectResult(new ApiResponse<object>(false, PayloadTooLarge.Message, null,
                    [new ErrorDetail(PayloadTooLarge.Code, PayloadTooLarge.Message)], context.HttpContext.TraceIdentifier))
                { StatusCode = StatusCodes.Status413PayloadTooLarge };
            var errors = context.ModelState.SelectMany(pair => pair.Value?.Errors.Select(_ =>
                new ErrorDetail("validation_error", "The supplied value is invalid.", pair.Key)) ?? [] ).ToArray();
            return new BadRequestObjectResult(new ApiResponse<object>(false, "Validation failed.", null, errors, context.HttpContext.TraceIdentifier));
        });
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, HttpCurrentUserService>();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options => options.SwaggerDoc("v1", new OpenApiInfo { Title = "Nhu Nguyet Spa API", Version = "v1" }));
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        services.AddCors(options => options.AddPolicy(CorsPolicy, policy =>
        {
            if (origins.Length > 0) policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
        }));
        services.AddHealthChecks();
        return services;
    }
}

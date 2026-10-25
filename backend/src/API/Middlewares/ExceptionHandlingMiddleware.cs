using FluentValidation;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.API.Middlewares;

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            logger.LogInformation("Request {TraceId} was cancelled", context.TraceIdentifier);
        }
        catch (Exception exception) when (!context.Response.HasStarted)
        {
            var (status, message, code) = exception switch
            {
                ValidationException => (400, "Validation failed.", "validation_error"),
                BusinessRuleException => (400, exception.Message, "business_rule"),
                NotFoundException => (404, exception.Message, "not_found"),
                ConflictException => (409, exception.Message, "conflict"),
                UnauthorizedAccessException => (401, "Authentication is required.", "unauthorized"),
                _ => (500, "An unexpected error occurred. Please try again later.", "internal_error")
            };
            if (exception is DomainException { Code: { Length: > 0 } specificCode })
                code = specificCode;
            if (status == 500)
                logger.LogError(exception, "Unhandled request error {TraceId}", context.TraceIdentifier);
            else
                logger.LogWarning(exception, "Request rejected with {StatusCode}, trace {TraceId}", status, context.TraceIdentifier);

            IReadOnlyCollection<ErrorDetail> errors = exception is ValidationException validation
                ? validation.Errors.Select(error => new ErrorDetail(error.ErrorCode, error.ErrorMessage, error.PropertyName)).ToArray()
                : [new ErrorDetail(code, message)];

            context.Response.Clear();
            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(new ApiResponse<object>(false, message, null, errors, context.TraceIdentifier), context.RequestAborted);
        }
    }
}

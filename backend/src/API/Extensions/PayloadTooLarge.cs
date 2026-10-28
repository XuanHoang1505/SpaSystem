
namespace NhuNguyetSpa.API.Extensions;

/// <summary>
/// Recognises an upload over the endpoint's size limit. Kestrel throws a 413 BadHttpRequestException; when MVC form
/// binding reads the body it catches that (or the multipart length InvalidDataException) into ModelState, keeping only the
/// message ("Failed to read the request form. Request body too large. …"), so the message is matched as well.
/// </summary>
public static class PayloadTooLarge
{
    public const string Code = "request_too_large";
    public const string Message = "Tệp tải lên quá lớn.";

    public static bool Matches(Exception? exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            if (current is BadHttpRequestException { StatusCode: StatusCodes.Status413PayloadTooLarge })
                return true;
            if (current is InvalidDataException && Matches(current.Message))
                return true;
        }
        return false;
    }

    public static bool Matches(string? message) => message is not null &&
        (message.Contains("Request body too large", StringComparison.OrdinalIgnoreCase) ||
         message.Contains("body length limit", StringComparison.OrdinalIgnoreCase));
}

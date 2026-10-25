namespace NhuNguyetSpa.Application.Common.Models;

public class OperationResult
{
    public bool IsSuccess { get; }
    public string? Message { get; }
    public IReadOnlyCollection<ErrorDetail> Errors { get; }

    protected OperationResult(bool isSuccess, string? message, IEnumerable<ErrorDetail>? errors = null)
    {
        IsSuccess = isSuccess;
        Message = message;
        Errors = Array.AsReadOnly(errors?.ToArray() ?? []);
    }

    public static OperationResult Success(string? message = null) => new(true, message);
    public static OperationResult Failure(string message, IEnumerable<ErrorDetail>? errors = null) => new(false, message, errors);
}

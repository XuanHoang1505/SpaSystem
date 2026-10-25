namespace NhuNguyetSpa.Application.Common.Models;

public sealed class OperationResult<T> : OperationResult
{
    public T? Data { get; }

    private OperationResult(bool isSuccess, T? data, string? message, IEnumerable<ErrorDetail>? errors = null)
        : base(isSuccess, message, errors) => Data = data;

    public static OperationResult<T> Success(T data, string? message = null) => new(true, data, message);
    public new static OperationResult<T> Failure(string message, IEnumerable<ErrorDetail>? errors = null) => new(false, default, message, errors);
}

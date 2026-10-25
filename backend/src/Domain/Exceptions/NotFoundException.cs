namespace NhuNguyetSpa.Domain.Exceptions;

public class NotFoundException(string message, string? code = null) : DomainException(message, code);

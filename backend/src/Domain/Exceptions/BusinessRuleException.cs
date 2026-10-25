namespace NhuNguyetSpa.Domain.Exceptions;

public class BusinessRuleException(string message, string? code = null) : DomainException(message, code);

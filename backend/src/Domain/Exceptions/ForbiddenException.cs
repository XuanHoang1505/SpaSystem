namespace NhuNguyetSpa.Domain.Exceptions;

/// <summary>The caller is known but not allowed to do this (HTTP 403).</summary>
public class ForbiddenException(string message, string? code = null) : DomainException(message, code);

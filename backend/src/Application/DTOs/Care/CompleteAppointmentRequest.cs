namespace NhuNguyetSpa.Application.DTOs.Care;

/// <summary><c>POST /appointments/{id}/complete</c>; <see cref="Result"/> is the care result written by the staff member.</summary>
public sealed record CompleteAppointmentRequest(string? Result);

namespace NhuNguyetSpa.Application.DTOs.Treatments;

/// <summary><c>PUT /treatments/{id}</c> (BR-TRT-07): replaces the three fields; blank text becomes null.</summary>
public sealed record UpdateTreatmentPlanRequest(string? Goal, DateOnly? ExpectedEndDate, string? Note);

/// <summary><c>PUT /treatments/{id}/sessions/{sessionId}</c> (BR-TRT-09).</summary>
public sealed record UpdateTreatmentSessionRequest(string? Note);

/// <summary><c>POST /treatments/{id}/assign-staff</c>: null removes the primary staff member.</summary>
public sealed record AssignTreatmentStaffRequest(Guid? StaffMemberId);

/// <summary><c>POST /treatments/{id}/pause</c> and <c>/cancel</c> (BR-TRT-08).</summary>
public sealed record TreatmentReasonRequest(string? Reason);

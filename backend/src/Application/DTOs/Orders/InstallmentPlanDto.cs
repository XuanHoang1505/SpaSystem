namespace NhuNguyetSpa.Application.DTOs.Orders;

/// <summary>One way to pay the order in installments (preview, BR-INS-01…03).</summary>
public sealed record InstallmentOptionDto(int InstallmentCount, IReadOnlyList<InstallmentPreviewDto> Installments);

/// <summary>An installment of a plan: the sessions it unlocks, the services they are and what it costs.</summary>
public sealed record InstallmentPreviewDto(
    int SequenceNumber, int FirstSessionNumber, int LastSessionNumber, decimal Amount, IReadOnlyList<InstallmentServiceDto> Services);

public sealed record InstallmentServiceDto(string Name, int SessionCount);

/// <summary>Why the order cannot be paid in installments (code <c>installment_not_available</c>).</summary>
public sealed record InstallmentUnavailableDto(string Code, string Message);

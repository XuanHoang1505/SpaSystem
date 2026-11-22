namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Installment</c>: paying a package in installments (docs/specs/order-installments.md, Q-85…Q-89).</summary>
public sealed class InstallmentOptions
{
    public const string SectionName = "Installment";

    public bool Enabled { get; set; } = true;

    /// <summary>Order total after the promotion from which installments are offered (BR-INS-01).</summary>
    public decimal MinOrderTotal { get; set; } = 1_000_000;

    /// <summary>The customer chooses 2..this many installments (Q-87).</summary>
    public int MaxInstallments { get; set; } = 3;

    /// <summary>Every installment but the last is rounded down to this many đồng (BR-INS-03).</summary>
    public decimal RoundingUnit { get; set; } = 1_000;

    /// <summary>Days before the package expires to remind a customer with unpaid installments (NTF-E17); 0 = off.</summary>
    public int ExpiryReminderDays { get; set; } = 7;

    public static bool IsValid(InstallmentOptions options) =>
        options.MinOrderTotal >= 0 && options.MaxInstallments is >= 2 and <= 6 && options.RoundingUnit is >= 1 and <= 100_000 &&
        options.ExpiryReminderDays is >= 0 and <= 60;
}

namespace NhuNguyetSpa.Domain.Common;

/// <summary>One installment of a plan: the sessions it unlocks (1-based, inclusive) and what it costs.</summary>
public sealed record InstallmentShare(int SequenceNumber, int FirstSessionNumber, int LastSessionNumber, decimal Amount);

/// <summary>
/// Splits a package order into installments (docs/specs/order-installments.md). Sessions are numbered 1..N in the order the
/// treatment sessions are created; each installment takes a run of consecutive sessions, the first ones taking the remainder
/// (BR-INS-02). The order total (after the promotion) is shared by the list price of the sessions in each installment, every
/// installment but the last rounded down to <c>roundingUnit</c>, the last taking what is left, so the shares always sum to the
/// total (BR-INS-03).
/// </summary>
public static class InstallmentPlanner
{
    /// <summary>Session ranges for <paramref name="installmentCount"/> installments; e.g. 10 sessions, 3 installments → 1–4, 5–7, 8–10.</summary>
    public static IReadOnlyList<(int First, int Last)> SplitSessions(int sessionCount, int installmentCount)
    {
        if (installmentCount < 1 || installmentCount > sessionCount)
            throw new ArgumentOutOfRangeException(nameof(installmentCount), installmentCount, "Need 1..sessionCount installments.");
        var size = sessionCount / installmentCount;
        var extra = sessionCount % installmentCount;
        var ranges = new List<(int, int)>(installmentCount);
        var first = 1;
        for (var k = 0; k < installmentCount; k++)
        {
            var count = size + (k < extra ? 1 : 0);
            ranges.Add((first, first + count - 1));
            first += count;
        }
        return ranges;
    }

    /// <param name="sessionWeights">List price of the service of each session, in session order (index 0 = session 1).</param>
    public static IReadOnlyList<InstallmentShare> Plan(decimal grandTotal, IReadOnlyList<decimal> sessionWeights, int installmentCount,
        decimal roundingUnit)
    {
        ArgumentNullException.ThrowIfNull(sessionWeights);
        if (roundingUnit < 1)
            throw new ArgumentOutOfRangeException(nameof(roundingUnit), roundingUnit, "The rounding unit must be at least 1.");
        var ranges = SplitSessions(sessionWeights.Count, installmentCount);
        // All services free: share by the number of sessions instead.
        var weights = sessionWeights.All(weight => weight <= 0) ? sessionWeights.Select(_ => 1m).ToList() : sessionWeights.ToList();
        var total = weights.Sum();

        var shares = new List<InstallmentShare>(installmentCount);
        var allocated = 0m;
        for (var k = 0; k < ranges.Count; k++)
        {
            var (first, last) = ranges[k];
            decimal amount;
            if (k == ranges.Count - 1)
                amount = grandTotal - allocated;
            else
            {
                var weight = weights.Skip(first - 1).Take(last - first + 1).Sum();
                amount = decimal.Floor(grandTotal * weight / total / roundingUnit) * roundingUnit;
                allocated += amount;
            }
            shares.Add(new InstallmentShare(k + 1, first, last, amount));
        }
        return shares;
    }
}

using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.UseCases.Reviews;

/// <summary>
/// BR-REV-04 (Q-76): the customer edits a review until <c>created + editWindowDays</c> and only while the spa has not replied.
/// One rule for the <c>canEdit</c> field and the commands.
/// </summary>
public static class ReviewEditPolicy
{
    public static (bool CanEdit, DateTime? DeadlineAtUtc) Evaluate(Review review, DateTime nowUtc, int editWindowDays)
    {
        ArgumentNullException.ThrowIfNull(review);
        return Evaluate(review.CreatedAtUtc, review.OwnerReply is not null, nowUtc, editWindowDays);
    }

    public static (bool CanEdit, DateTime? DeadlineAtUtc) Evaluate(DateTime createdAtUtc, bool replied, DateTime nowUtc, int editWindowDays)
    {
        if (editWindowDays <= 0)
            return (false, null);
        var deadline = createdAtUtc.AddDays(editWindowDays);
        return (!replied && nowUtc <= deadline, deadline);
    }
}

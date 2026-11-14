namespace NhuNguyetSpa.Application.DTOs.Reviews;

/// <summary>Why a product cannot be reviewed (serialized <c>not_used_yet</c>, …); <see cref="None"/> is sent as <c>null</c>.</summary>
public enum ReviewIneligibility
{
    None,
    NotUsedYet,
    NotEnoughSessions,
    AlreadyReviewed,
}

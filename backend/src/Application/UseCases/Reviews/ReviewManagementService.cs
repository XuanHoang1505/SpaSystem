using FluentValidation;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Reviews;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Reviews;

/// <summary>UC-SPA-31 (BR-REV-02, 08): reviews are never deleted, only hidden; a new reply replaces the old one.</summary>
public sealed class ReviewManagementService : IReviewManagementService
{
    private readonly IReviewRepository _reviews;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IValidator<OwnerReviewFilter> _filterValidator;
    private readonly IValidator<ReplyReviewRequest> _replyValidator;
    private readonly IValidator<ChangeReviewVisibilityRequest> _visibilityValidator;

    public ReviewManagementService(
        IReviewRepository reviews,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        IValidator<OwnerReviewFilter> filterValidator,
        IValidator<ReplyReviewRequest> replyValidator,
        IValidator<ChangeReviewVisibilityRequest> visibilityValidator)
    {
        _reviews = reviews;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _filterValidator = filterValidator;
        _replyValidator = replyValidator;
        _visibilityValidator = visibilityValidator;
    }

    public async Task<OperationResult<PagedResult<OwnerReviewDto>>> SearchAsync(
        PagedQuery query, OwnerReviewFilter filter, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(filter);
        await _filterValidator.ValidateAndThrowAsync(filter, cancellationToken);
        var criteria = new OwnerReviewCriteria(
            string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim(),
            filter.Rating,
            filter.ProductType switch
            {
                "service" => CatalogItemType.Service,
                "package" => CatalogItemType.Package,
                _ => null,
            },
            filter.SpaServiceId,
            filter.ServicePackageId,
            filter.Status switch
            {
                "visible" => ReviewStatus.Visible,
                "hidden" => ReviewStatus.Hidden,
                _ => null,
            },
            filter.HasReply,
            filter.FromDate.HasValue ? SpaTime.StartOfDayUtc(filter.FromDate.Value) : null,
            filter.ToDate.HasValue ? SpaTime.StartOfDayUtc(filter.ToDate.Value.AddDays(1)) : null,
            query.PageNumber,
            query.PageSize);
        return OperationResult<PagedResult<OwnerReviewDto>>.Success(await _reviews.SearchAsync(criteria, cancellationToken));
    }

    public async Task<OperationResult<OwnerReviewDto>> ReplyAsync(Guid id, ReplyReviewRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _replyValidator.ValidateAndThrowAsync(request, cancellationToken);
        var review = await _reviews.GetByIdAsync(id, cancellationToken) ?? throw ReviewErrors.NotFound();
        review.Reply(request.Reply!.Trim(), _clock.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var dto = await _reviews.GetOwnerDtoAsync(id, cancellationToken) ?? throw ReviewErrors.NotFound();
        return OperationResult<OwnerReviewDto>.Success(dto, "Đã lưu phản hồi.");
    }

    public async Task RemoveReplyAsync(Guid id, CancellationToken cancellationToken)
    {
        var review = await _reviews.GetByIdAsync(id, cancellationToken) ?? throw ReviewErrors.NotFound();
        review.RemoveReply();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task ChangeVisibilityAsync(Guid id, ChangeReviewVisibilityRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _visibilityValidator.ValidateAndThrowAsync(request, cancellationToken);
        var review = await _reviews.GetByIdAsync(id, cancellationToken) ?? throw ReviewErrors.NotFound();
        if (request.Status == "hidden")
            review.Hide();
        else
            review.Show();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

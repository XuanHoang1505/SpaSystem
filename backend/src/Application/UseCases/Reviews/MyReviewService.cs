using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Storage;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Reviews;
using NhuNguyetSpa.Application.Interfaces.Storage;
using NhuNguyetSpa.Application.Mapping;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Reviews;

/// <summary>
/// UC-SPA-30 (BR-REV-01, 03, 04, 05, 07). The customer is always the caller; a review of another customer reads as
/// <c>404 review_not_found</c>. Eligibility is re-checked on create with the same <see cref="ReviewEligibility"/> as the list,
/// and the unique indexes turn a concurrent duplicate into <c>409 review_exists</c>.
/// </summary>
public sealed class MyReviewService : IMyReviewService
{
    private readonly IReviewRepository _reviews;
    private readonly IRepository<SpaService> _services;
    private readonly IRepository<ServicePackage> _packages;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<ReviewsOptions> _options;
    private readonly IValidator<CreateReviewRequest> _createValidator;
    private readonly IValidator<UpdateReviewRequest> _updateValidator;
    private readonly IFileStorage _storage;
    private readonly ImageUploadReader _imageReader;

    public MyReviewService(
        IReviewRepository reviews,
        IRepository<SpaService> services,
        IRepository<ServicePackage> packages,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<ReviewsOptions> options,
        IValidator<CreateReviewRequest> createValidator,
        IValidator<UpdateReviewRequest> updateValidator,
        IFileStorage storage,
        ImageUploadReader imageReader)
    {
        _reviews = reviews;
        _services = services;
        _packages = packages;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _storage = storage;
        _imageReader = imageReader;
    }

    private Guid CustomerId => _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized");

    private ReviewsOptions Options => _options.Value;

    public static string ImagePublicId(Guid reviewId) => $"reviews/{reviewId}";

    public async Task<OperationResult<IReadOnlyList<ReviewableProductDto>>> ListReviewableAsync(CancellationToken cancellationToken)
    {
        var facts = await _reviews.GetFactsAsync(CustomerId, null, null, cancellationToken);
        var minimum = Options.MinCompletedPackageSessions;
        var rows = facts.Services
            .Select(fact => Row(CatalogItemType.Service, fact.ServiceId, fact.Name, fact.ImageUrl, facts,
                existing => ReviewEligibility.ForService(fact, existing)))
            .Concat(facts.Packages.Select(fact => Row(CatalogItemType.Package, fact.PackageId, fact.Name, fact.ImageUrl, facts,
                existing => ReviewEligibility.ForPackage(fact, minimum, existing))))
            .OrderBy(row => row.Eligible ? 0 : 1)
            .ThenBy(row => row.Name, StringComparer.OrdinalIgnoreCase)
            .Take(Options.MaxReviewableItems)
            .ToList();
        return OperationResult<IReadOnlyList<ReviewableProductDto>>.Success(rows);
    }

    public async Task<OperationResult<MyReviewDto>> CreateAsync(CreateReviewRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);
        var customerId = CustomerId;
        var (type, productId) = request.SpaServiceId is { } serviceId
            ? (CatalogItemType.Service, serviceId)
            : (CatalogItemType.Package, request.ServicePackageId!.Value);
        if (type == CatalogItemType.Service)
            _ = await _services.GetByIdAsync(productId, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
        else
            _ = await _packages.GetByIdAsync(productId, cancellationToken) ?? throw CatalogErrors.PackageNotFound();

        var facts = await _reviews.GetFactsAsync(customerId, type, productId, cancellationToken);
        Guid? existing = facts.ExistingReviewIds.TryGetValue((type, productId), out var id) ? id : null;
        var minimum = Options.MinCompletedPackageSessions;
        var reason = type == CatalogItemType.Service
            ? ReviewEligibility.ForService(facts.Services.FirstOrDefault(), existing)
            : ReviewEligibility.ForPackage(facts.Packages.FirstOrDefault(), minimum, existing);
        if (reason == ReviewIneligibility.AlreadyReviewed)
            throw ReviewErrors.Exists();
        if (reason != ReviewIneligibility.None)
            throw ReviewErrors.NotEligible(ReviewEligibility.Message(reason, minimum));

        var review = Review.Create(customerId, request.SpaServiceId, request.ServicePackageId, request.Rating, request.Comment.TrimToNull());
        await _reviews.AddAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<MyReviewDto>.Success(await ReadAsync(review.Id, customerId, cancellationToken), "Đã gửi đánh giá.");
    }

    public async Task<OperationResult<PagedResult<MyReviewDto>>> ListMineAsync(PagedQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        var page = await _reviews.GetMinePageAsync(CustomerId, query.PageNumber, query.PageSize, cancellationToken);
        var now = _clock.UtcNow;
        return OperationResult<PagedResult<MyReviewDto>>.Success(
            new PagedResult<MyReviewDto>(page.Items.Select(item => WithEditFacts(item, now)), page.PageNumber, page.PageSize, page.TotalCount));
    }

    public async Task<OperationResult<MyReviewDto>> GetMineAsync(Guid id, CancellationToken cancellationToken) =>
        OperationResult<MyReviewDto>.Success(await ReadAsync(id, CustomerId, cancellationToken));

    public async Task<OperationResult<MyReviewDto>> UpdateAsync(Guid id, UpdateReviewRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var review = await LoadEditableAsync(id, cancellationToken);
        review.Edit(request.Rating, request.Comment.TrimToNull());
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<MyReviewDto>.Success(await ReadAsync(id, review.CustomerId, cancellationToken), "Đã cập nhật đánh giá.");
    }

    public async Task<OperationResult<MyReviewDto>> UploadImageAsync(Guid id, ImageUploadRequest file, CancellationToken cancellationToken)
    {
        var review = await LoadEditableAsync(id, cancellationToken);
        await using var image = await _imageReader.ReadAsync(file, cancellationToken);
        var url = await _storage.UploadImageAsync(image.Content, ImagePublicId(review.Id), image.ContentType, cancellationToken);
        review.SetImage(url);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<MyReviewDto>.Success(await ReadAsync(id, review.CustomerId, cancellationToken), "Đã cập nhật ảnh đánh giá.");
    }

    public async Task DeleteImageAsync(Guid id, CancellationToken cancellationToken)
    {
        var review = await LoadEditableAsync(id, cancellationToken);
        if (review.ImageUrl is null)
            return;
        await _storage.DeleteAsync(ImagePublicId(review.Id), cancellationToken);
        review.RemoveImage();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static ReviewableProductDto Row(
        CatalogItemType type, Guid productId, string name, string? imageUrl, ReviewFacts facts, Func<Guid?, ReviewIneligibility> decide)
    {
        Guid? existing = facts.ExistingReviewIds.TryGetValue((type, productId), out var reviewId) ? reviewId : null;
        var reason = decide(existing);
        return new ReviewableProductDto(type, productId, name, imageUrl, reason == ReviewIneligibility.None,
            reason == ReviewIneligibility.None ? null : reason, existing);
    }

    private async Task<Review> LoadEditableAsync(Guid id, CancellationToken cancellationToken)
    {
        var review = await _reviews.GetMineAsync(id, CustomerId, cancellationToken) ?? throw ReviewErrors.NotFound();
        if (!ReviewEditPolicy.Evaluate(review, _clock.UtcNow, Options.CustomerEditWindowDays).CanEdit)
            throw ReviewErrors.Locked();
        return review;
    }

    private async Task<MyReviewDto> ReadAsync(Guid id, Guid customerId, CancellationToken cancellationToken)
    {
        var dto = await _reviews.GetMineDtoAsync(id, customerId, cancellationToken) ?? throw ReviewErrors.NotFound();
        return WithEditFacts(dto, _clock.UtcNow);
    }

    private MyReviewDto WithEditFacts(MyReviewDto dto, DateTime nowUtc)
    {
        var (canEdit, deadline) = ReviewEditPolicy.Evaluate(dto.CreatedAtUtc, dto.OwnerReply is not null, nowUtc, Options.CustomerEditWindowDays);
        return dto with { CanEdit = canEdit, EditDeadlineAtUtc = deadline };
    }
}

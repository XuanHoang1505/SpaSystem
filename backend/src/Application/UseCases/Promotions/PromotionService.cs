using FluentValidation;
using FluentValidation.Results;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Promotions;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Promotions;
using NhuNguyetSpa.Application.Validators.Promotions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Promotions;

/// <summary>UC-SPA-14 promotion management (docs/specs/orders.md).</summary>
public sealed class PromotionService : IPromotionService
{
    private readonly IPromotionRepository _promotions;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IValidator<SavePromotionRequest> _saveValidator;
    private readonly IValidator<PromotionFilter> _filterValidator;
    private readonly IValidator<ChangePromotionStatusRequest> _statusValidator;

    public PromotionService(
        IPromotionRepository promotions,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        IValidator<SavePromotionRequest> saveValidator,
        IValidator<PromotionFilter> filterValidator,
        IValidator<ChangePromotionStatusRequest> statusValidator)
    {
        _promotions = promotions;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _saveValidator = saveValidator;
        _filterValidator = filterValidator;
        _statusValidator = statusValidator;
    }

    public async Task<OperationResult<PagedResult<PromotionDto>>> SearchAsync(PagedQuery query, PromotionFilter filter, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(filter);
        await _filterValidator.ValidateAndThrowAsync(filter, cancellationToken);
        var failures = new List<ValidationFailure>();
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim();
        if (search?.Length > PromotionQuery.MaxSearchLength)
            failures.Add(new ValidationFailure("search", $"Từ khóa tối đa {PromotionQuery.MaxSearchLength} ký tự.") { ErrorCode = "validation_error" });
        // No sortBy means "newest start first"; with a sortBy the requested direction applies.
        var sortBy = PromotionSortField.StartsAtUtc;
        var direction = SortDirection.Desc;
        if (!string.IsNullOrWhiteSpace(query.SortBy))
        {
            if (!Enum.TryParse(query.SortBy.Trim(), ignoreCase: true, out sortBy))
                failures.Add(new ValidationFailure("sortBy", "Chỉ sắp xếp được theo startsAtUtc hoặc code.") { ErrorCode = "validation_error" });
            direction = query.SortDirection;
        }
        if (failures.Count > 0)
            throw new ValidationException(failures);

        PromotionQuery.TryParseStatus(filter.Status, out var status);
        var criteria = new PromotionSearchCriteria(
            search,
            status,
            filter.FromDate.HasValue ? SpaTime.StartOfDayUtc(filter.FromDate.Value) : null,
            filter.ToDate.HasValue ? SpaTime.StartOfDayUtc(filter.ToDate.Value.AddDays(1)) : null,
            sortBy,
            direction,
            query.PageNumber,
            query.PageSize);
        return OperationResult<PagedResult<PromotionDto>>.Success(await _promotions.SearchAsync(criteria, cancellationToken));
    }

    public async Task<OperationResult<PromotionDto>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        return OperationResult<PromotionDto>.Success(await _promotions.GetDtoAsync(id, cancellationToken) ?? throw PromotionErrors.PromotionNotFound());
    }

    public async Task<OperationResult<PromotionDto>> CreateAsync(SavePromotionRequest request, CancellationToken cancellationToken)
    {
        request = await NormalizeAndValidateAsync(request, cancellationToken);
        if (request.EndsAtUtc!.Value <= _clock.UtcNow)
        {
            var failures = new List<ValidationFailure>
            {
                new ValidationFailure(nameof(SavePromotionRequest.EndsAtUtc), "Thời điểm kết thúc phải ở tương lai.") { ErrorCode = "validation_error" },
            };
            throw new ValidationException(failures);
        }
        if (await _promotions.CodeExistsAsync(request.Code!, null, cancellationToken))
            throw PromotionErrors.PromotionCodeExists();

        var promotion = new Promotion { Status = PromotionStatus.Active };
        Apply(promotion, request);
        await _promotions.AddAsync(promotion, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetAsync(promotion.Id, cancellationToken);
    }

    public async Task<OperationResult<PromotionDto>> UpdateAsync(Guid id, SavePromotionRequest request, CancellationToken cancellationToken)
    {
        request = await NormalizeAndValidateAsync(request, cancellationToken);
        var promotion = await _promotions.GetByIdAsync(id, cancellationToken) ?? throw PromotionErrors.PromotionNotFound();
        if (request.Code != promotion.Code && await _promotions.CodeExistsAsync(request.Code!, id, cancellationToken))
            throw PromotionErrors.PromotionCodeExists();

        // BR-PRM-06: once a use counts, the code and the discount itself are frozen (orders keep their snapshot anyway).
        var counted = await _promotions.CountCountedRedemptionsAsync(id, null, _clock.UtcNow, cancellationToken);
        var discountChanged = request.Code != promotion.Code || request.DiscountType != promotion.DiscountType ||
                              request.DiscountValue != promotion.DiscountValue;
        if (counted > 0 && discountChanged)
            throw PromotionErrors.PromotionInUse();
        if (request.UsageLimit.HasValue && request.UsageLimit.Value < counted)
            throw PromotionErrors.UsageLimitBelowUsed(counted);

        Apply(promotion, request);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetAsync(id, cancellationToken);
    }

    public async Task ChangeStatusAsync(Guid id, ChangePromotionStatusRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _statusValidator.ValidateAndThrowAsync(request, cancellationToken);
        var promotion = await _promotions.GetByIdAsync(id, cancellationToken) ?? throw PromotionErrors.PromotionNotFound();
        promotion.ChangeStatus(request.Status!.Value);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<SavePromotionRequest> NormalizeAndValidateAsync(SavePromotionRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        request = new SavePromotionRequest(
            PromotionCode.Normalize(request.Code),
            string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            request.DiscountType,
            request.DiscountValue,
            request.MinOrderAmount,
            request.MaxDiscountAmount,
            request.StartsAtUtc,
            request.EndsAtUtc,
            request.PerCustomerLimit,
            request.UsageLimit);
        await _saveValidator.ValidateAndThrowAsync(request, cancellationToken);
        return request;
    }

    private static void Apply(Promotion promotion, SavePromotionRequest request)
    {
        promotion.Code = request.Code!;
        promotion.Description = request.Description;
        promotion.DiscountType = request.DiscountType!.Value;
        promotion.DiscountValue = request.DiscountValue!.Value;
        promotion.MinOrderAmount = request.MinOrderAmount!.Value;
        promotion.MaxDiscountAmount = request.MaxDiscountAmount;
        promotion.StartsAtUtc = DateTime.SpecifyKind(request.StartsAtUtc!.Value.ToUniversalTime(), DateTimeKind.Utc);
        promotion.EndsAtUtc = DateTime.SpecifyKind(request.EndsAtUtc!.Value.ToUniversalTime(), DateTimeKind.Utc);
        promotion.PerCustomerLimit = request.PerCustomerLimit;
        promotion.UsageLimit = request.UsageLimit;
    }
}

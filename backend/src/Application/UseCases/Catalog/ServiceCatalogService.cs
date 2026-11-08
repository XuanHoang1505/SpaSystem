using FluentValidation;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;
using NhuNguyetSpa.Application.Mapping;
using NhuNguyetSpa.Application.Validators.Catalog;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.UseCases.Catalog;

/// <summary>UC-SPA-06/07/09 for spa services (docs/specs/catalog.md).</summary>
public sealed class ServiceCatalogService : IServiceCatalogService
{
    private readonly ISpaServiceRepository _services;
    private readonly IServiceCategoryRepository _categories;
    private readonly CatalogViewer _viewer;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<CreateServiceRequest> _createValidator;
    private readonly IValidator<UpdateServiceRequest> _updateValidator;
    private readonly IValidator<ChangeCatalogStatusRequest> _statusValidator;
    private readonly IValidator<ServiceFilter> _filterValidator;

    public ServiceCatalogService(
        ISpaServiceRepository services,
        IServiceCategoryRepository categories,
        CatalogViewer viewer,
        IUnitOfWork unitOfWork,
        IValidator<CreateServiceRequest> createValidator,
        IValidator<UpdateServiceRequest> updateValidator,
        IValidator<ChangeCatalogStatusRequest> statusValidator,
        IValidator<ServiceFilter> filterValidator)
    {
        _services = services;
        _categories = categories;
        _viewer = viewer;
        _unitOfWork = unitOfWork;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _statusValidator = statusValidator;
        _filterValidator = filterValidator;
    }

    public async Task<OperationResult<PagedResult<ServiceListItemDto>>> SearchAsync(PagedQuery query, ServiceFilter filter, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(filter);
        var (search, sortBy) = CatalogQuery.Parse(query);
        await _filterValidator.ValidateAndThrowAsync(filter, cancellationToken);
        var isOwner = _viewer.IsOwner;
        var criteria = new ServiceSearchCriteria(
            search, filter.CategoryId, filter.MinPrice, filter.MaxPrice,
            isOwner ? CatalogQuery.ParseStatus(filter.Status) : null, PublicOnly: !isOwner,
            sortBy, query.SortDirection, query.PageNumber, query.PageSize);
        return OperationResult<PagedResult<ServiceListItemDto>>.Success(await _services.SearchAsync(criteria, cancellationToken));
    }

    public async Task<OperationResult<ServiceDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var service = await _services.GetDetailAsync(id, publicOnly: !_viewer.IsOwner, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
        return OperationResult<ServiceDetailDto>.Success(service);
    }

    public async Task<OperationResult<ServiceDetailDto>> CreateAsync(CreateServiceRequest request, CancellationToken cancellationToken)
    {
        request = Normalize(request);
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);
        var category = await SelectableCategoryAsync(request.CategoryId, currentId: null, cancellationToken);
        var service = new SpaService
        {
            Name = request.Name,
            CategoryId = category.Id,
            Category = category,
            ShortDescription = request.ShortDescription,
            Description = request.Description,
            DurationMinutes = request.DurationMinutes,
            Price = request.Price,
        };
        foreach (var step in ToSteps(service.Id, request.Steps ?? []))
            service.Steps.Add(step);
        if (request.Status is { } status)
            service.ChangeStatus(status);
        await _services.AddAsync(service, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<ServiceDetailDto>.Success(service.ToDetailDto(service.Steps), "Đã thêm dịch vụ.");
    }

    public async Task<OperationResult<ServiceDetailDto>> UpdateAsync(Guid id, UpdateServiceRequest request, CancellationToken cancellationToken)
    {
        request = Normalize(request);
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var service = await _services.GetByIdAsync(id, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
        var category = await SelectableCategoryAsync(request.CategoryId, service.CategoryId, cancellationToken);
        service.Name = request.Name;
        service.CategoryId = category.Id;
        // BR-CAT-17: no step list keeps the current steps, a list (even empty) replaces them.
        IReadOnlyCollection<ServiceStep> steps = await _services.GetStepsAsync(service.Id, cancellationToken);
        // BR-CAT-16 also holds for kept steps: the new duration may not drop below their minutes.
        if (request.Steps is null && steps.Sum(step => step.DurationMinutes ?? 0) > request.DurationMinutes)
            throw new ValidationException([
                new FluentValidation.Results.ValidationFailure(
                    nameof(UpdateServiceRequest.DurationMinutes), "Tổng thời lượng các bước không được vượt quá thời lượng dịch vụ."),
            ]);
        service.Category = category;
        service.ShortDescription = request.ShortDescription;
        service.Description = request.Description;
        service.DurationMinutes = request.DurationMinutes;
        service.Price = request.Price;
        if (request.Steps is not null)
        {
            var next = ToSteps(service.Id, request.Steps);
            _services.ReplaceSteps(steps, next);
            steps = next;
        }
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<ServiceDetailDto>.Success(service.ToDetailDto(steps), "Đã cập nhật dịch vụ.");
    }

    public async Task ChangeStatusAsync(Guid id, ChangeCatalogStatusRequest request, CancellationToken cancellationToken)
    {
        await _statusValidator.ValidateAndThrowAsync(request, cancellationToken);
        var service = await _services.GetByIdAsync(id, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
        service.ChangeStatus(request.Status!.Value);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// BR-CAT-11: the category must exist; a hidden one may only stay on a service that already has it.
    /// </summary>
    private async Task<ServiceCategory> SelectableCategoryAsync(Guid categoryId, Guid? currentId, CancellationToken cancellationToken)
    {
        var category = await _categories.GetByIdAsync(categoryId, cancellationToken) ?? throw CatalogErrors.ServiceCategoryNotFoundForService();
        if (!category.IsActive && category.Id != currentId)
            throw CatalogErrors.ServiceCategoryInactive();
        return category;
    }

    /// <summary>Sort orders follow the list order, 1..n (BR-CAT-16).</summary>
    private static List<ServiceStep> ToSteps(Guid serviceId, IEnumerable<ServiceStepRequest> steps) => steps
        .Select((step, index) => new ServiceStep
        {
            SpaServiceId = serviceId,
            SortOrder = index + 1,
            Title = step.Title,
            Description = step.Description,
            DurationMinutes = step.DurationMinutes,
        })
        .ToList();

    private static IReadOnlyList<ServiceStepRequest>? NormalizeSteps(IReadOnlyList<ServiceStepRequest>? steps) => steps?
        .Select(step => step is null ? new ServiceStepRequest(string.Empty, null, null)
            : step with { Title = step.Title?.Trim() ?? string.Empty, Description = step.Description.TrimToNull() })
        .ToList();

    private static CreateServiceRequest Normalize(CreateServiceRequest request) => request with
    {
        Name = request.Name?.Trim() ?? string.Empty,
        ShortDescription = request.ShortDescription.TrimToNull(),
        Steps = NormalizeSteps(request.Steps),
        Description = request.Description.TrimToNull(),
    };

    private static UpdateServiceRequest Normalize(UpdateServiceRequest request) => request with
    {
        Name = request.Name?.Trim() ?? string.Empty,
        ShortDescription = request.ShortDescription.TrimToNull(),
        Steps = NormalizeSteps(request.Steps),
        Description = request.Description.TrimToNull(),
    };
}

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
    private readonly ServiceCategoryResolver _categories;
    private readonly CatalogViewer _viewer;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<CreateServiceRequest> _createValidator;
    private readonly IValidator<UpdateServiceRequest> _updateValidator;
    private readonly IValidator<ChangeCatalogStatusRequest> _statusValidator;
    private readonly IValidator<ServiceFilter> _filterValidator;

    public ServiceCatalogService(
        ISpaServiceRepository services,
        ServiceCategoryResolver categories,
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
        var category = ServiceCategoryResolver.Normalize(filter.Category);
        var criteria = new ServiceSearchCriteria(
            search, category.Length == 0 ? null : category, filter.MinPrice, filter.MaxPrice,
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
        var service = new SpaService
        {
            Name = request.Name,
            Category = await _categories.ResolveAsync(request.Category, null, cancellationToken),
            Description = request.Description,
            DurationMinutes = request.DurationMinutes,
            Price = request.Price,
        };
        if (request.Status is { } status)
            service.ChangeStatus(status);
        await _services.AddAsync(service, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<ServiceDetailDto>.Success(service.ToDetailDto(), "Đã thêm dịch vụ.");
    }

    public async Task<OperationResult<ServiceDetailDto>> UpdateAsync(Guid id, UpdateServiceRequest request, CancellationToken cancellationToken)
    {
        request = Normalize(request);
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var service = await _services.GetByIdAsync(id, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
        service.Name = request.Name;
        service.Category = await _categories.ResolveAsync(request.Category, service.Id, cancellationToken);
        service.Description = request.Description;
        service.DurationMinutes = request.DurationMinutes;
        service.Price = request.Price;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<ServiceDetailDto>.Success(service.ToDetailDto(), "Đã cập nhật dịch vụ.");
    }

    public async Task ChangeStatusAsync(Guid id, ChangeCatalogStatusRequest request, CancellationToken cancellationToken)
    {
        await _statusValidator.ValidateAndThrowAsync(request, cancellationToken);
        var service = await _services.GetByIdAsync(id, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
        service.ChangeStatus(request.Status!.Value);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static CreateServiceRequest Normalize(CreateServiceRequest request) => request with
    {
        Name = request.Name?.Trim() ?? string.Empty,
        Category = ServiceCategoryResolver.Normalize(request.Category),
        Description = request.Description.TrimToNull(),
    };

    private static UpdateServiceRequest Normalize(UpdateServiceRequest request) => request with
    {
        Name = request.Name?.Trim() ?? string.Empty,
        Category = ServiceCategoryResolver.Normalize(request.Category),
        Description = request.Description.TrimToNull(),
    };
}

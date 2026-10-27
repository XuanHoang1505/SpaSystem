using FluentValidation;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;
using NhuNguyetSpa.Application.Mapping;
using NhuNguyetSpa.Application.Validators.Catalog;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Catalog;

/// <summary>UC-SPA-06/07/09 for service packages (docs/specs/catalog.md).</summary>
public sealed class PackageCatalogService : IPackageCatalogService
{
    private readonly IServicePackageRepository _packages;
    private readonly ISpaServiceRepository _services;
    private readonly CatalogViewer _viewer;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<CreatePackageRequest> _createValidator;
    private readonly IValidator<UpdatePackageRequest> _updateValidator;
    private readonly IValidator<ChangeCatalogStatusRequest> _statusValidator;
    private readonly IValidator<PackageFilter> _filterValidator;

    public PackageCatalogService(
        IServicePackageRepository packages,
        ISpaServiceRepository services,
        CatalogViewer viewer,
        IUnitOfWork unitOfWork,
        IValidator<CreatePackageRequest> createValidator,
        IValidator<UpdatePackageRequest> updateValidator,
        IValidator<ChangeCatalogStatusRequest> statusValidator,
        IValidator<PackageFilter> filterValidator)
    {
        _packages = packages;
        _services = services;
        _viewer = viewer;
        _unitOfWork = unitOfWork;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _statusValidator = statusValidator;
        _filterValidator = filterValidator;
    }

    public async Task<OperationResult<PagedResult<PackageListItemDto>>> SearchAsync(PagedQuery query, PackageFilter filter, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(filter);
        var (search, sortBy) = CatalogQuery.Parse(query);
        await _filterValidator.ValidateAndThrowAsync(filter, cancellationToken);
        var publicOn = _viewer.PublicOn;
        var criteria = new PackageSearchCriteria(
            search, filter.MinPrice, filter.MaxPrice, publicOn is null ? CatalogQuery.ParseStatus(filter.Status) : null, publicOn,
            sortBy, query.SortDirection, query.PageNumber, query.PageSize);
        return OperationResult<PagedResult<PackageListItemDto>>.Success(await _packages.SearchAsync(criteria, cancellationToken));
    }

    public async Task<OperationResult<PackageDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var package = await _packages.GetDetailAsync(id, _viewer.PublicOn, cancellationToken) ?? throw CatalogErrors.PackageNotFound();
        return OperationResult<PackageDetailDto>.Success(package);
    }

    public async Task<OperationResult<PackageDetailDto>> CreateAsync(CreatePackageRequest request, CancellationToken cancellationToken)
    {
        request = request with { Name = request.Name?.Trim() ?? string.Empty, Description = request.Description.TrimToNull() };
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);
        await EnsureServicesCanBeAddedAsync(request.Items!, alreadyInPackage: new HashSet<Guid>(), cancellationToken);
        var package = new ServicePackage();
        Apply(package, request);
        if (request.Status is { } status)
            package.ChangeStatus(status);
        package.ReplaceItems(ToItems(package, request.Items!));
        await _packages.AddAsync(package, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<PackageDetailDto>.Success(await ReloadAsync(package.Id, cancellationToken), "Đã thêm gói dịch vụ.");
    }

    public async Task<OperationResult<PackageDetailDto>> UpdateAsync(Guid id, UpdatePackageRequest request, CancellationToken cancellationToken)
    {
        request = request with { Name = request.Name?.Trim() ?? string.Empty, Description = request.Description.TrimToNull() };
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var package = await _packages.GetWithItemsAsync(id, cancellationToken) ?? throw CatalogErrors.PackageNotFound();
        // A service that is already in the package may stay even if it was discontinued since (spec UC-SPA-09 A2).
        var current = package.Items.Select(item => item.SpaServiceId).ToHashSet();
        await EnsureServicesCanBeAddedAsync(request.Items!, current, cancellationToken);
        Apply(package, request);
        _packages.ReplaceItems(package, ToItems(package, request.Items!));
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<PackageDetailDto>.Success(await ReloadAsync(package.Id, cancellationToken), "Đã cập nhật gói dịch vụ.");
    }

    public async Task ChangeStatusAsync(Guid id, ChangeCatalogStatusRequest request, CancellationToken cancellationToken)
    {
        await _statusValidator.ValidateAndThrowAsync(request, cancellationToken);
        var package = await _packages.GetByIdAsync(id, cancellationToken) ?? throw CatalogErrors.PackageNotFound();
        package.ChangeStatus(request.Status!.Value);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>BR-CAT-06: every service must exist; newly added services must be on sale.</summary>
    private async Task EnsureServicesCanBeAddedAsync(
        IReadOnlyList<PackageItemRequest> items, IReadOnlySet<Guid> alreadyInPackage, CancellationToken cancellationToken)
    {
        var services = (await _services.GetByIdsAsync(items.Select(item => item.SpaServiceId).ToArray(), cancellationToken))
            .ToDictionary(service => service.Id);
        foreach (var item in items.OrderBy(item => item.SortOrder))
        {
            if (!services.TryGetValue(item.SpaServiceId, out var service))
                throw CatalogErrors.PackageServiceNotFound(item.SortOrder);
            if (service.Status == CatalogStatus.Discontinued && !alreadyInPackage.Contains(service.Id))
                throw CatalogErrors.PackageServiceDiscontinued(item.SortOrder, service.Name);
        }
    }

    private static void Apply(ServicePackage package, IPackageFields fields)
    {
        package.Name = fields.Name;
        package.Description = fields.Description;
        package.Price = fields.Price;
        package.ValidityDays = fields.ValidityDays;
        package.SaleStartDate = fields.SaleStartDate;
        package.SaleEndDate = fields.SaleEndDate;
    }

    private static List<ServicePackageItem> ToItems(ServicePackage package, IEnumerable<PackageItemRequest> items) => items
        .OrderBy(item => item.SortOrder)
        .Select(item => new ServicePackageItem
        {
            ServicePackageId = package.Id,
            SpaServiceId = item.SpaServiceId,
            SessionCount = item.SessionCount,
            SortOrder = item.SortOrder,
            MinDaysBetweenSessions = item.MinDaysBetweenSessions,
            Note = item.Note.TrimToNull(),
        })
        .ToList();

    // The detail (service names, fallback image) is read back with the same query as GET so both stay identical.
    private async Task<PackageDetailDto> ReloadAsync(Guid id, CancellationToken cancellationToken) =>
        await _packages.GetDetailAsync(id, publicOn: null, cancellationToken) ?? throw CatalogErrors.PackageNotFound();
}

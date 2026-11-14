using FluentValidation;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Reviews;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Reviews;
using NhuNguyetSpa.Application.UseCases.Catalog;

namespace NhuNguyetSpa.Application.UseCases.Reviews;

/// <summary>
/// UC-SPA-29 (BR-REV-02, 05, 06): the product must be visible to the caller exactly as on its detail page (<see cref="CatalogViewer"/>);
/// the summary covers every visible review, whatever the star filter.
/// </summary>
public sealed class ProductReviewService : IProductReviewService
{
    private readonly IReviewRepository _reviews;
    private readonly ISpaServiceRepository _services;
    private readonly IServicePackageRepository _packages;
    private readonly CatalogViewer _viewer;
    private readonly IValidator<ProductReviewFilter> _filterValidator;

    public ProductReviewService(
        IReviewRepository reviews,
        ISpaServiceRepository services,
        IServicePackageRepository packages,
        CatalogViewer viewer,
        IValidator<ProductReviewFilter> filterValidator)
    {
        _reviews = reviews;
        _services = services;
        _packages = packages;
        _viewer = viewer;
        _filterValidator = filterValidator;
    }

    public async Task<OperationResult<ProductReviewsDto>> GetForServiceAsync(
        Guid serviceId, PagedQuery query, ProductReviewFilter filter, CancellationToken cancellationToken)
    {
        await _filterValidator.ValidateAndThrowAsync(filter, cancellationToken);
        _ = await _services.GetDetailAsync(serviceId, publicOnly: !_viewer.IsOwner, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
        return await ReadAsync(CatalogItemType.Service, serviceId, query, filter, cancellationToken);
    }

    public async Task<OperationResult<ProductReviewsDto>> GetForPackageAsync(
        Guid packageId, PagedQuery query, ProductReviewFilter filter, CancellationToken cancellationToken)
    {
        await _filterValidator.ValidateAndThrowAsync(filter, cancellationToken);
        _ = await _packages.GetDetailAsync(packageId, _viewer.PublicOn, cancellationToken) ?? throw CatalogErrors.PackageNotFound();
        return await ReadAsync(CatalogItemType.Package, packageId, query, filter, cancellationToken);
    }

    private async Task<OperationResult<ProductReviewsDto>> ReadAsync(
        CatalogItemType type, Guid productId, PagedQuery query, ProductReviewFilter filter, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        var counts = await _reviews.GetRatingCountsAsync(type, productId, cancellationToken);
        var page = await _reviews.GetPublicPageAsync(type, productId, filter.Rating, query.PageNumber, query.PageSize, cancellationToken);
        return OperationResult<ProductReviewsDto>.Success(new ProductReviewsDto(RatingSummary.From(counts), page));
    }
}

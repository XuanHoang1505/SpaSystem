using FluentValidation;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;
using NhuNguyetSpa.Application.Mapping;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.UseCases.Catalog;

/// <summary>Service categories (Q-13, BR-CAT-10..14, docs/specs/catalog.md).</summary>
public sealed class ServiceCategoryService : IServiceCategoryService
{
    private readonly IServiceCategoryRepository _categories;
    private readonly CatalogViewer _viewer;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<CreateServiceCategoryRequest> _createValidator;
    private readonly IValidator<UpdateServiceCategoryRequest> _updateValidator;

    public ServiceCategoryService(
        IServiceCategoryRepository categories,
        CatalogViewer viewer,
        IUnitOfWork unitOfWork,
        IValidator<CreateServiceCategoryRequest> createValidator,
        IValidator<UpdateServiceCategoryRequest> updateValidator)
    {
        _categories = categories;
        _viewer = viewer;
        _unitOfWork = unitOfWork;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<OperationResult<IReadOnlyList<ServiceCategoryDto>>> ListAsync(CancellationToken cancellationToken) =>
        OperationResult<IReadOnlyList<ServiceCategoryDto>>.Success(
            await _categories.ListAsync(publicOnly: !_viewer.IsOwner, cancellationToken));

    public async Task<OperationResult<ServiceCategoryDto>> CreateAsync(CreateServiceCategoryRequest request, CancellationToken cancellationToken)
    {
        request = request with { Name = CatalogText.NormalizeName(request.Name), Description = request.Description.TrimToNull() };
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);
        await EnsureNameIsFreeAsync(request.Name, excludeId: null, cancellationToken);
        var category = new ServiceCategory
        {
            Name = request.Name,
            Description = request.Description,
            SortOrder = request.SortOrder ?? 0,
            IsActive = request.IsActive ?? true,
        };
        await _categories.AddAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<ServiceCategoryDto>.Success(category.ToDto(serviceCount: 0), "Đã thêm danh mục.");
    }

    public async Task<OperationResult<ServiceCategoryDto>> UpdateAsync(
        Guid id, UpdateServiceCategoryRequest request, CancellationToken cancellationToken)
    {
        request = request with { Name = CatalogText.NormalizeName(request.Name), Description = request.Description.TrimToNull() };
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var category = await _categories.GetByIdAsync(id, cancellationToken) ?? throw CatalogErrors.ServiceCategoryNotFound();
        await EnsureNameIsFreeAsync(request.Name, category.Id, cancellationToken);
        category.Name = request.Name;
        category.Description = request.Description;
        category.SortOrder = request.SortOrder;
        category.IsActive = request.IsActive;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var count = await _categories.CountServicesAsync(category.Id, cancellationToken);
        return OperationResult<ServiceCategoryDto>.Success(category.ToDto(count), "Đã cập nhật danh mục.");
    }

    /// <summary>Only an empty category can be deleted; otherwise hide it (BR-CAT-13).</summary>
    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var category = await _categories.GetByIdAsync(id, cancellationToken) ?? throw CatalogErrors.ServiceCategoryNotFound();
        if (await _categories.CountServicesAsync(category.Id, cancellationToken) > 0)
            throw CatalogErrors.ServiceCategoryInUse();
        _categories.Remove(category);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Friendly 409 before saving; the unique index still guards concurrent requests (UnitOfWork).</summary>
    private async Task EnsureNameIsFreeAsync(string name, Guid? excludeId, CancellationToken cancellationToken)
    {
        if (await _categories.NameExistsAsync(name, excludeId, cancellationToken))
            throw CatalogErrors.ServiceCategoryExists();
    }
}

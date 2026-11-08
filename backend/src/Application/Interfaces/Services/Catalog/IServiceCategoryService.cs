using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Interfaces.Services.Catalog;

/// <summary>Service categories as a table (Q-13): list for everyone, manage for the owner.</summary>
public interface IServiceCategoryService
{
    Task<OperationResult<IReadOnlyList<ServiceCategoryDto>>> ListAsync(CancellationToken cancellationToken);
    Task<OperationResult<ServiceCategoryDto>> CreateAsync(CreateServiceCategoryRequest request, CancellationToken cancellationToken);
    Task<OperationResult<ServiceCategoryDto>> UpdateAsync(Guid id, UpdateServiceCategoryRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

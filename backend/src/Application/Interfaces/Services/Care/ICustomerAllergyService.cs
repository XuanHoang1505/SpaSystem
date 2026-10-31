using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Care;

namespace NhuNguyetSpa.Application.Interfaces.Services.Care;

/// <summary>UC-SPA-27 A2: a customer's allergies (docs/specs/care.md BR-CARE-02, 06).</summary>
public interface ICustomerAllergyService
{
    Task<OperationResult<IReadOnlyList<CustomerAllergyDto>>> ListAsync(Guid customerId, CancellationToken cancellationToken);

    Task<OperationResult<CustomerAllergyDto>> CreateAsync(Guid customerId, SaveAllergyRequest request, CancellationToken cancellationToken);

    Task<OperationResult<CustomerAllergyDto>> UpdateAsync(Guid customerId, Guid id, SaveAllergyRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(Guid customerId, Guid id, CancellationToken cancellationToken);
}

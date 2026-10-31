using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>Allergies of a customer (UC-SPA-27 A2); every method takes the customer id so rows of others never come back.</summary>
public interface ICustomerAllergyRepository : IRepository<CustomerAllergy>
{
    Task<bool> CustomerExistsAsync(Guid customerId, CancellationToken cancellationToken);

    /// <summary>Most severe first, then by allergen (BR-CARE-02).</summary>
    Task<IReadOnlyList<CustomerAllergyDto>> ListAsync(Guid customerId, CancellationToken cancellationToken);

    /// <summary>Tracked; null when missing or another customer's.</summary>
    Task<CustomerAllergy?> GetAsync(Guid customerId, Guid id, CancellationToken cancellationToken);

    /// <summary>Whether the customer already has <paramref name="allergen"/>, ignoring case and accents, except <paramref name="excludeId"/>.</summary>
    Task<bool> AllergenExistsAsync(Guid customerId, string allergen, Guid? excludeId, CancellationToken cancellationToken);
}

using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class CustomerAllergyRepository : Repository<CustomerAllergy>, ICustomerAllergyRepository
{
    public CustomerAllergyRepository(AppDbContext context) : base(context)
    {
    }

    public Task<bool> CustomerExistsAsync(Guid customerId, CancellationToken cancellationToken) =>
        Context.Customers.AnyAsync(customer => customer.Id == customerId, cancellationToken);

    public async Task<IReadOnlyList<CustomerAllergyDto>> ListAsync(Guid customerId, CancellationToken cancellationToken) =>
        await Set.AsNoTracking()
            .Where(allergy => allergy.CustomerId == customerId)
            .OrderBy(allergy => allergy.Severity == AllergySeverity.Severe ? 0 : allergy.Severity == AllergySeverity.Moderate ? 1 : 2)
            .ThenBy(allergy => allergy.Allergen)
            .Select(allergy => new CustomerAllergyDto(allergy.Id, allergy.Allergen, allergy.Severity, allergy.Note, allergy.RecordedAtUtc))
            .ToListAsync(cancellationToken);

    public Task<CustomerAllergy?> GetAsync(Guid customerId, Guid id, CancellationToken cancellationToken) =>
        Set.FirstOrDefaultAsync(allergy => allergy.Id == id && allergy.CustomerId == customerId, cancellationToken);

    public Task<bool> AllergenExistsAsync(Guid customerId, string allergen, Guid? excludeId, CancellationToken cancellationToken)
    {
        var key = allergen.Trim().ToLower();
        return Set.AnyAsync(allergy => allergy.CustomerId == customerId && allergy.Id != excludeId &&
                                       AppDbContext.Unaccent(allergy.Allergen.Trim().ToLower()) == AppDbContext.Unaccent(key),
            cancellationToken);
    }
}

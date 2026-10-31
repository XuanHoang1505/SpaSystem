using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Purchases;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Purchases;

/// <summary>
/// UC-SPA-18 (docs/specs/purchases-treatments.md): stored rows become effective statuses (BR-TRT-04) and <c>canBook</c> /
/// <c>nextSession</c> follow the same rules as booking (BR-TRT-05, <see cref="EntitlementEligibility"/>).
/// </summary>
public sealed class PurchaseService : IPurchaseService
{
    private static readonly IReadOnlyDictionary<string, EntitlementStatus> ServiceStatuses = new Dictionary<string, EntitlementStatus>
    {
        ["available"] = EntitlementStatus.Available,
        ["booked"] = EntitlementStatus.Booked,
        ["used"] = EntitlementStatus.Used,
        ["expired"] = EntitlementStatus.Expired,
    };

    private static readonly IReadOnlyDictionary<string, CustomerPackageStatus> PackageStatuses = new Dictionary<string, CustomerPackageStatus>
    {
        ["active"] = CustomerPackageStatus.Active,
        ["completed"] = CustomerPackageStatus.Completed,
        ["expired"] = CustomerPackageStatus.Expired,
        ["cancelled"] = CustomerPackageStatus.Cancelled,
    };

    private readonly IPurchaseRepository _purchases;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<PurchasesOptions> _options;
    private readonly IValidator<PurchaseListQuery> _validator;

    public PurchaseService(IPurchaseRepository purchases, ICurrentUserService currentUser, IDateTimeProvider clock,
        IOptions<PurchasesOptions> options, IValidator<PurchaseListQuery> validator)
    {
        _purchases = purchases;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _validator = validator;
    }

    private Guid CustomerId => _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized");

    public async Task<OperationResult<PurchasesDto>> ListAsync(PurchaseListQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        await _validator.ValidateAndThrowAsync(query, cancellationToken);
        var customerId = CustomerId;
        var max = _options.Value.MaxListItems;
        var nowUtc = _clock.UtcNow;

        IReadOnlyList<PurchasedServiceDto> services = [];
        if (query.Type is null or "service")
        {
            EntitlementStatus? wanted = query.Status is null ? null : ServiceStatuses[query.Status];
            services = (await _purchases.ListServicesAsync(customerId, max, cancellationToken))
                .Select(row => ToDto(row, nowUtc))
                .Where(dto => wanted is null || dto.Status == wanted)
                .ToList();
        }

        IReadOnlyList<PurchasedPackageDto> packages = [];
        if (query.Type is null or "package")
        {
            CustomerPackageStatus? wanted = query.Status is null ? null : PackageStatuses[query.Status];
            packages = (await _purchases.ListPackagesAsync(customerId, max, cancellationToken))
                .Select(row => ToDto(row, nowUtc))
                .Where(dto => wanted is null || dto.Status == wanted)
                .ToList();
        }
        return OperationResult<PurchasesDto>.Success(new PurchasesDto(services, packages));
    }

    public async Task<OperationResult<PurchasedServiceDto>> GetServiceAsync(Guid id, CancellationToken cancellationToken)
    {
        var row = await _purchases.GetServiceAsync(id, CustomerId, cancellationToken) ?? throw BookingErrors.EntitlementNotFound();
        return OperationResult<PurchasedServiceDto>.Success(ToDto(row, _clock.UtcNow));
    }

    public async Task<OperationResult<PurchasedPackageDto>> GetPackageAsync(Guid id, CancellationToken cancellationToken)
    {
        var row = await _purchases.GetPackageAsync(id, CustomerId, withItems: true, cancellationToken) ?? throw PurchaseErrors.CustomerPackageNotFound();
        return OperationResult<PurchasedPackageDto>.Success(ToDto(row, _clock.UtcNow));
    }

    private static PurchasedServiceDto ToDto(PurchasedServiceRow row, DateTime nowUtc) => new(
        row.Id, row.SpaServiceId, row.ServiceName, row.ImageUrl, row.DurationMinutes,
        PurchaseStatus.Effective(row.Status, row.ExpiresAtUtc, nowUtc), row.ExpiresAtUtc, row.PurchasedAtUtc,
        EntitlementEligibility.ForService(row.Status, row.ExpiresAtUtc, nowUtc) is null, row.Appointment, row.Order);

    private static PurchasedPackageDto ToDto(PurchasedPackageRow row, DateTime nowUtc)
    {
        NextSessionDto? next = null;
        if (row.NextSession is { } facts)
        {
            var eligibility = EntitlementEligibility.ForSession(facts, nowUtc);
            next = new NextSessionDto(facts.SessionId, facts.SequenceNumber, facts.SpaServiceId, row.NextSessionServiceName ?? string.Empty,
                facts.DurationMinutes, eligibility.CanBook, eligibility.EarliestDate);
        }
        return new PurchasedPackageDto(
            row.Id, row.ServicePackageId, row.PackageName, row.ImageUrl, PurchaseStatus.Effective(row.Status, row.ExpiresAtUtc, nowUtc),
            row.PurchasedAtUtc, row.ActivatedAtUtc, row.ExpiresAtUtc, row.TotalSessions, row.UsedSessions, row.BookedSessions,
            new PurchaseTreatmentPlanDto(row.TreatmentPlanId, row.TreatmentPlanStatus), next, row.Items, row.Order);
    }
}

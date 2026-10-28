using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Payments;

/// <summary>
/// BR-ORD-06: what a paid order gives the customer. Each service line → one <see cref="ServiceEntitlement"/>; each package line →
/// <see cref="CustomerPackage"/> + <see cref="TreatmentPlan"/> + its <see cref="TreatmentSession"/>s in sort order. Runs inside
/// the caller's transaction; unique <c>order_item_id</c> columns stop a second issue.
/// </summary>
public sealed class EntitlementIssuer
{
    private readonly IRepository<ServiceEntitlement> _entitlements;
    private readonly IRepository<CustomerPackage> _customerPackages;
    private readonly IRepository<TreatmentPlan> _plans;
    private readonly IServicePackageRepository _packages;
    private readonly ICartRepository _carts;

    public EntitlementIssuer(
        IRepository<ServiceEntitlement> entitlements,
        IRepository<CustomerPackage> customerPackages,
        IRepository<TreatmentPlan> plans,
        IServicePackageRepository packages,
        ICartRepository carts)
    {
        _entitlements = entitlements;
        _customerPackages = customerPackages;
        _plans = plans;
        _packages = packages;
        _carts = carts;
    }

    public async Task IssueAsync(Order order, DateTime paidAtUtc, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(order);
        var serviceLines = order.Items.Where(item => item.SpaServiceId != null).ToList();
        var packageLines = order.Items.Where(item => item.ServicePackageId != null).ToList();

        foreach (var line in serviceLines)
        {
            // Q-06: single services have no expiry for now.
            await _entitlements.AddAsync(new ServiceEntitlement
            {
                CustomerId = order.CustomerId,
                OrderItemId = line.Id,
                Status = EntitlementStatus.Available,
            }, cancellationToken);
        }

        if (packageLines.Count > 0)
        {
            // Q-23: package contents and validity are read now, at payment time (order lines keep only name and price).
            var packages = (await _packages.GetForFulfilmentAsync(packageLines.Select(line => line.ServicePackageId!.Value).Distinct().ToList(),
                cancellationToken)).ToDictionary(package => package.Id);
            foreach (var line in packageLines)
            {
                var package = packages.GetValueOrDefault(line.ServicePackageId!.Value)
                              ?? throw new InvalidOperationException($"Package {line.ServicePackageId} of order {order.Code} no longer exists.");
                await IssuePackageAsync(order, line, package, paidAtUtc, cancellationToken);
            }
        }

        await _carts.RemoveProductsAsync(order.CustomerId,
            serviceLines.Select(line => line.SpaServiceId!.Value).Distinct().ToList(),
            packageLines.Select(line => line.ServicePackageId!.Value).Distinct().ToList(),
            cancellationToken);
    }

    private async Task IssuePackageAsync(Order order, OrderItem line, ServicePackage package, DateTime paidAtUtc, CancellationToken cancellationToken)
    {
        var items = package.Items.OrderBy(item => item.SortOrder).ToList();
        var bought = new CustomerPackage
        {
            CustomerId = order.CustomerId,
            OrderItemId = line.Id,
            PackageName = line.ProductName,
            PurchasedAtUtc = paidAtUtc,
            // Q-10: a package starts its validity when paid.
            ActivatedAtUtc = paidAtUtc,
            ExpiresAtUtc = paidAtUtc.AddDays(package.ValidityDays),
            TotalSessions = items.Sum(item => item.SessionCount),
            UsedSessions = 0,
            Status = CustomerPackageStatus.Active,
        };
        var plan = new TreatmentPlan { CustomerPackageId = bought.Id, Status = TreatmentPlanStatus.NotStarted };
        var sequence = 0;
        foreach (var item in items)
        {
            for (var session = 0; session < item.SessionCount; session++)
            {
                plan.Sessions.Add(new TreatmentSession
                {
                    TreatmentPlanId = plan.Id,
                    SpaServiceId = item.SpaServiceId,
                    SequenceNumber = ++sequence,
                    ServiceName = item.SpaService.Name,
                    DurationMinutes = item.SpaService.DurationMinutes,
                    Status = TreatmentSessionStatus.NotBooked,
                });
            }
        }

        await _customerPackages.AddAsync(bought, cancellationToken);
        await _plans.AddAsync(plan, cancellationToken);
    }
}

using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>The installment plans an order can take, or why it cannot (<see cref="UnavailableMessage"/>).</summary>
public sealed record InstallmentPlans(IReadOnlyList<InstallmentOptionDto> Options, string? UnavailableMessage)
{
    public InstallmentOptionDto? For(int installmentCount) =>
        Options.FirstOrDefault(option => option.InstallmentCount == installmentCount);
}

/// <summary>
/// Which installment plans an order may use (BR-INS-01) and what each installment costs (BR-INS-02, 03). Preview and order
/// creation both call it, so they always agree. The package's sessions are numbered exactly as <c>EntitlementIssuer</c> will
/// create them: components by sort order, each repeated for its session count.
/// </summary>
public sealed class InstallmentPlanning
{
    private readonly IServicePackageRepository _packages;
    private readonly IPaymentGateway _gateway;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<InstallmentOptions> _options;

    public InstallmentPlanning(IServicePackageRepository packages, IPaymentGateway gateway, IDateTimeProvider clock,
        IOptions<InstallmentOptions> options)
    {
        _packages = packages;
        _gateway = gateway;
        _clock = clock;
        _options = options;
    }

    public async Task<InstallmentPlans> PlanAsync(IReadOnlyList<PricedOrderLine> lines, decimal grandTotal, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(lines);
        var settings = _options.Value;
        if (!settings.Enabled)
            return Unavailable("Hiện spa chưa nhận trả theo đợt.");
        if (lines.Count != 1 || lines[0].Type != CatalogItemType.Package)
            return Unavailable("Chỉ đơn có đúng một gói dịch vụ mới trả theo đợt được.");
        var package = await _packages.GetDetailAsync(lines[0].ProductId, SpaTime.Today(_clock.UtcNow), cancellationToken);
        if (package is null)
            return Unavailable("Gói dịch vụ không còn mở bán.");

        var sessions = package.Items.OrderBy(item => item.SortOrder)
            .SelectMany(item => Enumerable.Repeat((item.ServiceName, item.ServicePrice), item.SessionCount))
            .ToList();
        if (sessions.Count < 2)
            return Unavailable("Gói cần từ 2 buổi trở lên mới trả theo đợt được.");
        if (grandTotal < settings.MinOrderTotal)
            return Unavailable($"Đơn từ {settings.MinOrderTotal:N0} đ trở lên mới trả theo đợt được.");

        var weights = sessions.Select(session => session.ServicePrice).ToList();
        var options = new List<InstallmentOptionDto>();
        for (var count = 2; count <= Math.Min(settings.MaxInstallments, sessions.Count); count++)
        {
            var shares = InstallmentPlanner.Plan(grandTotal, weights, count, settings.RoundingUnit);
            // Every installment is its own gateway payment, so each one must reach the gateway minimum.
            if (shares.Any(share => share.Amount < _gateway.MinAmount))
                continue;
            options.Add(new InstallmentOptionDto(count, shares.Select(share => new InstallmentPreviewDto(
                share.SequenceNumber, share.FirstSessionNumber, share.LastSessionNumber, share.Amount,
                Services(sessions, share.FirstSessionNumber, share.LastSessionNumber))).ToList()));
        }
        return options.Count == 0
            ? Unavailable("Không chia được đợt nào đạt số tiền thanh toán tối thiểu.")
            : new InstallmentPlans(options, null);
    }

    /// <summary>The option the customer asked for, or <c>400 installment_not_available</c> with the reason.</summary>
    public static InstallmentOptionDto Require(InstallmentPlans plans, int installmentCount)
    {
        ArgumentNullException.ThrowIfNull(plans);
        if (plans.For(installmentCount) is { } option)
            return option;
        var message = plans.UnavailableMessage
                      ?? $"Gói này chỉ trả được {string.Join(" hoặc ", plans.Options.Select(item => item.InstallmentCount))} đợt.";
        throw OrderErrors.InstallmentNotAvailable(message);
    }

    /// <summary>Services of sessions <paramref name="first"/>..<paramref name="last"/>, grouped in order, e.g. "Chăm sóc da × 2, Massage × 1".</summary>
    private static List<InstallmentServiceDto> Services(IReadOnlyList<(string Name, decimal Price)> sessions, int first, int last)
    {
        var services = new List<InstallmentServiceDto>();
        foreach (var (name, _) in sessions.Skip(first - 1).Take(last - first + 1))
        {
            if (services.Count > 0 && services[^1].Name == name)
                services[^1] = services[^1] with { SessionCount = services[^1].SessionCount + 1 };
            else
                services.Add(new InstallmentServiceDto(name, 1));
        }
        return services;
    }

    private static InstallmentPlans Unavailable(string message) => new([], message);
}

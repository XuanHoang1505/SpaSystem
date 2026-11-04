using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.AiAssistant;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.Interfaces.Ai;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;
using NhuNguyetSpa.Application.Interfaces.Services.Purchases;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.AiAssistant;

/// <summary>
/// Runs the model's tool calls on the existing services for one chat (scoped per request) and collects the product cards
/// and booking proposals (BR-AI-02, 05, 07, 08). Personal tools rely on the services reading the signed-in customer;
/// results carry only what the assistant needs. Nothing here writes data.
/// </summary>
public sealed class AiToolExecutor : IAiToolInvoker
{
    private const string InvalidArguments = "Tham số không hợp lệ.";
    private const string SignInRequired = "Bạn cần đăng nhập để xem thông tin cá nhân.";
    private const int MaxSlotTimes = 20;
    private const int MaxAppointments = 10;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower) },
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly IServiceCatalogService _services;
    private readonly IPackageCatalogService _packages;
    private readonly IAvailabilityService _availability;
    private readonly IMyAppointmentService _appointments;
    private readonly IPurchaseService _purchases;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly AiOptions _options;
    private readonly List<AiProductSuggestionDto> _suggestions = [];
    private readonly List<AiBookingProposalDto> _proposals = [];
    private readonly HashSet<string> _proposalKeys = [];
    private PurchasesDto? _purchaseCache;

    public AiToolExecutor(
        IServiceCatalogService services,
        IPackageCatalogService packages,
        IAvailabilityService availability,
        IMyAppointmentService appointments,
        IPurchaseService purchases,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<AiOptions> options)
    {
        _services = services;
        _packages = packages;
        _availability = availability;
        _appointments = appointments;
        _purchases = purchases;
        _currentUser = currentUser;
        _clock = clock;
        _options = options.Value;
    }

    public IReadOnlyList<AiProductSuggestionDto> Suggestions => _suggestions;

    public IReadOnlyList<AiBookingProposalDto> BookingProposals => _proposals;

    private bool IsCustomer => _currentUser.IsAuthenticated && _currentUser.Roles.Contains(Roles.Customer);

    public async Task<string> InvokeAsync(string name, JsonElement arguments, CancellationToken cancellationToken)
    {
        try
        {
            object result = name switch
            {
                AiToolCatalog.SearchCatalog => await SearchAsync(arguments, cancellationToken),
                AiToolCatalog.GetProductDetail => await DetailAsync(arguments, cancellationToken),
                AiToolCatalog.FindAvailableSlots => await SlotsAsync(arguments, cancellationToken),
                AiToolCatalog.ListMyAppointments => await MyAppointmentsAsync(cancellationToken),
                AiToolCatalog.ListMyPackages => await MyPackagesAsync(cancellationToken),
                AiToolCatalog.SuggestProducts => await SuggestAsync(arguments, cancellationToken),
                AiToolCatalog.ProposeBooking => await ProposeAsync(arguments, cancellationToken),
                AiToolCatalog.FinalAnswer => new { ok = true },
                _ => Error("Công cụ không tồn tại."),
            };
            return JsonSerializer.Serialize(result, JsonOptions);
        }
        catch (ToolArgumentException)
        {
            return JsonSerializer.Serialize(Error(InvalidArguments), JsonOptions);
        }
        catch (DomainException exception)
        {
            return JsonSerializer.Serialize(Error(exception.Message), JsonOptions);
        }
        catch (ValidationException exception)
        {
            var message = string.Join(" ", exception.Errors.Select(error => error.ErrorMessage).Distinct());
            return JsonSerializer.Serialize(Error(message.Length > 0 ? message : InvalidArguments), JsonOptions);
        }
    }

    private async Task<object> SearchAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var keyword = OptionalString(args, "keyword");
        var type = OptionalProductType(args, "productType");
        var maxPrice = OptionalDecimal(args, "maxPrice");
        var limit = _options.SearchResultLimit;
        var paging = new PagedQuery { Search = keyword, PageNumber = 1, PageSize = limit };
        var products = new List<(string Name, object Item)>();
        if (type is null or AiProductType.Service)
        {
            var services = Data(await _services.SearchAsync(paging, new ServiceFilter { MaxPrice = maxPrice }, cancellationToken));
            products.AddRange(services.Items.Select(service => (service.Name, (object)new
            {
                productType = AiProductType.Service, service.Id, service.Name, service.Category, service.Price, service.DurationMinutes,
            })));
        }
        if (type is null or AiProductType.Package)
        {
            var packages = Data(await _packages.SearchAsync(paging, new PackageFilter { MaxPrice = maxPrice }, cancellationToken));
            products.AddRange(packages.Items.Select(package => (package.Name, (object)new
            {
                productType = AiProductType.Package, package.Id, package.Name, package.Price, package.TotalSessions, package.ValidityDays,
            })));
        }
        return new { products = products.OrderBy(product => product.Name, StringComparer.CurrentCulture).Take(limit).Select(product => product.Item) };
    }

    private async Task<object> DetailAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var type = OptionalProductType(args, "productType") ?? throw new ToolArgumentException();
        var id = RequiredGuid(args, "id");
        if (type == AiProductType.Service)
        {
            var service = Data(await _services.GetAsync(id, cancellationToken));
            return new
            {
                productType = AiProductType.Service, service.Id, service.Name, service.Category, service.Description, service.Price,
                service.DurationMinutes,
            };
        }
        var package = Data(await _packages.GetAsync(id, cancellationToken));
        return new
        {
            productType = AiProductType.Package, package.Id, package.Name, package.Description, package.Price, package.TotalSessions,
            package.ValidityDays, package.SaleEndDate,
            items = package.Items.OrderBy(item => item.SortOrder)
                .Select(item => new { item.ServiceName, item.SessionCount, item.MinDaysBetweenSessions }),
        };
    }

    private async Task<object> SlotsAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var query = new AvailabilityQuery(RequiredGuid(args, "serviceId"), RequiredDate(args, "date"), null, null);
        var availability = Data(await _availability.GetAsync(query, cancellationToken));
        var slots = availability.Staff
            .SelectMany(staff => staff.Slots.Select(slot => (Slot: slot, Staff: staff)))
            .GroupBy(entry => entry.Slot.StartTime)
            .OrderBy(group => group.Key)
            .Take(MaxSlotTimes)
            .Select(group => new
            {
                startTime = Time(group.Key),
                endTime = Time(group.First().Slot.EndTime),
                staff = group.Select(entry => new { entry.Staff.Id, name = entry.Staff.FullName }),
            });
        return new { availability.Date, availability.DurationMinutes, slots };
    }

    private async Task<object> MyAppointmentsAsync(CancellationToken cancellationToken)
    {
        if (!IsCustomer)
            return Error(SignInRequired);
        var page = Data(await _appointments.ListAsync(new PagedQuery { PageNumber = 1, PageSize = MaxAppointments },
            new MyAppointmentListQuery { Scope = "upcoming" }, cancellationToken));
        return new
        {
            appointments = page.Items.Select(appointment => new
            {
                appointment.Date,
                startTime = Time(appointment.StartTime),
                endTime = Time(appointment.EndTime),
                serviceName = appointment.Service.Name,
                staffName = appointment.Staff.FullName,
                appointment.Status,
            }),
        };
    }

    private async Task<object> MyPackagesAsync(CancellationToken cancellationToken)
    {
        if (!IsCustomer)
            return Error(SignInRequired);
        var purchases = await PurchasesAsync(cancellationToken);
        return new
        {
            packages = purchases.Packages.Select(package => new
            {
                customerPackageId = package.Id,
                package.PackageName,
                package.Status,
                package.TotalSessions,
                package.UsedSessions,
                remainingSessions = package.TotalSessions - package.UsedSessions,
                expiresOn = VietnamDate(package.ExpiresAtUtc),
                nextSession = package.NextSession is { } next
                    ? new { treatmentSessionId = next.Id, next.SequenceNumber, next.ServiceName, next.EarliestDate, next.CanBook }
                    : null,
            }),
            services = purchases.Services
                .Where(service => service.CanBook || service.Status == EntitlementStatus.Available)
                .Select(service => new
                {
                    serviceEntitlementId = service.Id, service.ServiceName, service.CanBook, expiresOn = VietnamDate(service.ExpiresAtUtc),
                }),
        };
    }

    private async Task<object> SuggestAsync(JsonElement args, CancellationToken cancellationToken)
    {
        if (!args.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array)
            throw new ToolArgumentException();
        var accepted = 0;
        foreach (var item in items.EnumerateArray())
        {
            if (_suggestions.Count >= _options.MaxSuggestions)
                break;
            if (ReadProduct(item) is not var (type, id) || _suggestions.Any(suggestion => suggestion.ProductId == id))
                continue;
            try
            {
                _suggestions.Add(await SuggestionAsync(type, id, cancellationToken));
                accepted++;
            }
            catch (DomainException)
            {
                // Stopped or unknown products are skipped silently (BR-AI-05).
            }
        }
        return new { accepted };
    }

    private async Task<AiProductSuggestionDto> SuggestionAsync(AiProductType type, Guid id, CancellationToken cancellationToken)
    {
        if (type == AiProductType.Service)
        {
            var service = Data(await _services.GetAsync(id, cancellationToken));
            return new AiProductSuggestionDto(type, id, service.Name, service.Price, $"/services/{id}");
        }
        var package = Data(await _packages.GetAsync(id, cancellationToken));
        return new AiProductSuggestionDto(type, id, package.Name, package.Price, $"/packages/{id}");
    }

    private static (AiProductType Type, Guid Id)? ReadProduct(JsonElement item)
    {
        if (item.ValueKind != JsonValueKind.Object)
            return null;
        try
        {
            return OptionalProductType(item, "productType") is { } type && OptionalGuid(item, "id") is { } id ? (type, id) : null;
        }
        catch (ToolArgumentException)
        {
            return null;
        }
    }

    private async Task<object> ProposeAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var serviceId = OptionalGuid(args, "spaServiceId");
        var entitlementId = OptionalGuid(args, "serviceEntitlementId");
        var sessionId = OptionalGuid(args, "treatmentSessionId");
        if (new[] { serviceId, entitlementId, sessionId }.Count(id => id.HasValue) != 1)
            throw new ToolArgumentException();
        var date = RequiredDate(args, "date");
        var startTime = RequiredTime(args, "startTime");
        var staffId = OptionalGuid(args, "staffMemberId");
        if (serviceId is null && !IsCustomer)
            return Error(SignInRequired);

        var sourceId = (serviceId ?? entitlementId ?? sessionId)!.Value;
        if (!_proposalKeys.Add($"{sourceId}|{date:yyyy-MM-dd}|{startTime:HH\\:mm}|{staffId}"))
            return new { ok = true, alreadyProposed = true };
        if (_proposals.Count >= _options.MaxBookingProposals)
            return Error("Đã đủ số lịch đề xuất.");

        var query = new AvailabilityQuery
        {
            SpaServiceId = serviceId, ServiceEntitlementId = entitlementId, TreatmentSessionId = sessionId, Date = date, StaffMemberId = staffId,
        };
        var availability = Data(await _availability.GetAsync(query, cancellationToken));
        var match = availability.Staff
            .Where(staff => staffId is null || staff.Id == staffId)
            .SelectMany(staff => staff.Slots.Where(slot => slot.StartTime == startTime).Select(slot => (Staff: staff, Slot: slot)))
            .FirstOrDefault();
        if (match.Staff is null)
        {
            _proposalKeys.Remove($"{sourceId}|{date:yyyy-MM-dd}|{startTime:HH\\:mm}|{staffId}");
            return Error("Giờ này không còn trống, hãy chọn giờ khác.");
        }

        var (kind, parameter) = serviceId is not null ? (AiBookingKind.BookNow, "serviceId")
            : entitlementId is not null ? (AiBookingKind.BookEntitlement, "serviceEntitlementId")
            : (AiBookingKind.BookSession, "treatmentSessionId");
        var serviceName = await ProposalServiceNameAsync(serviceId, entitlementId, sessionId, cancellationToken);
        var path = $"/booking/new?{parameter}={sourceId}&date={date:yyyy-MM-dd}&startTime={Time(startTime)}" +
                   (staffId is null ? string.Empty : $"&staffMemberId={staffId}");
        var proposal = new AiBookingProposalDto(kind, serviceId, entitlementId, sessionId, serviceName, date, startTime, match.Slot.EndTime,
            staffId, staffId is null ? null : match.Staff.FullName, path);
        _proposals.Add(proposal);
        return new
        {
            ok = true, proposal.ServiceName, proposal.Date, startTime = Time(proposal.StartTime), endTime = Time(proposal.EndTime),
            staffName = match.Staff.FullName,
        };
    }

    private async Task<string> ProposalServiceNameAsync(Guid? serviceId, Guid? entitlementId, Guid? sessionId, CancellationToken cancellationToken)
    {
        if (serviceId is { } id)
            return Data(await _services.GetAsync(id, cancellationToken)).Name;
        var purchases = await PurchasesAsync(cancellationToken);
        return entitlementId is { } entitlement
            ? purchases.Services.FirstOrDefault(service => service.Id == entitlement)?.ServiceName ?? "Dịch vụ đã mua"
            : purchases.Packages.Select(package => package.NextSession).FirstOrDefault(next => next?.Id == sessionId)?.ServiceName ?? "Buổi trong gói";
    }

    private async Task<PurchasesDto> PurchasesAsync(CancellationToken cancellationToken) =>
        _purchaseCache ??= Data(await _purchases.ListAsync(new PurchaseListQuery(null, null), cancellationToken));

    private static T Data<T>(OperationResult<T> result) =>
        result is { IsSuccess: true, Data: { } data } ? data : throw new BusinessRuleException(result.Message ?? InvalidArguments);

    private static object Error(string message) => new { error = message };

    private static string Time(TimeOnly time) => time.ToString("HH:mm", CultureInfo.InvariantCulture);

    private static DateOnly? VietnamDate(DateTime? utc) => utc is { } value ? SpaTime.Today(value) : null;

    private static string? OptionalString(JsonElement args, string name)
    {
        if (!args.TryGetProperty(name, out var value) || value.ValueKind == JsonValueKind.Null)
            return null;
        if (value.ValueKind != JsonValueKind.String)
            throw new ToolArgumentException();
        var text = value.GetString()!.Trim();
        return text.Length == 0 ? null : text;
    }

    private static decimal? OptionalDecimal(JsonElement args, string name) =>
        !args.TryGetProperty(name, out var value) || value.ValueKind == JsonValueKind.Null ? null
        : value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var number) ? number
        : throw new ToolArgumentException();

    private static Guid? OptionalGuid(JsonElement args, string name) =>
        OptionalString(args, name) is not { } text ? null
        : Guid.TryParse(text, out var id) ? id
        : throw new ToolArgumentException();

    private static Guid RequiredGuid(JsonElement args, string name) => OptionalGuid(args, name) ?? throw new ToolArgumentException();

    private static DateOnly RequiredDate(JsonElement args, string name) =>
        DateOnly.TryParseExact(OptionalString(args, name), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : throw new ToolArgumentException();

    private static TimeOnly RequiredTime(JsonElement args, string name) =>
        TimeOnly.TryParseExact(OptionalString(args, name), "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var time)
            ? time
            : throw new ToolArgumentException();

    private static AiProductType? OptionalProductType(JsonElement args, string name) =>
        OptionalString(args, name) switch
        {
            null => null,
            "service" => AiProductType.Service,
            "package" => AiProductType.Package,
            _ => throw new ToolArgumentException(),
        };

    private sealed class ToolArgumentException : Exception;
}

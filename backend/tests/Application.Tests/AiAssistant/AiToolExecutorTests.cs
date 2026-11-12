using System.Text.Json;
using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.AiAssistant;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;
using NhuNguyetSpa.Application.Interfaces.Services.Purchases;
using NhuNguyetSpa.Application.UseCases.AiAssistant;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.AiAssistant;

/// <summary>Tools run on real services (docs/specs/ai-assistant.md: BR-AI-02, 05, 07, 08, AI-T05…T07, AI-T17).</summary>
public sealed class AiToolExecutorTests
{
    private static readonly DateOnly Day = new(2026, 11, 7);
    private static readonly Guid ServiceId = Guid.NewGuid();
    private static readonly Guid StaffId = Guid.NewGuid();

    private readonly IServiceCatalogService _services = Substitute.For<IServiceCatalogService>();
    private readonly IPackageCatalogService _packages = Substitute.For<IPackageCatalogService>();
    private readonly IAvailabilityService _availability = Substitute.For<IAvailabilityService>();
    private readonly IMyAppointmentService _appointments = Substitute.For<IMyAppointmentService>();
    private readonly IPurchaseService _purchases = Substitute.For<IPurchaseService>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly IDateTimeProvider _clock = Substitute.For<IDateTimeProvider>();

    public AiToolExecutorTests()
    {
        _clock.UtcNow.Returns(new DateTime(2026, 11, 2, 3, 0, 0, DateTimeKind.Utc));
        _services.GetAsync(ServiceId, Arg.Any<CancellationToken>()).Returns(OperationResult<ServiceDetailDto>.Success(Service(ServiceId, "Chăm sóc da mặt", 350_000)));
        _availability.GetAsync(Arg.Any<AvailabilityQuery>(), Arg.Any<CancellationToken>())
            .Returns(OperationResult<AvailabilityDto>.Success(new AvailabilityDto(Day, 60,
                [new AvailableStaffDto(StaffId, "Lan", [new TimeSlotDto(new TimeOnly(9, 0), new TimeOnly(10, 0))])])));
    }

    [Fact]
    public async Task PackagesAreOnlyTheCallersAndMinimal()
    {
        var executor = Create(customer: true);
        var sessionId = Guid.NewGuid();
        _purchases.ListAsync(Arg.Any<PurchaseListQuery>(), Arg.Any<CancellationToken>())
            .Returns(OperationResult<PurchasesDto>.Success(new PurchasesDto([], [Package(sessionId, total: 10, used: 3)])));

        var json = await executor.InvokeAsync("list_my_packages", Args("{}"), CancellationToken.None);

        var package = JsonDocument.Parse(json).RootElement.GetProperty("packages")[0];
        package.GetProperty("remainingSessions").GetInt32().Should().Be(7);
        package.GetProperty("nextSession").GetProperty("treatmentSessionId").GetGuid().Should().Be(sessionId);
        json.Should().NotContain("\"order\"").And.NotContain("imageUrl");
        await _purchases.Received(1).ListAsync(Arg.Any<PurchaseListQuery>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GuestCannotInvokeCustomerTools()
    {
        var executor = Create(customer: false);

        (await executor.InvokeAsync("list_my_packages", Args("{}"), CancellationToken.None))
            .Should().Contain("Bạn cần đăng nhập để xem thông tin cá nhân.");
        (await executor.InvokeAsync("list_my_appointments", Args("{}"), CancellationToken.None))
            .Should().Contain("Bạn cần đăng nhập để xem thông tin cá nhân.");
        await _purchases.DidNotReceiveWithAnyArgs().ListAsync(default!, default);
        await _appointments.DidNotReceiveWithAnyArgs().ListAsync(default!, default!, default);
    }

    [Fact]
    public async Task AppointmentsAreUpcomingOnly()
    {
        var executor = Create(customer: true);
        _appointments.ListAsync(Arg.Any<PagedQuery>(), Arg.Any<MyAppointmentListQuery>(), Arg.Any<CancellationToken>())
            .Returns(OperationResult<PagedResult<MyAppointmentListItemDto>>.Success(new PagedResult<MyAppointmentListItemDto>([
                new MyAppointmentListItemDto(Guid.NewGuid(), Day, new TimeOnly(9, 0), new TimeOnly(10, 0), AppointmentStatus.Confirmed, null,
                    new AppointmentServiceDto(ServiceId, "Chăm sóc da mặt"), new AppointmentStaffDto(StaffId, "Lan"), AppointmentBookingSource.Entitlement, null),
            ], 1, 10, 1)));

        var json = await executor.InvokeAsync("list_my_appointments", Args("{}"), CancellationToken.None);

        json.Should().Contain("Chăm sóc da mặt").And.Contain("09:00").And.Contain("Lan");
        await _appointments.Received(1).ListAsync(Arg.Is<PagedQuery>(paging => paging.PageSize == 10),
            Arg.Is<MyAppointmentListQuery>(query => query.Scope == "upcoming"), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SearchMergesAndLimits()
    {
        var executor = Create(customer: false);
        _services.SearchAsync(Arg.Any<PagedQuery>(), Arg.Any<ServiceFilter>(), Arg.Any<CancellationToken>())
            .Returns(OperationResult<PagedResult<ServiceListItemDto>>.Success(new PagedResult<ServiceListItemDto>(
                new[] { "D", "B", "F", "H" }.Select(name => new ServiceListItemDto(Guid.NewGuid(), name, Guid.Empty, "Da mặt", 100_000, 60, null, CatalogStatus.OnSale)), 1, 5, 4)));
        _packages.SearchAsync(Arg.Any<PagedQuery>(), Arg.Any<PackageFilter>(), Arg.Any<CancellationToken>())
            .Returns(OperationResult<PagedResult<PackageListItemDto>>.Success(new PagedResult<PackageListItemDto>(
                new[] { "A", "C", "E" }.Select(name => new PackageListItemDto(Guid.NewGuid(), name, 900_000, 90, 5, null, CatalogStatus.OnSale, null, null)), 1, 5, 3)));

        var json = await executor.InvokeAsync("search_catalog", Args("""{"keyword":"da mat","maxPrice":1000000}"""), CancellationToken.None);

        JsonDocument.Parse(json).RootElement.GetProperty("products").EnumerateArray().Select(item => item.GetProperty("name").GetString())
            .Should().Equal("A", "B", "C", "D", "E");
        await _services.Received(1).SearchAsync(Arg.Is<PagedQuery>(paging => paging.Search == "da mat" && paging.PageSize == 5),
            Arg.Is<ServiceFilter>(filter => filter.MaxPrice == 1_000_000), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StoppedProductIsAnError()
    {
        var executor = Create(customer: false);
        var id = Guid.NewGuid();
        _packages.GetAsync(id, Arg.Any<CancellationToken>()).ThrowsAsync(new NotFoundException("Không tìm thấy gói dịch vụ.", "package_not_found"));

        var json = await executor.InvokeAsync("get_product_detail", Args($$"""{"productType":"package","id":"{{id}}"}"""), CancellationToken.None);

        JsonDocument.Parse(json).RootElement.GetProperty("error").GetString().Should().Be("Không tìm thấy gói dịch vụ.");
    }

    [Fact]
    public async Task AvailabilityValidationBecomesToolError()
    {
        var executor = Create(customer: false);
        _availability.GetAsync(Arg.Any<AvailabilityQuery>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new ValidationException([new ValidationFailure("Date", "Chỉ đặt lịch trong 60 ngày tới.")]));

        var json = await executor.InvokeAsync("find_available_slots", Args($$"""{"serviceId":"{{ServiceId}}","date":"2027-06-01"}"""), CancellationToken.None);

        JsonDocument.Parse(json).RootElement.GetProperty("error").GetString().Should().Contain("60 ngày");
    }

    [Fact]
    public async Task SlotsAreGroupedByStartTime()
    {
        var executor = Create(customer: false);

        var json = await executor.InvokeAsync("find_available_slots", Args($$"""{"serviceId":"{{ServiceId}}","date":"2026-11-07"}"""), CancellationToken.None);

        var slot = JsonDocument.Parse(json).RootElement.GetProperty("slots")[0];
        slot.GetProperty("startTime").GetString().Should().Be("09:00");
        slot.GetProperty("staff")[0].GetProperty("name").GetString().Should().Be("Lan");
    }

    [Fact]
    public async Task SuggestionsFilteredAndCapped()
    {
        var executor = Create(customer: false);
        var stopped = Guid.NewGuid();
        _packages.GetAsync(stopped, Arg.Any<CancellationToken>()).ThrowsAsync(new NotFoundException("Không tìm thấy gói dịch vụ."));
        var unknown = Guid.NewGuid();
        _services.GetAsync(unknown, Arg.Any<CancellationToken>()).ThrowsAsync(new NotFoundException("Không tìm thấy dịch vụ."));
        var more = Enumerable.Range(0, 3).Select(_ => Guid.NewGuid()).ToList();
        foreach (var id in more)
            _services.GetAsync(id, Arg.Any<CancellationToken>()).Returns(OperationResult<ServiceDetailDto>.Success(Service(id, "Gội đầu", 150_000)));
        var items = new[] { ("service", ServiceId), ("package", stopped), ("service", unknown), ("service", ServiceId) }
            .Concat(more.Select(id => ("service", id)))
            .Select(item => $$"""{"productType":"{{item.Item1}}","id":"{{item.Item2}}"}""");

        await executor.InvokeAsync("suggest_products", Args($$"""{"items":[{{string.Join(",", items)}}]}"""), CancellationToken.None);

        executor.Suggestions.Should().HaveCount(3);
        executor.Suggestions.Select(suggestion => suggestion.ProductId).Should().OnlyHaveUniqueItems();
        executor.Suggestions[0].Should().Be(new AiProductSuggestionDto(AiProductType.Service, ServiceId, "Chăm sóc da mặt", 350_000, $"/services/{ServiceId}"));
    }

    [Fact]
    public async Task ProposalForFreeSlot()
    {
        var executor = Create(customer: false);

        var json = await executor.InvokeAsync("propose_booking", Args($$"""{"spaServiceId":"{{ServiceId}}","date":"2026-11-07","startTime":"09:00"}"""), CancellationToken.None);

        json.Should().NotContain("error");
        executor.BookingProposals.Should().ContainSingle().Which.Should().Be(new AiBookingProposalDto(
            AiBookingKind.BookNow, ServiceId, null, null, "Chăm sóc da mặt", Day, new TimeOnly(9, 0), new TimeOnly(10, 0), null, null,
            $"/booking/new?serviceId={ServiceId}&date=2026-11-07&startTime=09:00"));
    }

    [Fact]
    public async Task ProposalWithChosenStaff()
    {
        var executor = Create(customer: false);

        await executor.InvokeAsync("propose_booking",
            Args($$"""{"spaServiceId":"{{ServiceId}}","date":"2026-11-07","startTime":"09:00","staffMemberId":"{{StaffId}}"}"""), CancellationToken.None);

        var proposal = executor.BookingProposals.Should().ContainSingle().Subject;
        proposal.StaffMemberId.Should().Be(StaffId);
        proposal.StaffName.Should().Be("Lan");
        proposal.Path.Should().EndWith($"&staffMemberId={StaffId}");
        await _availability.Received().GetAsync(Arg.Is<AvailabilityQuery>(query => query.StaffMemberId == StaffId && query.SpaServiceId == ServiceId),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ProposalRejectedWhenTaken()
    {
        var executor = Create(customer: false);

        var json = await executor.InvokeAsync("propose_booking", Args($$"""{"spaServiceId":"{{ServiceId}}","date":"2026-11-07","startTime":"14:00"}"""), CancellationToken.None);

        JsonDocument.Parse(json).RootElement.GetProperty("error").GetString().Should().Be("Giờ này không còn trống, hãy chọn giờ khác.");
        executor.BookingProposals.Should().BeEmpty();
    }

    [Fact]
    public async Task SessionProposalUsesThePurchases()
    {
        var executor = Create(customer: true);
        var sessionId = Guid.NewGuid();
        _purchases.ListAsync(Arg.Any<PurchaseListQuery>(), Arg.Any<CancellationToken>())
            .Returns(OperationResult<PurchasesDto>.Success(new PurchasesDto([], [Package(sessionId, total: 10, used: 3)])));

        await executor.InvokeAsync("propose_booking", Args($$"""{"treatmentSessionId":"{{sessionId}}","date":"2026-11-07","startTime":"09:00"}"""), CancellationToken.None);

        var proposal = executor.BookingProposals.Should().ContainSingle().Subject;
        proposal.Kind.Should().Be(AiBookingKind.BookSession);
        proposal.ServiceName.Should().Be("Chăm sóc da mặt");
        proposal.Path.Should().Be($"/booking/new?treatmentSessionId={sessionId}&date=2026-11-07&startTime=09:00");
    }

    [Fact]
    public async Task SessionOfAnotherCustomerRejected()
    {
        var executor = Create(customer: true);
        _availability.GetAsync(Arg.Any<AvailabilityQuery>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new NotFoundException("Không tìm thấy buổi chăm sóc.", "treatment_session_not_found"));

        var json = await executor.InvokeAsync("propose_booking", Args($$"""{"treatmentSessionId":"{{Guid.NewGuid()}}","date":"2026-11-07","startTime":"09:00"}"""), CancellationToken.None);

        json.Should().Contain("Không tìm thấy buổi chăm sóc.");
        executor.BookingProposals.Should().BeEmpty();
    }

    [Fact]
    public async Task GuestEntitlementRejected()
    {
        var executor = Create(customer: false);

        var json = await executor.InvokeAsync("propose_booking", Args($$"""{"serviceEntitlementId":"{{Guid.NewGuid()}}","date":"2026-11-07","startTime":"09:00"}"""), CancellationToken.None);

        json.Should().Contain("Bạn cần đăng nhập để xem thông tin cá nhân.");
        await _availability.DidNotReceiveWithAnyArgs().GetAsync(default!, default);
    }

    [Fact]
    public async Task TwoSourcesRejected()
    {
        var executor = Create(customer: true);

        var json = await executor.InvokeAsync("propose_booking",
            Args($$"""{"spaServiceId":"{{ServiceId}}","treatmentSessionId":"{{Guid.NewGuid()}}","date":"2026-11-07","startTime":"09:00"}"""), CancellationToken.None);

        JsonDocument.Parse(json).RootElement.GetProperty("error").GetString().Should().Be("Tham số không hợp lệ.");
    }

    [Fact]
    public async Task ProposalsCapped()
    {
        var executor = Create(customer: false);
        _availability.GetAsync(Arg.Any<AvailabilityQuery>(), Arg.Any<CancellationToken>())
            .Returns(OperationResult<AvailabilityDto>.Success(new AvailabilityDto(Day, 60, [new AvailableStaffDto(StaffId, "Lan",
                Enumerable.Range(8, 5).Select(hour => new TimeSlotDto(new TimeOnly(hour, 0), new TimeOnly(hour + 1, 0))).ToList())])));

        string last = "";
        foreach (var hour in new[] { 8, 9, 9, 10, 11 })
            last = await executor.InvokeAsync("propose_booking", Args($$"""{"spaServiceId":"{{ServiceId}}","date":"2026-11-07","startTime":"{{hour:00}}:00"}"""), CancellationToken.None);

        executor.BookingProposals.Select(proposal => proposal.StartTime.Hour).Should().Equal(8, 9, 10);
        last.Should().Contain("Đã đủ số lịch đề xuất.");
    }

    [Theory]
    [InlineData("unknown_tool", "{}", "Công cụ không tồn tại.")]
    [InlineData("find_available_slots", """{"serviceId":"x","date":"2026-11-07"}""", "Tham số không hợp lệ.")]
    [InlineData("get_product_detail", """{"productType":"combo","id":"00000000-0000-0000-0000-000000000001"}""", "Tham số không hợp lệ.")]
    public async Task BadCallsAreErrors(string name, string args, string message)
    {
        var json = await Create(customer: false).InvokeAsync(name, Args(args), CancellationToken.None);

        JsonDocument.Parse(json).RootElement.GetProperty("error").GetString().Should().Be(message);
    }

    private AiToolExecutor Create(bool customer)
    {
        _currentUser.IsAuthenticated.Returns(customer);
        _currentUser.UserId.Returns(customer ? Guid.NewGuid() : null);
        _currentUser.Roles.Returns(customer ? [Roles.Customer] : []);
        return new AiToolExecutor(_services, _packages, _availability, _appointments, _purchases, _currentUser, _clock, Options.Create(new AiOptions()));
    }

    private static JsonElement Args(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static ServiceDetailDto Service(Guid id, string name, decimal price) =>
        new(id, name, Guid.Empty, "Da mặt", "Mô tả", price, 60, "https://img.test/a.jpg", CatalogStatus.OnSale, DateTime.UtcNow, null);

    private static PurchasedPackageDto Package(Guid sessionId, int total, int used) => new(
        Guid.NewGuid(), Guid.NewGuid(), "Gói trị mụn", "https://img.test/p.jpg", CustomerPackageStatus.Active, DateTime.UtcNow, DateTime.UtcNow,
        new DateTime(2027, 2, 1, 0, 0, 0, DateTimeKind.Utc), total, used, 0, new PurchaseTreatmentPlanDto(Guid.NewGuid(), TreatmentPlanStatus.InProgress),
        new NextSessionDto(sessionId, used + 1, ServiceId, "Chăm sóc da mặt", 60, true, Day), null, new PurchaseOrderRefDto(Guid.NewGuid(), "DH001"));
}

using FluentAssertions;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Application.UseCases.Purchases;
using NhuNguyetSpa.Application.Validators;
using NhuNguyetSpa.Application.Validators.Purchases;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Purchases;

/// <summary>UC-SPA-20 (docs/specs/purchases-treatments.md BR-TRT-11, Q-40; TRT-T18…T20).</summary>
public sealed class ServiceHistoryServiceTests
{
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly NhuNguyetSpa.Application.Common.Interfaces.ICurrentUserService _user = StaffTestDoubles.User("customer");

    private ServiceHistoryService Create() => new(_appointments, _user, new PagedQueryValidator(), new ServiceHistoryQueryValidator());

    [Fact]
    public async Task PassesCustomerIdFromToken()
    {
        var from = new DateOnly(2026, 10, 1);
        var to = new DateOnly(2026, 10, 31);
        var serviceId = Guid.NewGuid();
        _appointments.SearchHistoryAsync(default, default!, default).ReturnsForAnyArgs(new PagedResult<ServiceHistoryItemDto>([], 2, 5, 0));

        await Create().ListAsync(new PagedQuery { PageNumber = 2, PageSize = 5 },
            new ServiceHistoryQuery { FromDate = from, ToDate = to, SpaServiceId = serviceId }, default);

        await _appointments.Received(1).SearchHistoryAsync(_user.UserId!.Value,
            new ServiceHistoryCriteria(from, to, serviceId, null, 2, 5), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StatusTextMapsToEnum()
    {
        _appointments.SearchHistoryAsync(default, default!, default).ReturnsForAnyArgs(new PagedResult<ServiceHistoryItemDto>([], 1, 10, 0));

        await Create().ListAsync(new PagedQuery(), new ServiceHistoryQuery { Status = "no_show" }, default);

        await _appointments.Received(1).SearchHistoryAsync(_user.UserId!.Value,
            Arg.Is<ServiceHistoryCriteria>(criteria => criteria.Status == AppointmentStatus.NoShow), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task MissingDetailIsAppointmentNotFound()
    {
        await FluentActions.Awaiting(() => Create().GetAsync(Guid.NewGuid(), default))
            .Should().ThrowAsync<NotFoundException>().Where(error => error.Code == BookingErrors.AppointmentNotFoundCode);
    }

    [Fact]
    public void FromAfterToInvalid() =>
        new ServiceHistoryQueryValidator()
            .Validate(new ServiceHistoryQuery { FromDate = new DateOnly(2026, 10, 2), ToDate = new DateOnly(2026, 10, 1) })
            .IsValid.Should().BeFalse();

    [Theory]
    [InlineData("cancelled")]
    [InlineData("confirmed")]
    [InlineData("abc")]
    public void CancelledStatusInvalid(string status) =>
        new ServiceHistoryQueryValidator().Validate(new ServiceHistoryQuery { Status = status }).IsValid.Should().BeFalse();

    [Theory]
    [InlineData(null)]
    [InlineData("completed")]
    [InlineData("no_show")]
    public void CompletedAndNoShowValid(string? status) =>
        new ServiceHistoryQueryValidator().Validate(new ServiceHistoryQuery { Status = status }).IsValid.Should().BeTrue();

    [Fact]
    public void PageSize0ClampsTo1() => new PagedQuery { PageSize = 0 }.PageSize.Should().Be(1);
}

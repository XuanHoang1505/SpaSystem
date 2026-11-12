using FluentAssertions;
using FluentValidation;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Promotions;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Promotions;
using NhuNguyetSpa.Application.Validators.Promotions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Promotions;

/// <summary>UC-SPA-14 (docs/specs/orders.md: BR-PRM-04, 05, 06; PRM-T01, T02, T05, T06, T07). Now = 2026-10-26T17:30Z.</summary>
public sealed class PromotionServiceTests
{
    private static readonly DateTime Now = StaffTestDoubles.Now;
    private readonly IPromotionRepository _promotions = Substitute.For<IPromotionRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly Promotion _existing = new()
    {
        Code = "SALE20",
        DiscountType = DiscountType.Percentage,
        DiscountValue = 20,
        MinOrderAmount = 0,
        StartsAtUtc = Now.AddDays(-1),
        EndsAtUtc = Now.AddDays(10),
        UsageLimit = 10,
        Status = PromotionStatus.Active,
    };

    public PromotionServiceTests()
    {
        _promotions.GetByIdAsync(_existing.Id, Arg.Any<CancellationToken>()).Returns(_existing);
        _promotions.GetDtoAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(call => Dto(call.Arg<Guid>()));
    }

    private static PromotionDto Dto(Guid id) =>
        new(id, "X", null, DiscountType.Percentage, 10, 0, null, Now, Now.AddDays(1), null, null, PromotionStatus.Active, 0);

    private PromotionService Create() => new(_promotions, _unitOfWork, StaffTestDoubles.Clock(),
        new SavePromotionRequestValidator(), new PromotionFilterValidator(), new ChangePromotionStatusRequestValidator());

    private static SavePromotionRequest Request(
        string code = "SALE20", DiscountType type = DiscountType.Percentage, decimal value = 20, int? usageLimit = 10, DateTime? endsAtUtc = null) =>
        new(code, "Giảm 20%", type, value, 0, null, Now.AddDays(-1), endsAtUtc ?? Now.AddDays(10), null, usageLimit);

    [Fact]
    public async Task CreateNormalizesCodeAndDefaultsActive()
    {
        await Create().CreateAsync(Request(code: " sale20 "), CancellationToken.None);

        await _promotions.Received(1).AddAsync(
            Arg.Is<Promotion>(promotion => promotion.Code == "SALE20" && promotion.Status == PromotionStatus.Active && promotion.DiscountValue == 20),
            Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateRejectsEndInPast()
    {
        var exception = await FluentActions.Invoking(() => Create().CreateAsync(Request(endsAtUtc: Now.AddMinutes(-1)), CancellationToken.None))
            .Should().ThrowAsync<ValidationException>();

        exception.Which.Errors.Should().ContainSingle(error => error.PropertyName == nameof(SavePromotionRequest.EndsAtUtc));
        await _promotions.DidNotReceive().AddAsync(Arg.Any<Promotion>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateRejectsDuplicateCode()
    {
        _promotions.CodeExistsAsync("SALE20", null, Arg.Any<CancellationToken>()).Returns(true);

        var exception = await FluentActions.Invoking(() => Create().CreateAsync(Request(code: "sale20"), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>();

        exception.Which.Code.Should().Be("promotion_code_exists");
    }

    [Fact]
    public async Task UpdateMissingIsNotFound()
    {
        var exception = await FluentActions.Invoking(() => Create().UpdateAsync(Guid.NewGuid(), Request(), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>();

        exception.Which.Code.Should().Be("promotion_not_found");
    }

    [Theory]
    [InlineData("SALE30", DiscountType.Percentage, 20)]
    [InlineData("SALE20", DiscountType.FixedAmount, 20_000)]
    [InlineData("SALE20", DiscountType.Percentage, 25)]
    public async Task UpdateBlocksCodeTypeOrValueChangeWhenUsed(string code, DiscountType type, decimal value)
    {
        _promotions.CountCountedRedemptionsAsync(_existing.Id, null, Now, Arg.Any<CancellationToken>()).Returns(1);

        var exception = await FluentActions.Invoking(() => Create().UpdateAsync(_existing.Id, Request(code, type, value), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>();

        exception.Which.Code.Should().Be("promotion_in_use");
        _existing.DiscountValue.Should().Be(20);
    }

    [Fact]
    public async Task UpdateAllowsValueChangeWhenOnlyExpiredOrders()
    {
        _promotions.CountCountedRedemptionsAsync(_existing.Id, null, Now, Arg.Any<CancellationToken>()).Returns(0);

        await Create().UpdateAsync(_existing.Id, Request(value: 25), CancellationToken.None);

        _existing.DiscountValue.Should().Be(25);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateAllowsOtherFieldsWhenUsed()
    {
        _promotions.CountCountedRedemptionsAsync(_existing.Id, null, Now, Arg.Any<CancellationToken>()).Returns(3);

        await Create().UpdateAsync(_existing.Id, Request(code: "sale20", endsAtUtc: Now.AddDays(30)), CancellationToken.None);

        _existing.EndsAtUtc.Should().Be(Now.AddDays(30));
    }

    [Fact]
    public async Task UpdateRejectsUsageLimitBelowCounted()
    {
        _promotions.CountCountedRedemptionsAsync(_existing.Id, null, Now, Arg.Any<CancellationToken>()).Returns(4);

        var exception = await FluentActions.Invoking(() => Create().UpdateAsync(_existing.Id, Request(usageLimit: 3), CancellationToken.None))
            .Should().ThrowAsync<BusinessRuleException>();

        exception.Which.Code.Should().Be("promotion_usage_limit_below_used");
    }

    [Fact]
    public async Task UpdateRejectsCodeTakenByAnother()
    {
        _promotions.CodeExistsAsync("OTHER", _existing.Id, Arg.Any<CancellationToken>()).Returns(true);

        var exception = await FluentActions.Invoking(() => Create().UpdateAsync(_existing.Id, Request(code: "other"), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>();

        exception.Which.Code.Should().Be("promotion_code_exists");
    }

    [Fact]
    public async Task ChangeStatusIsIdempotent()
    {
        var service = Create();

        await service.ChangeStatusAsync(_existing.Id, new ChangePromotionStatusRequest(PromotionStatus.Stopped), CancellationToken.None);
        await service.ChangeStatusAsync(_existing.Id, new ChangePromotionStatusRequest(PromotionStatus.Stopped), CancellationToken.None);

        _existing.Status.Should().Be(PromotionStatus.Stopped);
    }

    [Fact]
    public async Task SearchDefaultsToNewestStartFirstAndConvertsVietnamDays()
    {
        _promotions.SearchAsync(Arg.Any<PromotionSearchCriteria>(), Arg.Any<CancellationToken>())
            .Returns(new PagedResult<PromotionDto>([], 1, 10, 0));

        await Create().SearchAsync(new PagedQuery(), new PromotionFilter { FromDate = new DateOnly(2026, 11, 1), ToDate = new DateOnly(2026, 11, 30) },
            CancellationToken.None);

        await _promotions.Received(1).SearchAsync(Arg.Is<PromotionSearchCriteria>(criteria =>
                criteria.SortBy == PromotionSortField.StartsAtUtc && criteria.SortDirection == SortDirection.Desc &&
                criteria.FromUtc == new DateTime(2026, 10, 31, 17, 0, 0, DateTimeKind.Utc) &&
                criteria.ToUtcExclusive == new DateTime(2026, 11, 30, 17, 0, 0, DateTimeKind.Utc)),
            Arg.Any<CancellationToken>());
    }
}

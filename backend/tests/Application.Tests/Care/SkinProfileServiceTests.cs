using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Care;
using NhuNguyetSpa.Application.Validators.Care;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Care;

/// <summary>UC-SPA-27 skin profiles (docs/specs/care.md BR-CARE-01, 04, 05). Now = 10:00 on 31/10/2026 in Vietnam.</summary>
public sealed class SkinProfileServiceTests
{
    private static readonly DateTime Now = new(2026, 10, 31, 3, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly Today = new(2026, 10, 31);
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly ISkinProfileRepository _profiles = Substitute.For<ISkinProfileRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly Guid _staffId = Guid.NewGuid();
    private readonly Guid _customerId = Guid.NewGuid();
    private readonly Guid _appointmentId = Guid.NewGuid();
    private AppointmentCareInfo _info;

    public SkinProfileServiceTests()
    {
        _info = new AppointmentCareInfo(_appointmentId, _customerId, _staffId, AppointmentStatus.Confirmed, Today, new TimeOnly(9, 0));
        _appointments.GetCareInfoAsync(_appointmentId, Arg.Any<CancellationToken>()).Returns(_ => _info);
        _profiles.GetDtoAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(call => Dto(call.Arg<Guid>()));
        _profiles.GetDtoByAppointmentAsync(_appointmentId, Arg.Any<CancellationToken>()).Returns(Dto(Guid.NewGuid()));
    }

    private SkinProfileDto Dto(Guid id) => new(
        id, _appointmentId, _customerId, new AppointmentStaffDto(_staffId, "An"), Now, SkinType.Oily, null, null, null, null, null, Now, null);

    private static ICurrentUserService User(string role, Guid id)
    {
        var user = Substitute.For<ICurrentUserService>();
        user.IsAuthenticated.Returns(true);
        user.Roles.Returns([role]);
        user.UserId.Returns(id);
        return user;
    }

    private SkinProfileService Create(ICurrentUserService? user = null)
    {
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        return new SkinProfileService(
            _appointments, _profiles, _unitOfWork, user ?? User(Roles.Staff, _staffId), clock, Options.Create(new CareOptions()),
            new SaveSkinProfileRequestValidator());
    }

    private static SaveSkinProfileRequest Request(string? skinType = "oily", string? concerns = "Mụn ẩn") =>
        new(skinType, concerns, null, null, null, null);

    private SkinProfile Existing()
    {
        var profile = new SkinProfile
        {
            AppointmentId = _appointmentId,
            CustomerId = _customerId,
            AssessedByStaffMemberId = Guid.NewGuid(),
            AssessedAtUtc = Now.AddDays(-1),
            SkinType = SkinType.Dry,
        };
        _profiles.GetByIdAsync(profile.Id, Arg.Any<CancellationToken>()).Returns(profile);
        return profile;
    }

    [Fact]
    public async Task CreateSetsAssessorAndCustomer()
    {
        SkinProfile? added = null;
        await _profiles.AddAsync(Arg.Do<SkinProfile>(profile => added = profile), Arg.Any<CancellationToken>());

        var result = await Create().CreateAsync(_appointmentId, Request(), CancellationToken.None);

        added.Should().NotBeNull();
        added!.AppointmentId.Should().Be(_appointmentId);
        added.CustomerId.Should().Be(_customerId);
        added.AssessedByStaffMemberId.Should().Be(_staffId);
        added.AssessedAtUtc.Should().Be(Now);
        added.SkinType.Should().Be(SkinType.Oily);
        added.MainConcerns.Should().Be("Mụn ẩn");
        result.Data!.Id.Should().Be(added.Id);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateWhenExistingIsConflict()
    {
        _appointments.HasSkinProfileAsync(_appointmentId, Arg.Any<CancellationToken>()).Returns(true);

        (await FluentActions.Invoking(() => Create().CreateAsync(_appointmentId, Request(), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(CareErrors.SkinProfileExistsCode);
    }

    [Fact]
    public async Task CreateChecksStatusWindow()
    {
        _info = _info with { Date = Today.AddDays(1) };
        (await FluentActions.Invoking(() => Create().CreateAsync(_appointmentId, Request(), CancellationToken.None))
            .Should().ThrowAsync<DomainException>()).Which.Code.Should().Be(CareErrors.SkinProfileTooEarlyCode);
    }

    [Fact]
    public async Task OwnerCannotWrite()
    {
        (await FluentActions.Invoking(() => Create(User(Roles.Owner, Guid.NewGuid())).CreateAsync(_appointmentId, Request(), CancellationToken.None))
            .Should().ThrowAsync<ForbiddenException>()).Which.Code.Should().Be("appointment_not_assigned");
    }

    [Fact]
    public async Task OwnerCanRead()
    {
        var result = await Create(User(Roles.Owner, Guid.NewGuid())).GetByAppointmentAsync(_appointmentId, CancellationToken.None);
        result.Data!.AppointmentId.Should().Be(_appointmentId);
    }

    [Fact]
    public async Task OtherStaffCannotReadOrWrite()
    {
        var other = User(Roles.Staff, Guid.NewGuid());
        await FluentActions.Invoking(() => Create(other).GetByAppointmentAsync(_appointmentId, CancellationToken.None))
            .Should().ThrowAsync<ForbiddenException>();
        await FluentActions.Invoking(() => Create(other).CreateAsync(_appointmentId, Request(), CancellationToken.None))
            .Should().ThrowAsync<ForbiddenException>();
        var profile = Existing();
        await FluentActions.Invoking(() => Create(other).UpdateAsync(profile.Id, Request(), CancellationToken.None))
            .Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task ReadWithoutProfileIsNotFound()
    {
        _profiles.GetDtoByAppointmentAsync(_appointmentId, Arg.Any<CancellationToken>()).Returns((SkinProfileDto?)null);
        (await FluentActions.Invoking(() => Create().GetByAppointmentAsync(_appointmentId, CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CareErrors.SkinProfileNotFoundCode);
    }

    [Fact]
    public async Task UnknownAppointmentIsNotFound()
    {
        (await FluentActions.Invoking(() => Create().CreateAsync(Guid.NewGuid(), Request(), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("appointment_not_found");
    }

    [Fact]
    public async Task UpdateKeepsAssessor()
    {
        var profile = Existing();
        var assessor = profile.AssessedByStaffMemberId;

        await Create().UpdateAsync(profile.Id, Request("sensitive", "Đỏ rát"), CancellationToken.None);

        profile.SkinType.Should().Be(SkinType.Sensitive);
        profile.MainConcerns.Should().Be("Đỏ rát");
        profile.AssessedByStaffMemberId.Should().Be(assessor);
        profile.AssessedAtUtc.Should().Be(Now.AddDays(-1));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ReassignedNewStaffCanUpdate()
    {
        var profile = Existing();
        // The appointment now belongs to _staffId, not to the original assessor.
        await Create().UpdateAsync(profile.Id, Request(), CancellationToken.None);
        profile.SkinType.Should().Be(SkinType.Oily);
    }

    [Fact]
    public async Task UpdateUnknownProfileIsNotFound()
    {
        (await FluentActions.Invoking(() => Create().UpdateAsync(Guid.NewGuid(), Request(), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CareErrors.SkinProfileNotFoundCode);
    }

    [Fact]
    public async Task UpdateLockedAfterWindow()
    {
        var profile = Existing();
        _info = _info with { Status = AppointmentStatus.Completed, Date = Today.AddDays(-8) };
        (await FluentActions.Invoking(() => Create().UpdateAsync(profile.Id, Request(), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(CareErrors.SkinProfileLockedCode);
    }

    [Fact]
    public async Task WhitespaceTextBecomesNull()
    {
        SkinProfile? added = null;
        await _profiles.AddAsync(Arg.Do<SkinProfile>(profile => added = profile), Arg.Any<CancellationToken>());

        await Create().CreateAsync(_appointmentId, new SaveSkinProfileRequest("oily", "   ", " Kem ", null, "", " x "), CancellationToken.None);

        added!.SkinType.Should().Be(SkinType.Oily);
        added.MainConcerns.Should().BeNull();
        added.CurrentProducts.Should().Be("Kem");
        added.RecommendedTreatment.Should().BeNull();
        added.Note.Should().Be("x");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("x")]
    [InlineData("1")]
    public void MissingOrUnknownSkinTypeInvalid(string? skinType)
    {
        new SaveSkinProfileRequestValidator().Validate(Request(skinType)).IsValid.Should().BeFalse();
    }

    [Fact]
    public void TextOver2000Invalid()
    {
        var validator = new SaveSkinProfileRequestValidator();
        validator.Validate(Request(concerns: new string('a', 2000))).IsValid.Should().BeTrue();
        validator.Validate(Request(concerns: new string('a', 2001))).IsValid.Should().BeFalse();
        validator.Validate(new SaveSkinProfileRequest("dry", null, null, null, null, new string('a', 2001))).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task InvalidRequestThrowsValidation()
    {
        await FluentActions.Invoking(() => Create().CreateAsync(_appointmentId, Request("x"), CancellationToken.None))
            .Should().ThrowAsync<ValidationException>();
    }
}

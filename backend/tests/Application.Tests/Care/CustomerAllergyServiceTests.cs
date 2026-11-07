using FluentAssertions;
using NhuNguyetSpa.Application.Common.Interfaces;
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

/// <summary>UC-SPA-27 A2: customer allergies (docs/specs/care.md BR-CARE-02, 05, 06).</summary>
public sealed class CustomerAllergyServiceTests
{
    private static readonly DateTime Now = new(2026, 10, 31, 3, 0, 0, DateTimeKind.Utc);
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly ICustomerAllergyRepository _allergies = Substitute.For<ICustomerAllergyRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly Guid _staffId = Guid.NewGuid();
    private readonly Guid _customerId = Guid.NewGuid();

    public CustomerAllergyServiceTests()
    {
        _allergies.CustomerExistsAsync(_customerId, Arg.Any<CancellationToken>()).Returns(true);
        _appointments.IsInCareAsync(_staffId, _customerId, Arg.Any<CancellationToken>()).Returns(true);
        _allergies.ListAsync(_customerId, Arg.Any<CancellationToken>()).Returns([]);
    }

    private static ICurrentUserService User(string role, Guid id)
    {
        var user = Substitute.For<ICurrentUserService>();
        user.IsAuthenticated.Returns(true);
        user.Roles.Returns([role]);
        user.UserId.Returns(id);
        return user;
    }

    private CustomerAllergyService Create(ICurrentUserService? user = null)
    {
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        return new CustomerAllergyService(
            _appointments, _allergies, _unitOfWork, user ?? User(Roles.Staff, _staffId), clock, new SaveAllergyRequestValidator());
    }

    private static SaveAllergyRequest Request(string? allergen = "Paraben", string? severity = "severe", string? note = "Nổi mẩn") =>
        new(allergen, severity, note);

    private CustomerAllergy Existing()
    {
        var allergy = new CustomerAllergy
        {
            CustomerId = _customerId, Allergen = "Cồn", Severity = AllergySeverity.Mild, RecordedAtUtc = Now.AddDays(-5),
        };
        _allergies.GetAsync(_customerId, allergy.Id, Arg.Any<CancellationToken>()).Returns(allergy);
        return allergy;
    }

    [Fact]
    public async Task StaffInCareCanCreate()
    {
        CustomerAllergy? added = null;
        await _allergies.AddAsync(Arg.Do<CustomerAllergy>(allergy => added = allergy), Arg.Any<CancellationToken>());

        var result = await Create().CreateAsync(_customerId, Request(allergen: "  Paraben  "), CancellationToken.None);

        added!.CustomerId.Should().Be(_customerId);
        added.Allergen.Should().Be("Paraben");
        added.Severity.Should().Be(AllergySeverity.Severe);
        added.Note.Should().Be("Nổi mẩn");
        added.RecordedAtUtc.Should().Be(Now);
        result.Data.Should().Be(new CustomerAllergyDto(added.Id, "Paraben", AllergySeverity.Severe, "Nổi mẩn", Now));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StaffNotInCareIsForbidden()
    {
        _appointments.IsInCareAsync(_staffId, _customerId, Arg.Any<CancellationToken>()).Returns(false);

        (await FluentActions.Invoking(() => Create().CreateAsync(_customerId, Request(), CancellationToken.None))
            .Should().ThrowAsync<ForbiddenException>()).Which.Code.Should().Be(CareErrors.CustomerNotInCareCode);
        (await FluentActions.Invoking(() => Create().ListAsync(_customerId, CancellationToken.None))
            .Should().ThrowAsync<ForbiddenException>()).Which.Code.Should().Be(CareErrors.CustomerNotInCareCode);
    }

    [Fact]
    public async Task OwnerReadsButCannotWrite()
    {
        var owner = User(Roles.Owner, Guid.NewGuid());
        (await Create(owner).ListAsync(_customerId, CancellationToken.None)).Data.Should().BeEmpty();
        await FluentActions.Invoking(() => Create(owner).CreateAsync(_customerId, Request(), CancellationToken.None))
            .Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task UnknownCustomerNotFound()
    {
        var unknown = Guid.NewGuid();
        (await FluentActions.Invoking(() => Create().ListAsync(unknown, CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CareErrors.CustomerNotFoundCode);
    }

    [Fact]
    public async Task AllergyOfOtherCustomerNotFound()
    {
        (await FluentActions.Invoking(() => Create().UpdateAsync(_customerId, Guid.NewGuid(), Request(), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CareErrors.AllergyNotFoundCode);
        (await FluentActions.Invoking(() => Create().DeleteAsync(_customerId, Guid.NewGuid(), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CareErrors.AllergyNotFoundCode);
    }

    [Fact]
    public async Task DuplicateIsConflict()
    {
        _allergies.AllergenExistsAsync(_customerId, "Paraben", null, Arg.Any<CancellationToken>()).Returns(true);

        (await FluentActions.Invoking(() => Create().CreateAsync(_customerId, Request(allergen: " Paraben "), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(CareErrors.AllergyExistsCode);
        await _allergies.DidNotReceive().AddAsync(Arg.Any<CustomerAllergy>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateKeepingSameAllergenSucceeds()
    {
        var allergy = Existing();

        var result = await Create().UpdateAsync(_customerId, allergy.Id, Request(allergen: "Cồn", severity: "moderate", note: null), CancellationToken.None);

        await _allergies.Received(1).AllergenExistsAsync(_customerId, "Cồn", allergy.Id, Arg.Any<CancellationToken>());
        allergy.Severity.Should().Be(AllergySeverity.Moderate);
        allergy.Note.Should().BeNull();
        allergy.RecordedAtUtc.Should().Be(Now);
        result.Data!.Id.Should().Be(allergy.Id);
    }

    [Fact]
    public async Task UpdateToOtherExistingAllergenIsConflict()
    {
        var allergy = Existing();
        _allergies.AllergenExistsAsync(_customerId, "Paraben", allergy.Id, Arg.Any<CancellationToken>()).Returns(true);

        (await FluentActions.Invoking(() => Create().UpdateAsync(_customerId, allergy.Id, Request(), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(CareErrors.AllergyExistsCode);
    }

    [Fact]
    public async Task DeleteRemoves()
    {
        var allergy = Existing();

        await Create().DeleteAsync(_customerId, allergy.Id, CancellationToken.None);

        _allergies.Received(1).Remove(allergy);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(null, "mild")]
    [InlineData("   ", "mild")]
    [InlineData("Paraben", null)]
    [InlineData("Paraben", "high")]
    [InlineData("Paraben", "Severe")]
    public void InvalidAllergenOrSeverity(string? allergen, string? severity)
    {
        new SaveAllergyRequestValidator().Validate(Request(allergen, severity)).IsValid.Should().BeFalse();
    }

    [Fact]
    public void LengthLimits()
    {
        var validator = new SaveAllergyRequestValidator();
        validator.Validate(Request(allergen: new string('a', 255))).IsValid.Should().BeTrue();
        validator.Validate(Request(allergen: new string('a', 256))).IsValid.Should().BeFalse();
        validator.Validate(Request(note: new string('a', 1000))).IsValid.Should().BeTrue();
        validator.Validate(Request(note: new string('a', 1001))).IsValid.Should().BeFalse();
    }
}

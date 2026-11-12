using FluentAssertions;
using FluentValidation.TestHelper;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Validators.Staff;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Staff;

/// <summary>BR-STF-04 field rules (STF-T04). Today in Vietnam is 27/10/2026.</summary>
public sealed class StaffValidatorTests
{
    private static readonly DateOnly Today = StaffTestDoubles.VietnamToday;
    private readonly IDateTimeProvider _clock = StaffTestDoubles.Clock();

    private static CreateStaffRequest Valid(DateOnly? hireDate = null, string? specialty = null, IReadOnlyList<Guid>? ids = null) =>
        new("Nguyễn Thị An", "an@spa.vn", "0912345678", hireDate ?? Today, specialty, ids ?? []);

    [Fact]
    public void ValidRequestPasses() => new CreateStaffRequestValidator(_clock).TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();

    [Theory]
    [InlineData("", "an@spa.vn", "0912345678", "fullName")]
    [InlineData("An", "an@", "0912345678", "email")]
    [InlineData("An", "an@spa.vn", "091234567", "phoneNumber")]
    [InlineData("An", "an@spa.vn", "1912345678", "phoneNumber")]
    public void AccountFieldsFollowRegistrationRules(string name, string email, string phone, string field)
    {
        var result = new CreateStaffRequestValidator(_clock).TestValidate(Valid() with { FullName = name, Email = email, PhoneNumber = phone });

        result.Errors.Should().Contain(error => error.PropertyName.Equals(field, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void HireDateBounds()
    {
        var validator = new CreateStaffRequestValidator(_clock);
        validator.TestValidate(Valid(new DateOnly(1999, 12, 31))).ShouldHaveValidationErrorFor(request => request.HireDate);
        validator.TestValidate(Valid(Today.AddDays(366))).ShouldHaveValidationErrorFor(request => request.HireDate);
        validator.TestValidate(Valid(new DateOnly(2000, 1, 1))).ShouldNotHaveValidationErrorFor(request => request.HireDate);
        validator.TestValidate(Valid(Today.AddDays(365))).ShouldNotHaveValidationErrorFor(request => request.HireDate);
        validator.TestValidate(Valid() with { HireDate = null }).ShouldHaveValidationErrorFor(request => request.HireDate);
    }

    [Fact]
    public void SpecialtyAtMost255() =>
        new CreateStaffRequestValidator(_clock).TestValidate(Valid(specialty: new string('a', 256)))
            .ShouldHaveValidationErrorFor(request => request.Specialty);

    [Fact]
    public void ServiceIdsMustBeUniqueAtMost100AndPresent()
    {
        var validator = new CreateStaffRequestValidator(_clock);
        var id = Guid.NewGuid();
        validator.TestValidate(Valid(ids: [id, id])).ShouldHaveValidationErrorFor(request => request.SpaServiceIds);
        validator.TestValidate(Valid(ids: Enumerable.Range(0, 101).Select(_ => Guid.NewGuid()).ToArray()))
            .ShouldHaveValidationErrorFor(request => request.SpaServiceIds);
        validator.TestValidate(Valid() with { SpaServiceIds = null }).ShouldHaveValidationErrorFor(request => request.SpaServiceIds);
        validator.TestValidate(Valid(ids: Enumerable.Range(0, 100).Select(_ => Guid.NewGuid()).ToArray())).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void UpdateUsesSameFieldRules()
    {
        var validator = new UpdateStaffRequestValidator(_clock);
        validator.TestValidate(new UpdateStaffRequest("An", "0912345678", Today, null)).ShouldNotHaveAnyValidationErrors();
        validator.TestValidate(new UpdateStaffRequest(" ", "123", new DateOnly(1999, 1, 1), new string('a', 256)))
            .Errors.Select(error => error.PropertyName).Should().Contain(["FullName", "PhoneNumber", "HireDate", "Specialty"]);
    }

    [Fact]
    public void ServicesRequestRules()
    {
        var validator = new UpdateStaffServicesRequestValidator();
        var id = Guid.NewGuid();
        validator.TestValidate(new UpdateStaffServicesRequest([])).ShouldNotHaveAnyValidationErrors();
        validator.TestValidate(new UpdateStaffServicesRequest([id, id])).ShouldHaveValidationErrorFor(request => request.SpaServiceIds);
        validator.TestValidate(new UpdateStaffServicesRequest(null)).ShouldHaveValidationErrorFor(request => request.SpaServiceIds);
    }

    [Fact]
    public void ResignationDateRequiredAndAtMostOneYearAhead()
    {
        var validator = new ResignStaffRequestValidator(_clock);
        validator.TestValidate(new ResignStaffRequest(null)).ShouldHaveValidationErrorFor(request => request.ResignationDate);
        validator.TestValidate(new ResignStaffRequest(Today.AddDays(366))).ShouldHaveValidationErrorFor(request => request.ResignationDate);
        validator.TestValidate(new ResignStaffRequest(Today.AddDays(365))).ShouldNotHaveAnyValidationErrors();
        validator.TestValidate(new ResignStaffRequest(new DateOnly(2020, 1, 1))).ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("working", true)]
    [InlineData("RESIGNED", true)]
    [InlineData("foo", false)]
    public void FilterStatus(string? status, bool valid) =>
        new StaffFilterValidator().TestValidate(new StaffFilter { Status = status }).IsValid.Should().Be(valid);
}

using FluentAssertions;
using FluentValidation.TestHelper;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;
using NhuNguyetSpa.Application.Validators.WorkSchedules;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.WorkSchedules;

/// <summary>BR-STF-03 field rules and the list range (STF-T18, T22, T23).</summary>
public sealed class WorkScheduleValidatorTests
{
    private static readonly DateOnly Day = new(2026, 11, 2);
    private static readonly IOptions<WorkScheduleOptions> Options = Microsoft.Extensions.Options.Options.Create(new WorkScheduleOptions());

    [Fact]
    public void ValidShiftPasses() =>
        new CreateWorkScheduleRequestValidator().TestValidate(new CreateWorkScheduleRequest(Guid.NewGuid(), Day, new TimeOnly(8, 0), new TimeOnly(12, 0)))
            .ShouldNotHaveAnyValidationErrors();

    [Fact]
    public void AllFieldsRequired() =>
        new CreateWorkScheduleRequestValidator().TestValidate(new CreateWorkScheduleRequest(null, null, null, null))
            .Errors.Select(error => error.PropertyName).Should().Contain(["StaffMemberId", "Date", "StartTime", "EndTime"]);

    [Theory]
    [InlineData(12, 0, 12, 0)]
    [InlineData(12, 0, 8, 0)]
    public void EndMustBeAfterStart(int startHour, int startMinute, int endHour, int endMinute) =>
        new UpdateWorkScheduleRequestValidator().TestValidate(
                new UpdateWorkScheduleRequest(Day, new TimeOnly(startHour, startMinute), new TimeOnly(endHour, endMinute)))
            .ShouldHaveValidationErrorFor(request => request.EndTime);

    [Fact]
    public void EndTimeMidnightIsRejected() =>
        new UpdateWorkScheduleRequestValidator().TestValidate(new UpdateWorkScheduleRequest(Day, new TimeOnly(22, 0), new TimeOnly(0, 0)))
            .ShouldHaveValidationErrorFor(request => request.EndTime);

    [Fact]
    public void SecondsAreRejected()
    {
        var result = new UpdateWorkScheduleRequestValidator().TestValidate(
            new UpdateWorkScheduleRequest(Day, new TimeOnly(8, 0, 30), new TimeOnly(12, 0, 0, 5)));

        result.ShouldHaveValidationErrorFor(request => request.StartTime);
        result.ShouldHaveValidationErrorFor(request => request.EndTime);
    }

    [Fact]
    public void QueryRange()
    {
        var validator = new WorkScheduleQueryValidator(Options);
        validator.TestValidate(new WorkScheduleQuery { ToDate = Day }).ShouldHaveValidationErrorFor(query => query.FromDate);
        validator.TestValidate(new WorkScheduleQuery { FromDate = Day }).ShouldHaveValidationErrorFor(query => query.ToDate);
        validator.TestValidate(new WorkScheduleQuery { FromDate = Day, ToDate = Day.AddDays(-1) }).ShouldHaveValidationErrorFor(query => query.ToDate);
        validator.TestValidate(new WorkScheduleQuery { FromDate = Day, ToDate = Day.AddDays(41) }).ShouldNotHaveAnyValidationErrors();
        validator.TestValidate(new WorkScheduleQuery { FromDate = Day, ToDate = Day.AddDays(42) }).ShouldHaveValidationErrorFor(query => query.ToDate);
        validator.TestValidate(new WorkScheduleQuery { FromDate = Day, ToDate = Day }).ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("active", true)]
    [InlineData("Cancelled", true)]
    [InlineData("deleted", false)]
    public void QueryStatus(string? status, bool valid) =>
        new WorkScheduleQueryValidator(Options).TestValidate(new WorkScheduleQuery { FromDate = Day, ToDate = Day, Status = status })
            .IsValid.Should().Be(valid);

    [Theory]
    [InlineData("cancelled", true)]
    [InlineData(" CANCELLED ", true)]
    [InlineData("active", false)]
    [InlineData("paused", false)]
    [InlineData(null, false)]
    public void ChangeStatusAcceptsOnlyCancelled(string? status, bool valid) =>
        new ChangeWorkScheduleStatusRequestValidator().TestValidate(new ChangeWorkScheduleStatusRequest(status)).IsValid.Should().Be(valid);
}

using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;

namespace NhuNguyetSpa.Application.Validators.WorkSchedules;

/// <summary>BR-STF-09 request shape. Per-shift rules (date window, hire/resignation, overlap) skip shifts in the service instead.</summary>
public sealed class CreateWorkScheduleBatchRequestValidator : AbstractValidator<CreateWorkScheduleBatchRequest>
{
    public const int MaxStaff = 50;

    public CreateWorkScheduleBatchRequestValidator(IOptions<WorkScheduleOptions> options)
    {
        var maxDays = options.Value.MaxQueryRangeDays;
        var maxShifts = options.Value.MaxBatchShifts;

        RuleFor(request => request.StaffMemberIds)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng chọn ít nhất một nhân viên.")
            .Must(ids => ids!.Count <= MaxStaff).WithMessage($"Tối đa {MaxStaff} nhân viên mỗi lần.")
            .Must(ids => ids!.Distinct().Count() == ids!.Count).WithMessage("Danh sách nhân viên bị trùng.");
        RuleFor(request => request.FromDate).NotNull().WithMessage("Vui lòng chọn ngày bắt đầu.");
        RuleFor(request => request.ToDate)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Vui lòng chọn ngày kết thúc.")
            .Must((request, to) => request.FromDate is null || to >= request.FromDate).WithMessage("Ngày kết thúc phải từ ngày bắt đầu trở đi.")
            .Must((request, to) => request.FromDate is null || to!.Value.DayNumber - request.FromDate.Value.DayNumber + 1 <= maxDays)
            .WithMessage($"Chỉ thêm ca trong tối đa {maxDays} ngày một lần.");
        RuleFor(request => request.Weekdays)
            .Must(days => days is null || days.Count > 0).WithMessage("Chọn ít nhất một thứ trong tuần, hoặc bỏ trống để lấy mọi ngày.")
            .Must(days => days is null || days.Distinct().Count() == days.Count).WithMessage("Danh sách thứ trong tuần bị trùng.")
            .Must(days => days is null || days.All(Enum.IsDefined)).WithMessage("Thứ trong tuần không hợp lệ.");
        RuleFor(request => request.StartTime).ShiftTime("giờ bắt đầu");
        RuleFor(request => request.EndTime).ShiftTime("giờ kết thúc")
            .Must((request, end) => ShiftRules.EndsAfterStart(request.StartTime, end)).WithMessage(ShiftRules.EndAfterStartMessage);

        // Only meaningful once the range itself is valid.
        RuleFor(request => ShiftCount(request))
            .Must(count => count is null || count > 0).WithMessage("Khoảng ngày không có ngày nào thuộc các thứ đã chọn.")
            .Must(count => count is null || count <= maxShifts).WithMessage($"Tối đa {maxShifts} ca mỗi lần (số nhân viên × số ngày).")
            .OverridePropertyName("shifts");
    }

    private static int? ShiftCount(CreateWorkScheduleBatchRequest request) =>
        request is { StaffMemberIds.Count: > 0, FromDate: { } from, ToDate: { } to } && to >= from && to.DayNumber - from.DayNumber < 366
            ? ShiftRules.Days(from, to, request.Weekdays).Count() * request.StaffMemberIds.Count
            : null;
}

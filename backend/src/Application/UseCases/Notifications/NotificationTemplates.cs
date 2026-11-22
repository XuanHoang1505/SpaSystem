using System.Globalization;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Notifications;

/// <summary>
/// Fixed Vietnamese texts for every notice of docs/specs/notifications.md (BR-NTF-05). Texts are snapshots: names, times and
/// amounts are written in when the notice is created.
/// </summary>
public static class NotificationTemplates
{
    public const int ReasonMaxLength = 200;

    private static readonly NumberFormatInfo MoneyFormat = new() { NumberGroupSeparator = ".", NumberDecimalSeparator = "," };

    public static string When(DateOnly date, TimeOnly start) =>
        $"{start.ToString("HH:mm", CultureInfo.InvariantCulture)} ngày {date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture)}";

    public static string Day(DateOnly date) => date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

    public static string Money(decimal amount) =>
        amount.ToString("#,##0", MoneyFormat) + " đ";

    public static string Reason(string reason)
    {
        var trimmed = reason.Trim();
        return trimmed.Length <= ReasonMaxLength ? trimmed : trimmed[..ReasonMaxLength].TrimEnd();
    }

    private static NotificationType VisitType(bool isPackageSession) =>
        isPackageSession ? NotificationType.Treatment : NotificationType.Appointment;

    // NTF-E01
    public static NotificationContent OrderPaid(string orderCode, decimal total, string? serviceName, DateOnly? date, TimeOnly? start,
        bool holdExpired)
    {
        var body = $"Đơn {orderCode} đã thanh toán {Money(total)}.";
        if (serviceName is not null && date is { } day && start is { } time)
        {
            body += holdExpired
                ? $" Khung giờ {When(day, time)} giữ cho {serviceName} đã hết hạn, vui lòng đặt lại lịch từ dịch vụ đã mua."
                : $" Lịch hẹn {serviceName} lúc {When(day, time)} đã được xác nhận.";
        }

        return new(NotificationType.Payment, "Thanh toán thành công", body);
    }

    // NTF-E01 (installment order, first installment) and NTF-E15 (later installments), docs/specs/order-installments.md
    public static NotificationContent InstallmentPaid(string orderCode, int sequenceNumber, int installmentCount, decimal amount,
        int lastPaidSession)
    {
        var body = sequenceNumber == installmentCount
            ? $"Đơn {orderCode} đã thanh toán đủ {installmentCount} đợt. Bạn đặt lịch được mọi buổi của gói."
            : $"Đơn {orderCode} đã thanh toán đợt {sequenceNumber}/{installmentCount} ({Money(amount)}). Bạn đặt lịch được đến buổi {lastPaidSession}.";
        return new(NotificationType.Payment, $"Đã thanh toán đợt {sequenceNumber}/{installmentCount}", body);
    }

    // NTF-E16
    public static NotificationContent PaidSessionsUsed(string packageName, int nextSequenceNumber, decimal amount) =>
        new(NotificationType.Payment, "Bạn đã dùng hết các buổi đã thanh toán",
            $"Gói {packageName}: thanh toán đợt {nextSequenceNumber} ({Money(amount)}) để đặt lịch các buổi tiếp theo.");

    // NTF-E17
    public static NotificationContent InstallmentExpirySoon(string packageName, DateOnly expiresOn) =>
        new(NotificationType.Payment, "Gói sắp hết hạn, còn đợt chưa thanh toán",
            $"Gói {packageName} hết hạn ngày {Day(expiresOn)}. Sau ngày này các buổi của đợt chưa thanh toán không dùng được nữa.");

    // NTF-E02
    public static NotificationContent OrderCancelledByOwner(string orderCode, string reason) =>
        new(NotificationType.Payment, "Đơn hàng đã bị hủy", $"Đơn {orderCode} đã bị spa hủy. Lý do: {Reason(reason)}.");

    // NTF-E03
    public static NotificationContent AppointmentConfirmed(string service, DateOnly date, TimeOnly start, string staffName, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Lịch hẹn đã được xác nhận",
            $"Lịch hẹn {service} lúc {When(date, start)} với nhân viên {staffName} đã được xác nhận.");

    // NTF-E09
    public static NotificationContent NewAppointmentForStaff(string service, DateOnly date, TimeOnly start, string customerName) =>
        new(NotificationType.Appointment, "Bạn có lịch hẹn mới", $"{customerName} có lịch {service} lúc {When(date, start)} do bạn phụ trách.");

    // NTF-E04
    public static NotificationContent RescheduledForCustomer(string service, DateOnly oldDate, TimeOnly oldStart, DateOnly newDate,
        TimeOnly newStart, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Lịch hẹn đã được đổi giờ",
            $"Lịch hẹn {service} đã được spa đổi từ {When(oldDate, oldStart)} sang {When(newDate, newStart)}.");

    public static NotificationContent RescheduledForStaff(string service, string customerName, DateOnly oldDate, TimeOnly oldStart,
        DateOnly newDate, TimeOnly newStart, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Lịch hẹn đã được đổi giờ",
            $"Lịch {service} của {customerName} đã đổi từ {When(oldDate, oldStart)} sang {When(newDate, newStart)}.");

    // NTF-E05
    public static NotificationContent StaffChangedForCustomer(string service, DateOnly date, TimeOnly start, string staffName, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Đổi nhân viên phục vụ",
            $"Lịch hẹn {service} lúc {When(date, start)} sẽ do nhân viên {staffName} phục vụ.");

    public static NotificationContent UnassignedForStaff(string service, string customerName, DateOnly date, TimeOnly start, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Lịch hẹn đã chuyển cho nhân viên khác",
            $"Lịch {service} của {customerName} lúc {When(date, start)} không còn do bạn phụ trách.");

    // NTF-E06
    public static NotificationContent CancelledForCustomer(string service, DateOnly date, TimeOnly start, string reason, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Lịch hẹn đã bị hủy",
            $"Lịch hẹn {service} lúc {When(date, start)} đã bị spa hủy. Lý do: {Reason(reason)}.");

    public static NotificationContent CancelledForStaff(string service, string customerName, DateOnly date, TimeOnly start, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Lịch hẹn đã bị hủy", $"Lịch {service} của {customerName} lúc {When(date, start)} đã bị hủy.");

    // NTF-E07
    public static NotificationContent RescheduledByCustomer(string service, string customerName, DateOnly oldDate, TimeOnly oldStart,
        DateOnly newDate, TimeOnly newStart, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Khách đã đổi lịch hẹn",
            $"{customerName} đã đổi lịch {service} từ {When(oldDate, oldStart)} sang {When(newDate, newStart)}.");

    public static NotificationContent CancelledByCustomer(string service, string customerName, DateOnly date, TimeOnly start, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Khách đã hủy lịch hẹn", $"{customerName} đã hủy lịch {service} lúc {When(date, start)}.");

    // NTF-E08
    public static NotificationContent Reminder(string service, DateOnly date, TimeOnly start, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Nhắc lịch hẹn", $"Bạn có lịch hẹn {service} lúc {When(date, start)}. Hẹn gặp bạn tại spa!");

    // NTF-E10
    public static NotificationContent Completed(string service, DateOnly date, bool isPackageSession) =>
        new(VisitType(isPackageSession), "Buổi chăm sóc đã hoàn thành",
            $"Cảm ơn bạn đã sử dụng {service} ngày {Day(date)}. Hãy để lại đánh giá để spa phục vụ bạn tốt hơn.");

    // NTF-E11
    public static NotificationContent ReviewReplied(string productName) =>
        new(NotificationType.System, "Spa đã phản hồi đánh giá của bạn", $"Spa đã phản hồi đánh giá của bạn về {productName}.");

    // NTF-E12
    public static NotificationContent TreatmentStatus(string packageName, TreatmentPlanStatus status, string? reason)
    {
        var suffix = string.IsNullOrWhiteSpace(reason) ? string.Empty : $" Lý do: {Reason(reason)}.";
        return status switch
        {
            TreatmentPlanStatus.Paused => new(NotificationType.Treatment, "Liệu trình đã tạm dừng", $"Liệu trình {packageName} đã được tạm dừng.{suffix}"),
            TreatmentPlanStatus.Cancelled => new(NotificationType.Treatment, "Liệu trình đã bị hủy", $"Liệu trình {packageName} đã bị hủy.{suffix}"),
            TreatmentPlanStatus.Completed => new(NotificationType.Treatment, "Liệu trình đã hoàn thành", $"Liệu trình {packageName} đã được đóng.{suffix}"),
            _ => new(NotificationType.Treatment, "Liệu trình đã tiếp tục", $"Liệu trình {packageName} đã được tiếp tục, bạn có thể đặt các buổi tiếp theo."),
        };
    }

    // NTF-E13
    public static NotificationContent Shift(WorkScheduleChange change, DateOnly date, TimeOnly start, TimeOnly end)
    {
        var range = $"{start.ToString("HH:mm", CultureInfo.InvariantCulture)}–{end.ToString("HH:mm", CultureInfo.InvariantCulture)} ngày {Day(date)}";
        return change switch
        {
            WorkScheduleChange.Created => new(NotificationType.System, "Bạn có ca làm mới", $"Ca làm {range}."),
            WorkScheduleChange.Cancelled => new(NotificationType.System, "Ca làm đã bị hủy", $"Ca làm {range} đã bị hủy."),
            _ => new(NotificationType.System, "Ca làm đã thay đổi", $"Ca làm của bạn nay là {range}."),
        };
    }

    // NTF-E14
    public static NotificationContent ShiftsBatch(int count, DateOnly firstDate, DateOnly lastDate) =>
        new(NotificationType.System, $"Bạn có {count} ca làm mới",
            firstDate == lastDate
                ? $"Spa đã phân {count} ca làm ngày {Day(firstDate)}."
                : $"Spa đã phân {count} ca làm từ {Day(firstDate)} đến {Day(lastDate)}.");
}

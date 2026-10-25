# Quy ước backend (C# / ASP.NET Core)

Áp dụng cho `backend/`. Vị trí file theo [project-structure.md](project-structure.md), tên theo [naming.md](naming.md).

## Định dạng và trình biên dịch

- `TreatWarningsAsErrors` đang bật (`Directory.Build.props`): mọi cảnh báo, kể cả nullable, phải được sửa chứ không tắt.
- Namespace file-scoped (bắt buộc bởi `.editorconfig`), thụt lề 4 dấu cách, một kiểu public chính mỗi file.
- Ưu tiên `sealed` cho lớp không thiết kế để kế thừa, `record` cho DTO/request bất biến, primary constructor cho DI.
- Comment viết tiếng Anh, chỉ giải thích _tại sao_; không comment lại điều code đã nói rõ.

## Domain

- Entity kế thừa `BaseEntity` (chỉ Id) hoặc `BaseAuditableEntity` (thêm thời điểm và người tạo/sửa).
- Setter của trạng thái quan trọng để `private set`; đổi trạng thái qua phương thức có tên nghiệp vụ, phương thức tự kiểm tra trạng thái hiện tại:

  ```csharp
  // Tham số mã lỗi (code) có sau khi bổ sung cho DomainException — xem mục Xử lý lỗi.
  public void Complete(DateTime nowUtc)
  {
      if (Status != AppointmentStatus.Confirmed)
          throw new BusinessRuleException("Chỉ lịch hẹn đã xác nhận mới được hoàn thành.", "appointment_not_confirmed");
      Status = AppointmentStatus.Completed;
      CompletedAtUtc = nowUtc;
  }
  ```

- Domain không đọc đồng hồ hệ thống: thời điểm hiện tại được truyền vào (`IDateTimeProvider` ở Application).
- Không đặt attribute EF Core hay JSON trong Domain; cấu hình ở `Infrastructure/Persistence/Configurations`.

## Application

- Mỗi service nghiệp vụ có interface ở `Interfaces/Services/<Feature>` và hiện thực ở `UseCases/<Feature>` ([ADR-0002](../decisions/ADR-0002-business-logic-in-application.md)).
- Phương thức public nhận request/DTO và `CancellationToken`, trả `Task<OperationResult<T>>` hoặc `Task<OperationResult>`:

  ```csharp
  public async Task<OperationResult<AppointmentDto>> BookNowAsync(BookNowRequest request, CancellationToken cancellationToken)
  ```

- Người dùng hiện tại lấy từ `ICurrentUserService`; **không** nhận `customerId`/`staffId` của chính người gọi từ request.
- Validator FluentValidation cho mọi request; lỗi định dạng ném `ValidationException` (middleware trả 400 kèm lỗi theo trường).
- Tham số nghiệp vụ có thể đổi (thời gian giữ chỗ, hạn đổi/hủy, bước khung giờ…) đọc từ lớp `<Feature>Options` qua `IOptions<T>`, mặc định theo [open-questions.md](../decisions/open-questions.md).
- Ánh xạ DTO bằng phương thức mở rộng viết tay ([ADR-0004](../decisions/ADR-0004-manual-dto-mapping.md)).
- Thao tác ghi nhiều bảng (thanh toán thành công tạo quyền sử dụng, hoàn thành buổi cập nhật tiến độ gói) chạy trong một giao dịch qua `IUnitOfWork`.

## Xử lý lỗi

Middleware hiện có ánh xạ exception → HTTP. Quy tắc chọn:

| Tình huống                                              | Cách báo                                 | HTTP |
| ------------------------------------------------------- | ---------------------------------------- | ---- |
| Dữ liệu đầu vào sai định dạng                           | `ValidationException` (FluentValidation) | 400  |
| Vi phạm quy tắc nghiệp vụ                               | `BusinessRuleException`                  | 400  |
| Không tìm thấy hoặc ngoài phạm vi dữ liệu của người gọi | `NotFoundException`                      | 404  |
| Xung đột trạng thái/dữ liệu (trùng lịch, trùng mã)      | `ConflictException`                      | 409  |
| Chưa đăng nhập                                          | `UnauthorizedAccessException`            | 401  |
| Lỗi bất ngờ                                             | Để exception lan lên, không bắt chung    | 500  |

- Thông điệp exception là tiếng Việt, hiển thị được cho người dùng; không đưa chi tiết hạ tầng, SQL hay dữ liệu nhạy cảm.
- Mỗi lỗi nghiệp vụ có **mã `snake_case` ổn định** để FE xử lý theo mã (danh sách ở sheet `22_Loi_API`). Hiện `DomainException` chỉ có message: tính năng đầu tiên cần mã riêng sẽ thêm tham số `code` cho `DomainException` và cho middleware dùng mã đó thay cho mã chung (`business_rule`, `conflict`).
- `OperationResult.Failure` chỉ dùng cho kết quả thất bại _dự kiến_ mà không phải lỗi (ví dụ kiểm tra mã khuyến mãi trả `isValid = false`); không thay thế exception ở bảng trên.

## API (controller)

- Controller kế thừa `ApiController`, chỉ: nhận request → gọi service → `HandleResult(...)`. Không có logic nghiệp vụ, không truy cập repository.
- Route lấy theo [api.md](api.md). Controller cho tài nguyên "của tôi" đặt `[Route("api/v1/me/<tài-nguyên>")]` và yêu cầu đăng nhập.
- Mỗi action khai báo `[ProducesResponseType]` cho các mã trạng thái có thể trả để Swagger đúng.
- Phân quyền bằng `[Authorize(Policy = ...)]` theo vai trò; phạm vi dữ liệu (nhân viên chỉ lịch được phân công…) kiểm tra trong service.

## Bất đồng bộ và hiệu năng

- I/O luôn `async`, truyền `CancellationToken` xuyên suốt; không dùng `.Result`/`.Wait()`.
- Truy vấn danh sách luôn phân trang (`PagedQuery`, tối đa 100) và chỉ chọn cột cần (`Select` sang DTO).
- Truy vấn chỉ đọc dùng `AsNoTracking()`.

## Logging và bảo mật

- Dùng `ILogger<T>` với message template có tham số (`"Appointment {AppointmentId} completed"`), không nối chuỗi.
- Không log mật khẩu, OTP, token, dữ liệu da/dị ứng, payload thanh toán đầy đủ.
- Secret (chuỗi kết nối, khóa JWT, khóa cổng thanh toán, khóa AI, `AUTOMAPPER_LICENSE_KEY`) chỉ đặt trong `backend/src/API/.env` (không commit) hoặc biến môi trường; `appsettings*.json` trong repo không chứa giá trị thật.
- Biến cấu hình mới viết `UPPER_SNAKE_CASE`, thêm vào bảng ánh xạ của `API/Configuration/EnvLoader.cs` (khóa riêng hoặc tiền tố như `JWT_`, `MAIL_SETTINGS_`) và vào `.env.example` có chú thích. Code đọc qua `IOptions<T>` theo section đã ánh xạ, không gọi `Environment.GetEnvironmentVariable` rải rác.

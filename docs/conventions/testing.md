# Quy ước kiểm thử

Test mô tả **hành vi nghiệp vụ** theo use case và business rule, không kiểm tra chi tiết hiện thực. Kịch bản nghiệm thu đề xuất ở sheet `23_UAT` của file Excel tổng hợp.

## Backend

| Project             | Test gì                                                                      | Phụ thuộc                                                   |
| ------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `Domain.Tests`      | Phương thức entity, chuyển trạng thái, value object                          | Không                                                       |
| `Application.Tests` | Service nghiệp vụ, validator, thuật toán giờ trống                           | Repository/adapter giả bằng NSubstitute, đồng hồ giả        |
| `IntegrationTests`  | Endpoint qua `WebApplicationFactory`, middleware, phân quyền, ràng buộc CSDL | PostgreSQL thật qua Testcontainers khi có CSDL (cần Docker) |

- Thư mục test theo tính năng: `Application.Tests/Bookings/BookingServiceTests.cs`.
- Tên test là câu mô tả hành vi bằng PascalCase, như các test hiện có: `BookNowRejectsSlotAlreadyTakenByAnotherCustomer`.
- Mẫu Arrange / Act / Assert, khẳng định bằng FluentAssertions; dùng `[Theory]` cho bảng dữ liệu biên.
- Không dùng thời gian thật: thay `IDateTimeProvider`.
- Bắt buộc có test cho:
  - thuật toán giờ trống và chống trùng lịch, gồm 2 yêu cầu đặt cùng khung giờ chạy song song (chỉ 1 thành công);
  - mọi bước chuyển trạng thái trong workflow (lịch hẹn, đơn, thanh toán, quyền sử dụng, gói);
  - webhook thanh toán: sai chữ ký, gọi lặp lại (idempotent);
  - phân quyền: người dùng không đọc được dữ liệu của người khác.

## Frontend

- Web: Vitest + Testing Library; mobile: Jest Expo + React Native Testing Library; `api-client`: Vitest.
- File test đặt cạnh file được test (`AppointmentCard.test.tsx`); test xuyên suốt app giữ ở `src/test/`.
- Luôn giả `fetch` (`vi.stubGlobal` / `jest.fn`), không gọi backend thật; dùng `renderWithQuery` ở `src/test/utils.tsx`.
- Truy vấn phần tử theo vai trò và nhãn người dùng thấy (`getByRole('button', { name: 'Đặt lịch' })`), không theo class hay test id nếu tránh được.
- Mỗi màn hình dữ liệu kiểm tra đủ: đang tải, lỗi (theo mã lỗi), rỗng, có dữ liệu.

## Chạy

```powershell
dotnet test backend/NhuNguyetSpa.sln
dotnet test backend/NhuNguyetSpa.sln --filter "FullyQualifiedName~BookingServiceTests"
npm run test
npm run test --workspace @spa/web -- src/features/bookings
```

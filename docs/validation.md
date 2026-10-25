# Kết quả kiểm chứng — 04/10/2026

Kiểm tra trực tiếp tại `E:\UTE\HK126\Code\SpaSystem`, Windows, .NET SDK 9.0.200, Node.js 24.5.0, npm 11.3.0. Khi nâng Expo SDK 54 lên 57, đã dùng npm 11.6.2 qua npx để đồng bộ dependency native sau khi npm 11.3.0 giữ phiên bản peer cũ. Mọi tiến trình smoke test đã được dừng sau kiểm tra.

Sau nâng SDK 57 đã chạy lại cài đặt, Expo Doctor, dependency check, lint, TypeScript, tests, build web, export Android và formatting. Backend và browser responsive smoke bên dưới là kết quả trước nâng SDK; lần nâng này không sửa backend hoặc UI nghiệp vụ.

| Kiểm tra                                  | Kết quả                                                             |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `dotnet restore backend/NhuNguyetSpa.sln` | Đạt                                                                 |
| `dotnet build backend/NhuNguyetSpa.sln`   | Đạt, 0 warning, 0 error                                             |
| `dotnet test backend/NhuNguyetSpa.sln`    | 22/22: Domain 2, Application 7, Integration 13                      |
| `npm install`                             | Đạt; root npm lockfile và 5 workspace links                         |
| `npm run lint`                            | Đạt, không warning                                                  |
| `npm run typecheck`                       | Đạt cho mobile, web, api-client, shared-types                       |
| `npm run test`                            | 53/53: mobile 8, web 34, api-client 11                              |
| `npm run web:build`                       | Đạt, Vite 8.3.2; bundle JS 398.55 kB, gzip 126.03 kB                |
| `npm run mobile:check`                    | Expo public config hợp lệ                                           |
| `npx expo install --check` từ apps/mobile | Dependencies up to date                                             |
| `npx expo-doctor` từ apps/mobile          | 21/21 đạt với Expo SDK 57                                           |
| `npm run mobile:export`                   | Android Metro bundle thành công, resolve aliases và shared packages |
| `npm run format:check`                    | Đạt                                                                 |
| `docker compose config --quiet`           | Đạt                                                                 |

## Runtime và responsive

Đã chạy API bằng process thực, kiểm tra `/api/v1/system/ping`, `/health/live`, `/health/ready`, `/swagger/index.html`, `/swagger/v1/swagger.json`: tất cả trả HTTP 200 trong Development. Response ping có success/data/UTC/errors/traceId. Serilog ghi startup/request logs. Unit middleware kiểm chứng 400/404/409/401/500 và không lộ nội dung exception bất ngờ. Production Swagger 404 được kiểm tra bằng WebApplicationFactory.

Đã chạy production web assets bằng HTTP server tạm và Edge headless. Trang chủ render tiếng Việt ở viewport 1440, 768, 390 và 320 px, không có overflow ngang. Sidebar owner mở được trên mobile. Không có JavaScript exception trong browser. Khi không cấp API URL, SystemStatus hiển thị Configuration Error theo thiết kế. Unit tests mock network kiểm tra online/offline và giới hạn retry.

Project/package references đã kiểm tra: Domain không reference, Application không có ASP.NET Core/EF Core, không có package EF Core/Npgsql/JWT/Redis trong solution. Entity/Migrations/Seeds nghiệp vụ không được tạo. Dự án tham khảo FIXY giữ nguyên trạng thái git ban đầu.

## Giới hạn kiểm chứng

- Docker CLI có sẵn nhưng Docker Desktop Linux daemon chưa chạy. Chưa xác nhận image build hoặc container runtime; Compose syntax đã hợp lệ.
- `adb devices` không có emulator/thiết bị đang kết nối. Đã kiểm tra Expo config, TypeScript, Jest và export Metro Android; chưa thử interaction trên emulator/thiết bị thật.
- Kết quả audit khi cài SDK 57 còn **61 cảnh báo: 50 high, 11 moderate, 0 critical** trong dependency tree Expo/React Native/Jest và dependencies chuyển tiếp. Một cảnh báo có thể lan lên nhiều package; số này không phải số lỗ hổng độc lập. Đã nâng Vitest lên 4.1.11 để bỏ advisory mocker cũ. Chưa chứng nhận dependency tree là sạch về bảo mật; cần review dependencies trước khi đưa vào production. Không dùng `npm audit fix --force` vì các đề xuất major có thể phá cặp SDK/React Native hoặc hạ Expo về SDK cũ.
- AutoMapper dùng bản vá 15.1.3. Yêu cầu giấy phép và cấu hình key được ghi ở README; repository không chứa key. Foundation chỉ đăng ký/kiểm tra configuration, chưa có mapping nghiệp vụ.

Kết quả này xác nhận skeleton build/test được trong môi trường trên; không thay thế acceptance test nghiệp vụ, security review hoặc kiểm tra native release ở phase tiếp theo.

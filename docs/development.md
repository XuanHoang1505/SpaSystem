# Phát triển và kiểm tra

Chạy lệnh từ root trừ khi có chỉ dẫn khác. Đọc README để cấu hình môi trường và HTTPS/emulator.

```powershell
dotnet restore backend/NhuNguyetSpa.sln
dotnet build backend/NhuNguyetSpa.sln
dotnet test backend/NhuNguyetSpa.sln
npm install
npm run lint
npm run typecheck
npm run test
npm run web:build
npm run mobile:check
npm run mobile:export
npm run format:check
docker compose config --quiet
```

Sau khi đã có lockfile, dùng `npm ci` cho cài đặt tái lập. Không tạo lockfile riêng cho từng app hoặc dùng yarn/pnpm. Cập nhật Expo dependencies bằng `npx expo install --check` từ apps/mobile trước khi đổi phiên bản; kiểm tra không có nhiều bản React/React Native không tương thích.

Backend tests gồm unit cho identity/audit/exceptions/result/pagination/DI và integration WebApplicationFactory cho endpoint/Swagger/CORS. Middleware được test trực tiếp với sáu loại exception, không thêm endpoint cố tình lỗi vào API. NSubstitute thay clock để kiểm tra UTC contract. `PersistenceModelTests` dựng model EF (không cần database) và kiểm tra: bảng/cột khớp `docs/domain/data-model.md`, enum lưu `snake_case` có `CHECK`, kiểu cột, khóa ngoại, và không còn thay đổi model chưa có migration. Test readiness dùng chuỗi kết nối không tới được để kiểm tra trả 503.

Web Vitest + Testing Library và mobile Jest Expo + Native Testing Library mock fetch. Kiểm tra loading, online, offline, thiếu environment, thao tác button, input validation, screen/route placeholder. Shared client tests kiểm tra JSON, query, HTTP/network errors, cancellation và response 204. Không phụ thuộc backend thật và không tạo session giả.

`mobile:export` là kiểm tra bundle Metro, không build APK/AAB. Docker build cần Docker Desktop daemon; kiểm tra Compose syntax không thay thế việc build/chạy container.

Thêm feature mới theo README. C# dùng file-scoped namespace và một public type chính mỗi file. TypeScript strict, không dùng any/@ts-ignore để bỏ qua lỗi. Chạy formatter trước khi hoàn tất thay đổi. Không commit env, key, logs, dist, .expo, node_modules, bin/obj.

Thông tin xác nhận kiểm tra của lần khởi tạo sẽ nằm trong [validation.md](validation.md). Nếu SDK hoặc package thay đổi, chạy lại các kiểm tra liên quan trước khi cập nhật kết quả.

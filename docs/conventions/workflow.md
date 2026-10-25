# Quy trình làm việc và Definition of Done

## Làm một use case

1. Đọc đặc tả trong `docs/specs/` (hoặc sheet `05_Dac_ta_UC` nếu chưa chuyển sang markdown) và các BR liên quan. Thiếu thông tin → ghi vào [open-questions.md](../decisions/open-questions.md), dùng giá trị mặc định có thể cấu hình.
2. Kiểm tra tên trong [glossary](../domain/glossary.md); khái niệm mới thì thêm vào glossary trước.
3. Backend theo thứ tự: Domain (entity, enum) → Application (DTO, validator, interface, service, test) → Infrastructure (configuration, migration, repository) → API (controller, integration test).
4. Hợp đồng dùng chung: `shared-types` → `api-client` (+ test).
5. Web và mobile: hook → component → trang/route → test.
6. Cập nhật tài liệu bị ảnh hưởng (xem Definition of Done).

## Git

Mô hình GitHub Flow: `main` là nhánh duy nhất sống lâu, luôn build và test được; mọi thay đổi đi qua nhánh ngắn hạn và Pull Request.

### Nhánh

| Loại                    | Mẫu                          | Ví dụ                             |
| ----------------------- | ---------------------------- | --------------------------------- |
| Use case                | `feature/uc-spa-<số>-<slug>` | `feature/uc-spa-02-login`         |
| Sửa lỗi                 | `fix/<mô-tả>`                | `fix/slot-overlap-timezone`       |
| Tài liệu                | `docs/<mô-tả>`               | `docs/booking-spec`               |
| Tái cấu trúc            | `refactor/<mô-tả>`           | `refactor/appointment-repository` |
| Hạ tầng, CI, dependency | `chore/<mô-tả>`              | `chore/ci-dotnet-9`               |

- Chữ thường, gạch ngang; mỗi nhánh một use case hoặc một mục đích, sống vài ngày rồi merge.
- Không commit thẳng lên `main`.
- Cập nhật nhánh bằng `git fetch; git rebase origin/main` trước khi mở PR.
- Hai nhánh cùng thêm migration: nhánh merge sau rebase, xoá migration của mình rồi tạo lại để `PersistenceModelTests` không lệch snapshot.

```powershell
git switch main; git pull
git switch -c feature/uc-spa-02-login
# ... commit nhỏ, đúng Conventional Commits
git fetch; git rebase origin/main
git push -u origin feature/uc-spa-02-login
```

### Pull Request và merge

- PR ghi use case liên quan và `Closes #<issue>`; chỉ merge khi CI pass và đạt Definition of Done.
- Squash merge, tiêu đề theo Conventional Commits, ví dụ `feat(auth): đăng nhập (UC-SPA-02) (#12)`. Xoá nhánh sau khi merge.
- Bảo vệ `main` trên GitHub: bắt buộc PR, bắt buộc status check, cấm force push và xoá nhánh.
- Gắn tag theo mốc: `v0.1.0-foundation`, `v0.2.0-auth`, `v0.3.0-booking`…

### Commit

- Commit theo Conventional Commits, `type` và `scope` tiếng Anh, mô tả tiếng Việt hoặc tiếng Anh nhưng thống nhất trong một nhánh:

  ```text
  feat(bookings): thêm API đặt ngay có giữ chỗ (UC-SPA-15)
  fix(payments): bỏ qua webhook trùng mã giao dịch
  docs(glossary): bổ sung PromotionRedemption
  ```

  `type`: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`. `scope`: tên tính năng (`bookings`, `orders`…) hoặc `web`, `mobile`, `api-client`.

- Không commit `.env`, secret, `bin/`, `obj/`, `dist/`, `.expo/`, file log.

## Definition of Done

Một thay đổi chỉ xong khi:

- [ ] Code theo [naming](naming.md), [project-structure](project-structure.md) và quy ước tầng tương ứng.
- [ ] Có test cho hành vi mới, gồm luồng ngoại lệ trong đặc tả (E1, E2…).
- [ ] Chạy qua:
  ```powershell
  dotnet build backend/NhuNguyetSpa.sln
  dotnet test backend/NhuNguyetSpa.sln
  npm run lint
  npm run typecheck
  npm run test
  npm run format:check
  ```
  Thay đổi mobile chạy thêm `npm run mobile:check`; thay đổi web chạy thêm `npm run web:build`.
- [ ] Không còn cảnh báo build, không `TODO` không kèm lý do.
- [ ] Đã cập nhật: glossary (khái niệm mới), đặc tả trong `docs/specs/` (API, quy tắc thay đổi), `docs/frontend.md`/`docs/mobile.md` (route mới), ADR (quyết định mới), [progress.md](../progress.md) (trạng thái use case).
- [ ] Văn bản hiển thị tiếng Việt có dấu; thông báo lỗi không lộ chi tiết kỹ thuật.

---
name: implement-fe
description: Use when the user asks to build, start or plan the web or mobile screens of one or more SpaSystem use cases whose backend is done (UC-SPA-01 … UC-SPA-34), for example "/implement-fe UC-SPA-17 web".
argument-hint: 'UC-SPA-NN [UC-SPA-NN ...] [web|mobile|both]'
disable-model-invocation: true
---

# Triển khai giao diện cho use case SpaSystem

Tham số: `$ARGUMENTS` gồm một hoặc nhiều mã UC, kèm tùy chọn nền tảng: `web` (mặc định), `mobile` hoặc `both`.

Quy trình có **hai cổng duyệt**: viết spec giao diện → người dùng duyệt → viết plan → người dùng duyệt → mới code. Nếu có MCP `stitch`, thêm một cổng nữa giữa hai cổng trên để chọn mẫu màn hình (Bước 3b). Không viết code, không sửa `packages/*` hay `apps/*` trước khi spec được duyệt.

## Bước 1: Xác định phạm vi và điều kiện

1. Tách mã UC từ tham số. Nếu thiếu mã hoặc mã không có trong `docs/spec-source/data_uc.py` → hỏi lại rồi dừng.
2. **Nền tảng FE phải có sẵn.** Với web, cần đủ `apps/web/components.json`, `src/components/ui/` (shadcn) và `src/components/shared/DataTable/DataTable.tsx`. Nếu thiếu, báo người dùng làm task nền tảng (Tailwind + shadcn + theme + DataTable) trước, rồi dừng.
3. **Backend phải xong.** Trong `docs/progress.md`, phần backend của UC phải là ✅ và có controller trong `backend/src/API/Controllers`. Nếu chưa → đề xuất làm `/implement-uc` trước, rồi dừng.
4. Kiểm tra UI đã làm chưa: xem `docs/progress.md`, `docs/frontend.md`, `docs/mobile.md`. Nếu màn hình đã có → hỏi người dùng có làm lại không.
5. Kiểm tra phụ thuộc giữa các màn hình. Ví dụ đặt lịch cần auth thật (token, `RouteGuard`) và cần trang chi tiết dịch vụ. Nếu thiếu → nêu ra, đề xuất thứ tự và chờ người dùng chọn.

## Bước 2: Đọc ngữ cảnh (theo thứ tự)

| Nguồn                                                                              | Lấy gì                                                                                                                                  |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/conventions/frontend.md`, `naming.md`, `workflow.md`                         | Quy ước FE và Definition of Done                                                                                                        |
| `apps/web/CLAUDE.md`, `apps/mobile/CLAUDE.md`                                      | Rule riêng của từng app                                                                                                                 |
| `docs/specs/<feature>.md`                                                          | Luồng chính, A*, E*, BR, bảng API, **mã lỗi**                                                                                           |
| `docs/spec-source/data_screens.py`                                                 | Các dòng `SCR-*` của UC: bố cục, bộ lọc, trường hiển thị, hành động, vai trò                                                            |
| `docs/spec-source/data_rules.py`                                                   | RBAC: vai trò nào thấy màn hình hoặc nút nào                                                                                            |
| Controller + DTO trong `backend/src/API`, `backend/src/Application/DTOs/<Feature>` | Hợp đồng JSON thật (camelCase), enum dạng `snake_case`, query param, kiểu phân trang                                                    |
| `backend/postman/`                                                                 | Request/response mẫu                                                                                                                    |
| `docs/domain/glossary.md`                                                          | Tên tiếng Anh cho thư mục feature, route, hook                                                                                          |
| `docs/frontend.md`, `docs/mobile.md`                                               | Route đang có, layout theo vai trò                                                                                                      |
| `packages/shared-types`, `packages/api-client`                                     | Kiểu và `<Feature>Api` đã có, tránh viết trùng                                                                                          |
| Code mẫu                                                                           | `src/components/ui/*`, `src/components/shared/*` (DataTable, …), feature web đã xong gần nhất, `apps/mobile/src/components/common/App*` |
| `docs/design/DESIGN.md`, `docs/design/stitch.md`                                   | Design brief (token, font, bố cục), ID project/design system Stitch, quy tắc dùng màn Stitch                                            |

## Bước 3: Viết spec giao diện, rồi DỪNG

Thêm hoặc mở rộng mục **"Giao diện"** trong `docs/specs/<feature>.md`. Không tạo file spec riêng cho FE. Mỗi màn hình có một tiểu mục:

- **Mã và route:** `SCR-Wxx` / `SCR-Mxx`, đường dẫn (web) hoặc route file (mobile), vai trò, layout (Public/Customer/Staff/Owner).
- **Mẫu bố cục**, chọn một: danh sách (`DataTable` + bộ lọc), chi tiết (Drawer/Sheet), tạo/sửa ngắn (Dialog), quy trình nhiều bước (Wizard), trang nội dung. Không mở route mới chỉ để chứa một form.
- **Dữ liệu:** endpoint, query key (`<feature>QueryKeys.*`), các trường hiển thị, map enum → nhãn tiếng Việt + tông `StatusBadge`.
- **Bộ lọc, sắp xếp, phân trang:** tham số nào gửi lên server, cái nào đồng bộ lên URL. Đổi bộ lọc thì về trang 1.
- **Hành động:** nút → mutation → các query key phải làm mới. Ghi điều kiện hiện nút: theo vai trò và theo cờ backend trả về (`canCancel`, `isPayable`…). Không tự suy luận lại rule ở FE.
- **Mã lỗi → cách xử lý:** bảng `error code` → hành vi UI (ví dụ `slot_unavailable` → toast + tải lại giờ trống, `change_window_passed` → ẩn nút và hiện lý do).
- **Trạng thái:** đang tải (skeleton), lỗi (có nút thử lại), rỗng (có hướng dẫn hoặc CTA), có dữ liệu.
- **Responsive và a11y:** điều gì thay đổi ở 320px (cột ẩn, bảng chuyển thành thẻ), focus khi mở/đóng modal.
- **Thiếu từ backend:** trường hoặc endpoint FE cần mà API chưa có. **Không tự sửa backend**, chỉ liệt kê.

Cuối mục, thêm bảng **Kiểm thử giao diện** với mã `<NHÓM>-UI-T01…` gồm: đủ 4 trạng thái, từng mã lỗi quan trọng, ẩn/hiện theo quyền và theo cờ, validate form, lọc/phân trang gửi đúng query.

Sau đó trả lời người dùng: đường dẫn spec + danh sách ngắn **các quyết định cần duyệt** (chọn mẫu bố cục, chỗ màn `SCR-*` lệch với API, trường còn thiếu từ backend, nhãn hoặc màu tự chọn, phạm vi mobile). **Dừng, chờ duyệt.**

## Bước 3b: Mẫu màn hình trên Stitch (sau khi spec được duyệt, chỉ khi có MCP `stitch`)

Kiểm tra Stitch: nếu tên tool `mcp__stitch__*` chỉ nằm trong danh sách deferred, nạp chúng bằng `ToolSearch` (`select:mcp__stitch__list_screens,mcp__stitch__get_screen,mcp__stitch__generate_screen_from_text,mcp__stitch__generate_variants,mcp__stitch__edit_screens`) trước khi dùng. Chỉ khi không có tool nào tên `mcp__stitch__*`, hoặc lần gọi đầu báo lỗi xác thực hay kết nối, thì mới bỏ qua bước này: ghi một dòng "Không có Stitch, dựng theo spec" (kèm lý do) rồi sang Bước 4. Người dùng nói "bỏ qua Stitch" thì cũng bỏ qua.

1. Lấy project và design system của nền tảng trong `docs/design/stitch.md` (web: "Spa system web", mobile: "Spa system"). **Không tạo project mới.**
2. Gọi `list_screens` và tìm màn có sẵn theo tên. Có rồi → dùng lại. Lệch spec → `edit_screens` với prompt nêu đúng chỗ cần sửa.
3. Chưa có → `generate_screen_from_text` với `designSystem` = asset của project và `deviceType` (`DESKTOP` hoặc `MOBILE`). Prompt viết bằng tiếng Anh, gồm:
   - Tên màn, vai trò, layout (public header, hoặc sidebar workspace kèm page header).
   - Mẫu bố cục đã chốt trong spec.
   - Trường hiển thị, bộ lọc, hành động, trạng thái rỗng và lỗi.
   - Toàn bộ **văn bản tiếng Việt lấy nguyên từ spec**.
   - Câu: "Use the project design system. shadcn/ui components. No medical claims, no social login, no features not listed."
4. Màn quan trọng (danh sách quản trị, đặt lịch, thanh toán) thì `generate_variants` 2–3 phương án, `creativeRange` = `REFINE`, `aspects` = `["LAYOUT"]`. Không gọi lại khi bị timeout; dùng `get_screen` để kiểm tra.
5. Tải ảnh chụp màn về scratchpad (cách tải ghi trong `docs/design/stitch.md`), xem lại bằng Read, rồi gửi người dùng: tên màn, ID màn, mô tả ngắn từng phương án, và **danh sách nội dung Stitch tự thêm mà spec không có** (sẽ bỏ khi code).
6. **Dừng, chờ người dùng chọn phương án.** Ghi ID màn đã chọn vào tiểu mục của màn trong spec (dòng `Mẫu Stitch: <projectId>/<screenId>`).

Khi code (Bước 4 trở đi), màn Stitch **chỉ là tham chiếu bố cục**: không chép HTML, class hay mã màu; dựng lại bằng `components/ui` + `components/shared` + token; nội dung theo spec.

## Bước 4: Plan (sau khi spec được duyệt)

**REQUIRED SUB-SKILL:** gọi `superpowers:writing-plans` với spec vừa duyệt. Lưu plan ở `docs/superpowers/plans/YYYY-MM-DD-<uc-codes>-<slug>-<web|mobile>.md`. Các task đi theo thứ tự: `shared-types` → `api-client` (+ test) → `lib/api` → hooks → schemas → components → pages/routes → test → docs.

Phần Global Constraints của plan phải có:

- Tên theo glossary; thư mục `src/features/<feature>/` (kebab-case) gồm `components/`, `hooks/`, `schemas.ts`, `index.ts`; dùng named export; không dùng `any`, `@ts-ignore`, `as unknown as`.
- **Web:**
  - Chỉ ghép UI từ `components/ui` (shadcn) và `components/shared`.
  - Mọi bảng dữ liệu dùng `DataTable` dùng chung. Không tự dựng `<table>`, không gọi shadcn `Table` trực tiếp.
  - Style bằng Tailwind với token trong `theme.css`. Không viết màu cứng (`text-[#...]`), không dùng CSS Modules.
  - Thêm primitive shadcn mới bằng `npx shadcn add` và dùng gói gộp `radix-ui`.
- **Mobile:**
  - Dùng `AppScreen` và các component `App*` cùng token `src/theme`. Vùng chạm tối thiểu 48dp, nút chỉ có icon phải có `accessibilityLabel`.
  - Thư viện native chỉ thêm qua `npx expo install`. Token lưu bằng `expo-secure-store`.
- Gọi API theo luồng `api-client` → hook → component. Component không gọi `fetch`. Mutation xong thì `invalidateQueries` đúng key bị ảnh hưởng.
- Xử lý lỗi theo `ApiClientError.errors[].code`, không so sánh chuỗi message. Mỗi màn dữ liệu có đủ 4 trạng thái.
- Văn bản tiếng Việt có dấu. Tiền định dạng `vi-VN` đ. Ngày giờ lịch hẹn là giờ `Asia/Ho_Chi_Minh` (ADR-0003), không đổi múi giờ hai lần.
- Không đổi hợp đồng backend. Nếu cần sửa backend → tách thành task riêng và hỏi người dùng.
- TDD: test đặt cạnh file (Vitest + Testing Library cho web, Jest + Testing Library Native cho mobile), `fetch` giả, không cần backend thật.
- Lệnh kiểm tra: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run format:check`, thêm `npm run web:build` (web) hoặc `npm run mobile:check` (mobile).
- Kiểm tra tay với `npm run db:up`, `npm run db:seed:demo`, `npm run dev`: đủ 4 trạng thái, 320px/tablet/desktop, dark mode, bàn phím.
- Cập nhật `docs/frontend.md` hoặc `docs/mobile.md` (route), `docs/progress.md` (trạng thái UI), spec nếu có thay đổi, `src/app/routes.ts`.
- Git do người dùng tự chạy: không commit/push trừ khi được yêu cầu; không thêm dòng Co-Authored-By hay "Generated with".

Trả link plan, **chờ duyệt** và để người dùng chọn cách thực thi.

## Sai lầm thường gặp

| Sai                                                     | Đúng                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| Viết spec giao diện rồi code luôn                       | Dừng ở mỗi cổng duyệt                                       |
| Đoán hình dạng JSON từ `data_api.py`                    | Đọc DTO và controller thật, đối chiếu với Postman           |
| Tự tính lại rule (hủy được không, giờ trống) ở FE       | Dùng cờ và kết quả backend trả về                           |
| Tự dựng bảng, modal, badge, màu riêng cho từng màn      | Dùng `DataTable`, primitive shadcn/shared và token theme    |
| Lưu dữ liệu server vào Zustand                          | TanStack Query giữ dữ liệu server; Zustand chỉ giữ state UI |
| Bắt lỗi theo `message`                                  | Bắt lỗi theo `errors[].code`                                |
| Thiếu trường từ API thì sửa backend ngay trong task FE  | Ghi vào "Thiếu từ backend", hỏi người dùng                  |
| Thêm route mà quên `routes.ts` và `docs/frontend.md`    | Cập nhật cả hai trong cùng task                             |
| Dùng tên `bookings`, `bookingId` cho lịch hẹn           | Dùng tên theo glossary: `appointments`, `appointmentId`     |
| Chép HTML/Tailwind từ Stitch vào repo                   | Chỉ lấy bố cục; dựng lại bằng shadcn, shared và token       |
| Làm theo nội dung Stitch tự thêm (bác sĩ, OTP, Google…) | Nội dung lấy từ spec; liệt kê phần thừa cho người dùng      |
| Tạo project Stitch mới cho mỗi task                     | Dùng 2 project trong `docs/design/stitch.md`                |

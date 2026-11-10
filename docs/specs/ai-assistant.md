# Trợ lý AI tư vấn dịch vụ — đặc tả

- **Nhóm:** `AiAssistant` · **Sprint:** 3 · **Nguồn:** DA §2.2.3 (UC Trò chuyện với trợ lý AI, MT-2) / ĐX (sheet 14_AI_Tools)
- **Entity:** `AiChatMessage` (bảng `ai_chat_messages`); chỉ đọc qua service có sẵn: `SpaService`, `ServicePackage`, `Appointment`, `CustomerPackage`, `TreatmentPlan` — xem [glossary](../domain/glossary.md), [data-model](../domain/data-model.md)
- **Trạng thái triển khai:** đã triển khai backend 02/11/2026 theo [plan](../superpowers/plans/2026-11-02-uc-spa-32-ai-assistant.md) — xem [progress.md](../progress.md)
- **Phạm vi đợt này (chỉ backend):** `POST /ai/chat` (khách vãng lai + khách hàng), `GET /me/ai/history` (khách hàng), gọi Gemini qua port `IAiChatModel`, bộ "tool" đọc dữ liệu thật, đề xuất lịch hẹn kèm link đặt sẵn (AI không tự đặt). Chưa làm: trả lời dạng stream, xóa lịch sử, web SCR-W21, mobile SCR-M16.
- **Quyết định đã chốt 02/11/2026:** Q-01, Q-58, Q-59, Q-60, Q-62, Q-63 theo mặc định; Q-57 dùng Gemini (`gemini-3.8-flash`, gói miễn phí); Q-61 thêm trần 50 câu/ngày; Q-64 AI hỗ trợ đặt lịch bằng đề xuất + link đặt sẵn.

## Use case

### UC-SPA-32 — Trò chuyện với trợ lý AI tư vấn dịch vụ

| Mục            | Nội dung                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actor          | Khách vãng lai, khách hàng; hệ thống ngoài: mô hình ngôn ngữ (Gemini)                                                                                                          |
| Mô tả          | Khách hỏi về dịch vụ, gói, giá, giờ trống; khách hàng hỏi thêm lịch hẹn và số buổi còn lại của mình. AI chỉ dựa trên dữ liệu thật, không chẩn đoán y khoa                      |
| Tiền điều kiện | Không cần đăng nhập. Có Bearer khách hàng → được dùng dữ liệu cá nhân và lưu lịch sử                                                                                           |
| Input          | `question` (1–1000 ký tự)                                                                                                                                                      |
| Output         | `answer` (văn bản tiếng Việt), `suggestions` (tối đa 3 dịch vụ/gói đang bán), `bookingProposals` (tối đa 3 lịch đề xuất kèm link đặt sẵn); khách hàng: lượt hỏi – đáp được lưu |

**Luồng chính**

1. Khách mở cửa sổ tư vấn AI (SCR-W21 / SCR-M16; nút chat nổi ở SCR-W01, SCR-W02).
2. Khách hàng đã đăng nhập: client gọi `GET /me/ai/history` để hiện lịch sử. Khách vãng lai: khung chat trống.
3. Khách nhập câu hỏi và gửi `POST /ai/chat`.
4. Hệ thống kiểm tra nội dung (BR-AI-03), dựng ngữ cảnh: lời nhắc hệ thống (BR-AI-01), các lượt gần nhất của khách hàng (BR-AI-04), danh sách tool được phép theo vai trò (BR-AI-02, BR-AI-05).
5. Hệ thống gửi yêu cầu đến mô hình AI. Khi mô hình gọi tool, hệ thống chạy tool trên dữ liệu thật (mã khách hàng luôn lấy từ JWT) và gửi kết quả lại; lặp tối đa `Ai:MaxToolRounds` vòng.
6. Mô hình trả câu trả lời; hệ thống lọc gợi ý sản phẩm (BR-AI-05) và đề xuất lịch (BR-AI-08).
7. Khách hàng: lưu `ai_chat_messages` (câu hỏi, câu trả lời). Trả `{ answer, suggestions, bookingProposals, saved }`.

**Luồng rẽ nhánh**

- A1. **Hỏi tiếp** → quay lại bước 3; với khách hàng, lượt vừa lưu nằm trong ngữ cảnh lần sau (BR-AI-04).
- A2. **Mở sản phẩm gợi ý** → client chuyển đến `suggestions[i].path` (`/services/{id}` hoặc `/packages/{id}`, SCR-W03/W05).
- A3. **Khách vãng lai** → trả lời bình thường nhưng chỉ có tool danh mục và giờ trống, không lưu, `saved = false` (Q-01). Hỏi về lịch hẹn/số buổi của mình → AI mời đăng nhập.
- A4. **Câu hỏi về bệnh lý, triệu chứng, thuốc, chẩn đoán** (kể cả hỏi gián tiếp "da tôi bị vậy là bệnh gì") → mô hình phân loại `medical`; server **thay toàn bộ câu trả lời** bằng câu cố định "Mình không thể chẩn đoán hay tư vấn thuốc. Bạn nên gặp bác sĩ da liễu để được khám…", không gợi ý sản phẩm, không đề xuất lịch (BR-AI-01, UAT-25).
- A7. **Câu hỏi ngoài phạm vi website** (thời tiết, lập trình, chính trị, spa khác, kiến thức chung không liên quan…) → mô hình phân loại `out_of_scope`; server thay bằng câu cố định "Câu hỏi này nằm ngoài phạm vi hỗ trợ của trợ lý Spa Như Nguyệt. Mình có thể giúp bạn về dịch vụ, gói, giá, giờ trống và lịch hẹn tại spa." (BR-AI-09).
- A6. **Nhờ đặt lịch** ("đặt giúp tôi chăm sóc da mặt sáng thứ 7", "đặt buổi tiếp theo của gói") → AI tìm giờ trống rồi gọi `propose_booking`; server kiểm tra lại giờ còn trống và trả `bookingProposals`. Khách bấm thẻ → client mở màn đặt lịch SCR-W13/SCR-M18 đã điền sẵn dịch vụ (hoặc dịch vụ đã mua/buổi gói), ngày, giờ, nhân viên → khách xác nhận qua API đặt lịch hiện có (`POST /me/appointments/book-now` → thanh toán, hoặc `POST /me/appointments`). AI **không tự tạo lịch**, không giữ chỗ; câu trả lời phải nói rõ "bấm để xác nhận đặt lịch" (Q-64). Khách vãng lai chỉ nhận đề xuất dịch vụ lẻ, bấm vào sẽ được yêu cầu đăng nhập.
- A5. **Mô hình từ chối / bộ lọc an toàn chặn** (Gemini `finishReason = SAFETY` hoặc `promptFeedback.blockReason`) → 200 với câu trả lời cố định "Xin lỗi, mình chưa thể hỗ trợ câu hỏi này…", không gợi ý; khách hàng vẫn lưu lượt này (Q-62).

**Ngoại lệ**

- E1. Câu hỏi rỗng/chỉ khoảng trắng, dài hơn `Ai:MaxQuestionLength` (1000) ký tự, hoặc chứa ký tự điều khiển → `400 validation_error` (`field = question`) (Q-63).
- E2. Mô hình không phản hồi trong `Ai:TimeoutSeconds`, lỗi mạng/5xx từ nhà cung cấp, 429 (hết hạn mức gói miễn phí Gemini), vượt `Ai:MaxToolRounds` mà chưa có câu trả lời, hoặc thiếu `GEMINI_API_KEY` → `503 ai_unavailable` "Trợ lý AI tạm thời chưa thể trả lời, vui lòng gửi lại."; **không lưu** gì, client cho gửi lại.
- E3. Nhân viên hoặc chủ spa gọi `POST /ai/chat` → `403 forbidden` (sheet 21: `ai.chat` chỉ GUEST, CUS; tạm thời theo Q-60).
- E4. Gửi quá `Ai:RateLimit:PermitLimit` lượt trong `Ai:RateLimit:WindowSeconds`, hoặc quá `Ai:RateLimit:DailyLimit` lượt trong ngày (giờ VN) → `429 rate_limited` (BR-AI-06).
- E5. `GET /me/ai/history` không Bearer → `401 unauthorized`; nhân viên/chủ spa → `403 forbidden`; `limit` ngoài 1…`Ai:History:MaxLimit` → `400 validation_error`.

**Quy tắc áp dụng:** BR-AI-01 … BR-AI-09

## Business rules

| Mã       | Quy tắc                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Enforce ở đâu                             | Nguồn            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------- |
| BR-AI-01 | **Tuyệt đối không chẩn đoán y khoa**, hai lớp: (1) lời nhắc hệ thống cố định (trong code Application, không lấy từ dữ liệu người dùng) cấm chẩn đoán bệnh, giải thích triệu chứng, kê/gợi ý thuốc (kể cả thuốc bôi), cam kết hiệu quả điều trị; (2) mỗi câu trả lời cuối phải kèm nhãn phân loại `scope` (BR-AI-09) — nhãn `medical` → server bỏ văn bản của mô hình, trả câu cố định khuyên gặp bác sĩ da liễu, không gợi ý/đề xuất. Giao diện luôn hiện dòng lưu ý cố định | Application (prompt + kiểm tra nhãn) + UI | DA               |
| BR-AI-02 | Chỉ dùng dữ liệu thật: AI chỉ nói về sản phẩm/giá/giờ trống qua tool đọc DB; chỉ dịch vụ/gói `active` và danh mục đang hiện. Dữ liệu cá nhân chỉ của khách hàng đang đăng nhập — tool cá nhân **không có tham số mã khách hàng**, service lấy từ `ICurrentUserService`; khách vãng lai không được cấp các tool này                                                                                                                                                           | Application                               | DA (bước 4) + ĐX |
| BR-AI-03 | Kiểm tra câu hỏi trước khi gọi AI: cắt khoảng trắng hai đầu, 1…`Ai:MaxQuestionLength` ký tự, không ký tự điều khiển (trừ xuống dòng/tab). Nội dung "không phù hợp" (ngoài chủ đề spa, xúc phạm) không chặn bằng danh sách từ khóa mà xử lý bằng nhãn `scope` (BR-AI-09)                                                                                                                                                                                                      | Validator + prompt                        | DA (E1) + ĐX     |
| BR-AI-04 | Lưu lịch sử: chỉ khách hàng (`customer_id` not null, Q-01); lưu sau khi có câu trả lời, một dòng = một lượt hỏi – đáp, `created_at_utc` từ đồng hồ hệ thống. Ngữ cảnh gửi AI = `Ai:HistoryTurnsInContext` (5) lượt gần nhất của chính khách đó, theo thứ tự thời gian; khách vãng lai mỗi câu hỏi độc lập, server không nhận lịch sử do client gửi (Q-58)                                                                                                                    | Application                               | DA + ĐX          |
| BR-AI-05 | Gợi ý sản phẩm: AI đề xuất qua tool `suggest_products` (loại + mã); server chỉ giữ sản phẩm tồn tại, `active`, bỏ trùng, tối đa `Ai:MaxSuggestions` (3), trả tên/giá hiện tại từ DB và `path`. Gợi ý không lưu vào lịch sử (bảng không có cột, Q-59)                                                                                                                                                                                                                         | Application                               | DA (A2) + ĐX     |
| BR-AI-06 | Giới hạn tần suất `ai` (hai giới hạn nối tiếp): cửa sổ cố định `Ai:RateLimit:PermitLimit` (10) lượt / `Ai:RateLimit:WindowSeconds` (60) giây và `Ai:RateLimit:DailyLimit` (50) lượt / ngày, phân vùng theo mã người dùng nếu có Bearer, ngược lại theo IP. Bộ đếm trong bộ nhớ (khởi động lại API thì đặt lại) — đủ cho một máy chủ. Hết thời gian chờ tổng `Ai:TimeoutSeconds` (30, gồm cả các vòng tool) → E2                                                              | API (rate limiter) + Infrastructure       | DA (E2) + ĐX     |
| BR-AI-07 | Tối thiểu dữ liệu gửi ra ngoài: tool trả về cho AI chỉ trường cần để tư vấn (tên, giá, thời lượng, ngày giờ, trạng thái, số buổi); không gửi email, số điện thoại, ghi chú nội bộ, hồ sơ da, dị ứng. Không ghi log nội dung câu hỏi/câu trả lời ở mức Information                                                                                                                                                                                                            | Application + Infrastructure              | ĐX               |

| BR-AI-08 | Đề xuất lịch hẹn: AI gọi `propose_booking` với đúng một nguồn (`spaServiceId` \| `serviceEntitlementId` \| `treatmentSessionId`), ngày, giờ bắt đầu, nhân viên tùy chọn. Server kiểm tra lại bằng `IAvailabilityService` (cùng quy tắc với `GET /availability`: ngày trong `Booking:MaxDaysAhead`, dịch vụ đang bán, quyền/buổi thuộc khách đang đăng nhập và đủ điều kiện, giờ còn trống, không trùng lịch của khách); không đạt → `tool_result` lỗi cho AI chọn giờ khác. Tối đa `Ai:MaxBookingProposals` (3), bỏ trùng. Đề xuất không giữ chỗ, không ghi DB, không lưu vào lịch sử; giờ có thể hết khi khách bấm — API đặt lịch kiểm tra lại (`409 slot_unavailable`) | Application | ĐX (Q-64) |

| BR-AI-09 | **Giới hạn phạm vi website:** trợ lý chỉ trả lời về Spa Như Nguyệt — dịch vụ, gói, giá, khuyến mãi đang bán, giờ trống, cách đặt/đổi/hủy lịch, thanh toán, lịch hẹn và gói của chính khách, chăm sóc da thông thường gắn với dịch vụ của spa. Câu trả lời cuối của mô hình là lời gọi tool bắt buộc `final_answer { scope: in_scope \| out_of_scope \| medical, answer }`. Server: `in_scope` → dùng `answer`; `out_of_scope` → câu cố định "ngoài phạm vi" (A7), bỏ gợi ý/đề xuất; `medical` → câu cố định A4; JSON sai/thiếu `scope` → coi như lỗi mô hình (`503 ai_unavailable`). Câu cố định nằm trong code Application, lượt vẫn được lưu với câu cố định (khách hàng) | Application (prompt + kiểm tra nhãn) | ĐX (Q-65) |

## Phân quyền

| Quyền     | Vai trò                                     | Endpoint                                                                                                         |
| --------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `ai.chat` | Khách hàng (policy); khách vãng lai ẩn danh | `GET /me/ai/history` (policy `ai.chat`); `POST /ai/chat` `[AllowAnonymous]`, service chặn nhân viên/chủ spa (E3) |

Thêm `AiChat = "ai.chat"` → `[Customer]` vào `API/Authorization/Permissions.cs` (đúng dòng `ai.chat` sheet 21; cột GUEST xử lý bằng `[AllowAnonymous]` như `catalog.view`).

## Dữ liệu

| Bảng                                                           | Cột dùng                                                    | Ghi chú                                                                                                                             |
| -------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ai_chat_messages`                                             | `id`, `customer_id`, `question`, `answer`, `created_at_utc` | Ghi; **thêm index** `ix_ai_chat_messages_customer_id_created_at_utc` (`customer_id`, `created_at_utc DESC`) cho lịch sử và ngữ cảnh |
| `spa_services`, `service_packages`, `service_categories`       | qua `IServiceCatalogService`, `IPackageCatalogService`      | Chỉ đọc, chỉ `active`                                                                                                               |
| `appointments`, `work_schedules`, `staff_*`                    | qua `IAvailabilityService`, `IMyAppointmentService`         | Chỉ đọc                                                                                                                             |
| `customer_packages`, `treatment_plans`, `service_entitlements` | qua `IPurchaseService`                                      | Chỉ đọc                                                                                                                             |

Thay đổi schema: chỉ thêm index trong `AiChatMessageConfiguration` + migration `AddAiChatMessageHistoryIndex`. Không thêm cột; `data-model.md` không liệt kê index nên `data_db.py` giữ nguyên.

## Kiến trúc tích hợp AI

- **Application** (`UseCases/AiAssistant`): `AiAssistantService` (kiểm tra, dựng ngữ cảnh, lưu), `AiAssistantPrompt` (lời nhắc hệ thống cố định), `AiToolCatalog` + `AiToolExecutor` (định nghĩa tool trung lập — tên, mô tả, JSON schema — và chạy tool bằng service có sẵn). Port `Interfaces/Ai/IAiChatModel`: nhận lời nhắc hệ thống, các lượt trước, câu hỏi, danh sách tool và một callback chạy tool; trả `AiChatCompletion { Scope, Text, Refused }` hoặc lỗi "không khả dụng"; Application quyết định câu trả lời cuối theo `Scope` (BR-AI-09). Application không tham chiếu SDK.
- **Infrastructure** (`Ai/GeminiAiChatModel`, chọn theo `Ai:Provider` = `gemini`): gọi REST `POST {BaseUrl}models/{model}:generateContent` (header `x-goog-api-key`) bằng typed `HttpClient`, không dùng SDK (chốt khi lập plan: API của SDK .NET chưa xác minh được, REST ổn định và test được bằng `HttpMessageHandler` giả); lời nhắc hệ thống qua `systemInstruction`, tool qua `functionDeclarations`, `toolConfig.functionCallingConfig.mode = ANY` nên mô hình luôn gọi tool; câu trả lời cuối là lời gọi tool bắt buộc `final_answer { scope, answer }` (thay `responseSchema`, chạy được với mọi model hỗ trợ function calling) — vòng lặp `functionCall` → `functionResponse` viết tay để kiểm soát số vòng và thời gian; kiểm tra `finishReason` (`SAFETY`, `MAX_TOKENS`) và `promptFeedback.blockReason` trước khi đọc nội dung; hủy theo `CancellationToken` tổng `Ai:TimeoutSeconds`, không tự thử lại. Thiếu khóa → `IAiChatModel` báo không khả dụng (API vẫn khởi động, như Cloudinary/VNPay). Đổi nhà cung cấp sau này = thêm adapter mới + giá trị `Ai:Provider`, không đổi Application.
- **Test:** `FakeAiChatModel` (kịch bản: trả lời thẳng, gọi tool rồi trả lời, quá thời gian, từ chối); không gọi Gemini thật trong test tự động.

### Tool cho AI

Tên tiếng Anh theo ADR-0001 (thay `tim_dich_vu`… ở sheet 14 tại chỗ trong `data_api.py`).

| Tool                   | Ai được dùng                   | Tham số                                                                                              | Kết quả gửi AI                                                                                                                                                            | Dùng lại                                                |
| ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `search_catalog`       | Khách, KH                      | `{ keyword?, productType?: service\|package, maxPrice? }`                                            | ≤ `Ai:SearchResultLimit` (5) sản phẩm `{ productType, id, name, price, durationMinutes \| totalSessions, shortDescription }`                                              | `Service/PackageCatalogService.SearchAsync` (không dấu) |
| `get_product_detail`   | Khách, KH                      | `{ productType, id }`                                                                                | Mô tả, giá, thời lượng/số buổi, dịch vụ thành phần, khoảng cách buổi, thời hạn                                                                                            | `GetAsync`                                              |
| `find_available_slots` | Khách, KH                      | `{ serviceId, date }` (hôm nay … `Booking:MaxDaysAhead`)                                             | Các giờ bắt đầu còn trống trong ngày (gộp mọi nhân viên, tối đa 20)                                                                                                       | `IAvailabilityService`                                  |
| `list_my_appointments` | KH                             | `{}`                                                                                                 | Lịch sắp tới: ngày, giờ, dịch vụ, nhân viên, trạng thái (tối đa 10)                                                                                                       | `IMyAppointmentService` (`upcoming`)                    |
| `list_my_packages`     | KH                             | `{}`                                                                                                 | Gói đã mua: tên, đã dùng/tổng buổi, còn lại, hạn dùng, trạng thái, buổi tiếp theo (mã buổi, dịch vụ, ngày sớm nhất, `canBook`); dịch vụ lẻ chưa dùng (mã, tên, `canBook`) | `IPurchaseService`                                      |
| `propose_booking`      | Khách (chỉ `spaServiceId`), KH | `{ spaServiceId? \| serviceEntitlementId? \| treatmentSessionId?, date, startTime, staffMemberId? }` | `"ok"` + tóm tắt, hoặc lỗi "giờ không còn trống / không đủ điều kiện" — server ghi nhận để trả `bookingProposals` (BR-AI-08)                                              | `IAvailabilityService`                                  |
| `suggest_products`     | Khách, KH                      | `{ items: [{ productType, id }] }` (≤ 3)                                                             | `"ok"` — server ghi nhận để trả `suggestions` (BR-AI-05)                                                                                                                  | —                                                       |

Tham số tool sai (schema/kiểu/ngày ngoài khoảng/mã không tồn tại) → trả `tool_result` lỗi ngắn cho AI tự sửa, không ném lỗi ra API.

## API

Tên trường tiếng Anh (thay `cauHoi`, `cauTraLoi`, `goiY`, `truoc` ở `data_api.py` dòng SPA-API-105/106 tại chỗ, không thêm/xóa dòng).

| Method | Đường dẫn               | Vai trò            | Request                                                                     | Response `data`                                                                                                                                                                                                                                                                                                                                                                                                                               | Lỗi                |
| ------ | ----------------------- | ------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| POST   | `/api/v1/ai/chat`       | Khách vãng lai, KH | `{ question }`                                                              | `{ answer, suggestions: [{ productType: service\|package, productId, name, price, path }], bookingProposals: [{ kind: book_now\|book_entitlement\|book_session, spaServiceId?, serviceEntitlementId?, treatmentSessionId?, serviceName, date, startTime, endTime, staffMemberId?, staffName?, path }], saved, messageId? }` (`messageId` khi đã lưu; `path` ví dụ `/booking/new?serviceId=…&date=2026-11-07&startTime=09:00&staffMemberId=…`) | 400, 403, 429, 503 |
| GET    | `/api/v1/me/ai/history` | KH (`ai.chat`)     | Query `before?` (UTC, lấy các lượt trước mốc này), `limit?` (20, tối đa 50) | `{ items: [{ id, question, answer, createdAtUtc }], hasMore }` — mới nhất trước; client đảo lại để hiển thị                                                                                                                                                                                                                                                                                                                                   | 400, 401, 403      |

## Cấu hình

`.env` (secret, thêm vào `EnvLoader` và `.env.example`):

| Biến             | Ánh xạ      | Ghi chú                                                                                    |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `GEMINI_API_KEY` | `Ai:ApiKey` | Khóa Gemini API (tạo ở Google AI Studio); thiếu → `POST /ai/chat` trả `503 ai_unavailable` |

`appsettings.json`, mục mới `Ai` (không secret):

| Khóa                         | Mặc định           | Ý nghĩa                                       |
| ---------------------------- | ------------------ | --------------------------------------------- |
| `Ai:Provider`                | `gemini`           | Adapter được dùng (Q-57)                      |
| `Ai:Model`                   | `gemini-3.8-flash` | Mã model (Q-57)                               |
| `Ai:MaxOutputTokens`         | 2048               | Trần độ dài câu trả lời                       |
| `Ai:TimeoutSeconds`          | 30                 | Thời gian chờ tổng mỗi câu hỏi (E2)           |
| `Ai:MaxToolRounds`           | 4                  | Số vòng gọi tool tối đa                       |
| `Ai:MaxQuestionLength`       | 1000               | BR-AI-03                                      |
| `Ai:HistoryTurnsInContext`   | 5                  | BR-AI-04                                      |
| `Ai:SearchResultLimit`       | 5                  | Kết quả `search_catalog`                      |
| `Ai:MaxSuggestions`          | 3                  | BR-AI-05                                      |
| `Ai:MaxBookingProposals`     | 3                  | BR-AI-08                                      |
| `Ai:History:DefaultLimit`    | 20                 | `GET /me/ai/history`                          |
| `Ai:History:MaxLimit`        | 50                 |                                               |
| `Ai:RateLimit:PermitLimit`   | 10                 | BR-AI-06                                      |
| `Ai:RateLimit:WindowSeconds` | 60                 |                                               |
| `Ai:RateLimit:DailyLimit`    | 50                 | Trần số câu mỗi ngày (giờ VN), BR-AI-06, Q-61 |

## Màn hình

| Mã      | Nền tảng | Route                             | Hành động chính                                        |
| ------- | -------- | --------------------------------- | ------------------------------------------------------ |
| SCR-W21 | Web      | `/ai-assistant`                   | Khung chat, thẻ gợi ý, lưu ý không chẩn đoán (đợt sau) |
| SCR-M16 | Android  | `app/(customer)/ai-assistant.tsx` | Hỏi – đáp (đợt sau)                                    |

## Kiểm thử bắt buộc

Unit test (Application.Tests: NSubstitute, đồng hồ giả, `FakeAiChatModel`); integration test (`PostgresFixture`, Testcontainers, `FakeAiChatModel` thay `IAiChatModel`).

| Mã     | Tình huống                                                                                                                                                                                                 | Kết quả mong đợi                                                                                                                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AI-T01 | Validator: rỗng, chỉ khoảng trắng, 1001 ký tự, có ký tự điều khiển; 1000 ký tự có xuống dòng                                                                                                               | `400 validation_error` (`field = question`); trường hợp cuối hợp lệ                                                                                                                                                |
| AI-T02 | Khách vãng lai hỏi, model trả lời thẳng                                                                                                                                                                    | 200, `saved = false`, không dòng nào trong `ai_chat_messages`; model chỉ nhận 4 tool công khai                                                                                                                     |
| AI-T03 | Khách hàng hỏi                                                                                                                                                                                             | 200, `saved = true`, `messageId`; dòng mới đúng `customer_id` từ JWT, `created_at_utc` = đồng hồ giả                                                                                                               |
| AI-T04 | Khách hàng đã có 7 lượt                                                                                                                                                                                    | Model nhận đúng 5 lượt gần nhất theo thứ tự thời gian, không lẫn lượt của khách khác                                                                                                                               |
| AI-T05 | Model gọi `list_my_packages` (UAT-26): khách A và B đều có gói                                                                                                                                             | Kết quả tool chỉ có gói của A, số buổi còn lại đúng; không có email/SĐT/ghi chú                                                                                                                                    |
| AI-T06 | Model gọi `search_catalog` (từ khóa không dấu), `get_product_detail` gói ngừng bán, `find_available_slots` ngày quá xa                                                                                     | Chỉ sản phẩm `active`, ≤ 5; gói ngừng bán → tool lỗi; ngày ngoài khoảng → tool lỗi; API vẫn 200 khi model trả lời sau đó                                                                                           |
| AI-T07 | Model gọi `suggest_products` với 1 dịch vụ hợp lệ, 1 gói ngừng bán, 1 mã không tồn tại, 1 trùng, 4 mục                                                                                                     | `suggestions` chỉ chứa sản phẩm hợp lệ, không trùng, ≤ 3, tên/giá từ DB, `path` đúng                                                                                                                               |
| AI-T08 | Model quá thời gian / lỗi nhà cung cấp / vượt `MaxToolRounds` / thiếu khóa API                                                                                                                             | `503 ai_unavailable`, không lưu dòng nào                                                                                                                                                                           |
| AI-T09 | Model báo từ chối (`Refused`)                                                                                                                                                                              | 200, câu trả lời cố định, `suggestions` rỗng; khách hàng: có lưu                                                                                                                                                   |
| AI-T10 | Nhân viên, chủ spa gọi `POST /ai/chat`; khách vãng lai/nhân viên/chủ spa gọi `GET /me/ai/history`                                                                                                          | `403 forbidden`; `401 unauthorized` / `403 forbidden`, dạng envelope                                                                                                                                               |
| AI-T11 | `GET /me/ai/history`: 25 lượt, `limit=20` rồi `before` = lượt cũ nhất trang 1; `limit=0`, `limit=51`                                                                                                       | Trang 1: 20 lượt mới nhất, `hasMore = true`; trang 2: 5 lượt, `hasMore = false`; chỉ lượt của mình; `400 validation_error`                                                                                         |
| AI-T12 | Gửi 11 câu trong 60 giây; vượt trần ngày (cấu hình test hạ giới hạn)                                                                                                                                       | Câu thứ 11 → `429 rate_limited`; câu vượt trần ngày → `429 rate_limited`                                                                                                                                           |
| AI-T17 | Model gọi `propose_booking`: dịch vụ lẻ giờ trống; giờ đã kín; buổi gói của khách A (A hỏi); buổi gói của khách B (A hỏi); khách vãng lai dùng `serviceEntitlementId`; 4 đề xuất                           | Hợp lệ → `bookingProposals` đúng `kind`, giờ kết thúc, `path` điền sẵn; giờ kín / buổi của B / vãng lai dùng quyền → tool lỗi, không có đề xuất; ≤ 3; không bảng nào thay đổi (không lịch, không đơn)              |
| AI-T13 | Lời nhắc hệ thống (unit)                                                                                                                                                                                   | Có quy tắc không chẩn đoán/kê thuốc, khuyên gặp bác sĩ da liễu, chỉ dùng dữ liệu từ tool, phạm vi website, trả lời tiếng Việt                                                                                      |
| AI-T18 | Model trả `scope = medical` kèm văn bản có tên thuốc; `scope = out_of_scope`; `scope` thiếu/JSON sai/model trả văn bản thường thay vì `final_answer`; đã gọi `suggest_products`/`propose_booking` trước đó | `medical` → đúng câu cố định A4, văn bản của model bị bỏ, `suggestions` và `bookingProposals` rỗng; `out_of_scope` → câu cố định A7, rỗng; JSON sai → `503 ai_unavailable`, không lưu; khách hàng: lưu câu cố định |
| AI-T14 | `GeminiAiChatModel` (unit, `HttpMessageHandler` giả): `functionCall` → chạy callback → câu trả lời; `finishReason = SAFETY`; HTTP 429 / 500                                                                | Gửi đủ `functionResponse` trong một lượt; kết quả `Text` đúng; `Refused = true`; báo không khả dụng                                                                                                                |
| AI-T15 | Kiểm thử tay (không tự động) với khóa thật: UAT-25 "mụn mủ sưng đau nên uống thuốc gì?", "da tôi nổi mẩn đỏ là bệnh gì?", "viết code Python giúp tôi", "thời tiết hôm nay", UAT-26                         | Hai câu đầu → câu cố định A4; hai câu sau → câu cố định A7; UAT-26 đúng số buổi của khách đang đăng nhập                                                                                                           |
| AI-T16 | Hồi quy                                                                                                                                                                                                    | Toàn bộ test hiện có vẫn pass, `PersistenceModelTests` pass (migration index mới khớp `data-model.md`)                                                                                                             |

## Câu hỏi còn mở

Tất cả **đã chốt 02/11/2026** (Q-60 là tạm thời).

- Q-01 — Khách vãng lai được chat nhưng không lưu lịch sử.
- Q-57 — Nhà cung cấp và model AI: Google Gemini, `Ai:Provider` = `gemini`, `Ai:Model` = `gemini-3.8-flash`, gói miễn phí của Gemini API (người dùng chọn 02/11/2026). Gói miễn phí giới hạn lượt và dữ liệu có thể được Google dùng cải thiện sản phẩm → chỉ dùng dữ liệu demo; chạy thật thì bật thanh toán.
- Q-58 — Ngữ cảnh hội thoại: khách hàng dùng 5 lượt gần nhất đã lưu (`Ai:HistoryTurnsInContext`); khách vãng lai mỗi câu độc lập.
- Q-59 — Gợi ý sản phẩm không lưu vào lịch sử (bảng không có cột); xem lại lịch sử chỉ thấy văn bản.
- Q-60 — Nhân viên/chủ spa không dùng trợ lý AI (403), theo sheet 21.
- Q-61 — Giới hạn tần suất: 10 câu/60 giây và 50 câu/ngày, theo người dùng hoặc IP.
- Q-62 — Khi mô hình từ chối / bộ lọc an toàn chặn: trả câu cố định (200) và vẫn lưu cho khách hàng.
- Q-63 — Mã lỗi E1 dùng `400 validation_error` (`field = question`) như mọi validator, thay cho `AI_INVALID_INPUT` của DA.
- Q-64 — Trợ lý AI hỗ trợ đặt lịch thế nào: chỉ đề xuất lịch đã kiểm tra còn trống + link mở màn đặt lịch điền sẵn; khách tự xác nhận qua API đặt lịch hiện có; AI không tự tạo/giữ lịch (BR-AI-08).

- Q-65 — Phạm vi trả lời: chỉ chủ đề Spa Như Nguyệt (BR-AI-09); ngoài phạm vi và câu hỏi y khoa → server trả câu cố định dựa trên nhãn `scope` của mô hình, không dùng văn bản mô hình viết (người dùng yêu cầu 02/11/2026).

Xem [open-questions.md](../decisions/open-questions.md) (Q-57…Q-65).

## Giao diện (web)

Phạm vi: UC-SPA-32 trên web (`apps/web`). Mobile (`SCR-M16`) làm sau.

Feature: `src/features/ai-assistant/` (`components/`, `hooks/`, `schemas.ts`, `errors.ts`, `index.ts`). Trang ở `src/pages/customer/AiAssistantPage.tsx` (dành cho khách hàng) và `src/pages/public/AiAssistantPublicPage.tsx` (dành cho khách vãng lai).

### SCR-W21 — Trợ lý AI tư vấn dịch vụ (UC-SPA-32)

- **Route:** `/ai-assistant` · Vai trò: `GUEST` (khách vãng lai), `CUS` (khách hàng); Staff/Owner bị cấm (`403 forbidden`, theo Q-60).
- **Layout:**
  - Khách hàng đã đăng nhập (`role = customer`): Mở trong `AccountLayout` (truy cập từ menu tài khoản).
  - Khách vãng lai (`anonymous`): Mở trong `PublicLayout` với header công khai.
- **Mẫu bố cục:** Khung chat tương tác đàm thoại (Conversational Interface) gồm 4 khu vực:

1. **Header thanh công cụ:**
   - Tên trợ lý: "Trợ lý ảo Như Nguyệt Spa", biểu tượng Bot/Sparkles, trạng thái "Sẵn sàng hỗ trợ".
   - Dòng giới thiệu: "Tư vấn dịch vụ · Bảng giá · Tra cứu giờ trống · Gợi ý đặt lịch".
2. **Thanh lưu ý y khoa cố định (BR-AI-01):**
   - Alert viền vàng cố định ở đầu màn hình chat: _"Lưu ý: Trợ lý AI chỉ tư vấn thông tin dịch vụ, gói và hỗ trợ chọn lịch tại Spa Như Nguyệt; không đưa ra chẩn đoán y khoa hay thay thế bác sĩ da liễu."_
3. **Danh sách tin nhắn (`ChatMessageList`):**
   - Tin nhắn chào mừng mặc định từ AI khi khởi đầu cuộc hội thoại: Giới thiệu các chủ đề có thể hỗ trợ và kèm 4 gợi ý nhanh (Quick Prompts).
   - **Khách hàng đã đăng nhập:** Gọi `GET /api/v1/me/ai/history` khi vào trang để tải các lượt hỏi – đáp trước đó. Nếu `hasMore = true`, hiển thị nút "Xem tin nhắn cũ hơn".
   - **Khách vãng lai:** Khung chat không lưu lịch sử trên server, có ghi chú: _"Đăng nhập để trợ lý có thể tra cứu lịch hẹn và tiến độ gói của riêng bạn."_
   - Tin nhắn khách hàng: Bong bóng bên phải, nền màu thương hiệu `primary`.
   - Tin nhắn trợ lý: Bong bóng bên trái, kèm ảnh avatar đại diện Như Nguyệt Spa, hỗ trợ định dạng văn bản có cấu trúc (xuống dòng, gạch đầu dòng, in đậm).
   - **Thẻ sản phẩm gợi ý (`AiProductSuggestionCard`, BR-AI-05):**
     - Nằm ngay dưới câu trả lời của AI nếu có `suggestions` (tối đa 3 thẻ).
     - Hiển thị: Loại (Dịch vụ / Gói), Tên sản phẩm, Giá tiền, Thời lượng hoặc số buổi.
     - Nhấn vào thẻ $\rightarrow$ Điều hướng tới trang chi tiết `/services/:id` hoặc `/packages/:id`.
   - **Thẻ đề xuất lịch hẹn (`AiBookingProposalCard`, BR-AI-08):**
     - Nằm dưới câu trả lời của AI nếu có `bookingProposals` (tối đa 3 đề xuất).
     - Hiển thị: Dịch vụ, Ngày hẹn (`Thứ Bảy, 15/11/2026`), Giờ hẹn (`09:00 – 10:15`), Chuyên viên đề xuất (nếu có).
     - Nút CTA: **"Đặt lịch theo đề xuất này"** $\rightarrow$ điều hướng tới link `path` điền sẵn (`/booking/new?serviceId=...&date=...&startTime=...`). Khách vãng lai bấm vào sẽ được yêu cầu đăng nhập trước khi hoàn tất đặt lịch.
     - Ghi chú minh bạch: _"Giờ hẹn chưa được giữ chỗ. Vui lòng bấm để hoàn tất xác nhận đặt lịch."_
   - **Chỉ báo chờ trả lời (Typing indicator):** Trong lúc gọi `POST /ai/chat`, hiển thị bong bóng tin nhắn với hiệu ứng nhấp nháy: _"Trợ lý đang tìm kiếm thông tin và soạn câu trả lời..."_.
4. **Thanh nhập câu hỏi (`ChatInputBar`):**
   - Ô `Textarea` tự co giãn 1–3 dòng, giới hạn 1–1000 ký tự (BR-AI-03).
   - Hỗ trợ phím tắt: Nhấn `Enter` để gửi, `Shift + Enter` để xuống dòng.
   - Bộ đếm ký tự: `0/1000`.
   - Nút gửi (icon `SendHorizontal`): Hiển thị trạng thái loading khi đang gửi, bị khóa khi ô nhập chỉ toàn khoảng trắng hoặc đang chờ phản hồi.
   - Hàng chip câu hỏi gợi ý nhanh (khi chưa gửi tin nhắn hoặc sau lời chào):
     - _"Tư vấn dịch vụ cho da nhạy cảm"_
     - _"Các gói cấp ẩm phục hồi da"_
     - _"Bảng giá các dịch vụ chăm sóc da"_
     - _(Nếu đã đăng nhập)_: _"Kiểm tra lịch hẹn sắp tới của tôi"_, _"Gói của tôi còn bao nhiêu buổi?"_

### Dữ liệu & Hợp đồng

- `packages/shared-types/src/aiAssistant.ts`:
  - `AiProductType = 'service' | 'package'`.
  - `AiBookingKind = 'book_now' | 'book_entitlement' | 'book_session'`.
  - `AiProductSuggestion { productType, productId, name, price, path }`.
  - `AiBookingProposal { kind, spaServiceId?, serviceEntitlementId?, treatmentSessionId?, serviceName, date, startTime, endTime, staffMemberId?, staffName?, path }`.
  - `AiChatReply { answer, suggestions, bookingProposals, saved, messageId? }`.
  - `AiChatMessage { id, question, answer, createdAtUtc }`.
  - `AiChatHistory { items: readonly AiChatMessage[], hasMore: boolean }`.
  - `AiChatHistoryQuery { before?: string, limit?: number }`.
- `packages/api-client/src/aiAssistant.ts`:
  - `AiAssistantApi`: `chat(question, signal?)`, `getHistory(query?, signal?)`.
  - `aiAssistantQueryKeys = { history: (query?: AiChatHistoryQuery) => ['ai-assistant', 'history', query] as const }`.
  - `aiAssistantErrorCodes = { aiUnavailable: 'ai_unavailable', rateLimited: 'rate_limited', validationError: 'validation_error', forbidden: 'forbidden' }`.

### Mã lỗi & Cách xử lý UI

| Mã / tình huống          | Thao tác                     | Hành vi UI                                                                                                                      |
| :----------------------- | :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| `validation_error` (400) | Gửi câu hỏi                  | Báo lỗi đỏ dưới ô nhập tin nhắn (câu hỏi rỗng hoặc vượt quá 1000 ký tự)                                                         |
| `forbidden` (403)        | Gửi câu hỏi hoặc xem lịch sử | Banner thông báo: "Trợ lý AI chỉ phục vụ khách hàng và khách vãng lai. Tài khoản nhân viên/quản lý không được phép sử dụng."    |
| `rate_limited` (429)     | Gửi câu hỏi                  | Thông báo lỗi trong luồng chat: "Bạn đã gửi quá giới hạn cho phép (10 câu/phút hoặc 50 câu/ngày). Vui lòng đợi trong giây lát." |
| `ai_unavailable` (503)   | Gửi câu hỏi                  | Hiển thị tin nhắn lỗi trong khung chat kèm nút "Thử gửi lại"                                                                    |
| `unauthorized` (401)     | Xem lịch sử                  | Chuyển sang trạng thái khách vãng lai (không cố gọi lại lịch sử)                                                                |
| Mất mạng / 500           | Gửi câu hỏi                  | Hiển thị trạng thái mất kết nối kèm nút bấm gửi lại                                                                             |

### Trạng thái, responsive, a11y (SCR-W21)

- **Trạng thái:**
  - Khởi tạo: Skeleton cho lịch sử chat (khi đã đăng nhập).
  - Trống: Lời chào và các gợi ý câu hỏi nhanh.
  - Đang trả lời: Typing indicator, vô hiệu hóa nút gửi.
  - Lỗi: Bong bóng lỗi màu cảnh báo kèm nút gửi lại.
- **320px:** Khung chat chiếm trọn chiều ngang, danh sách gợi ý sản phẩm cuộn ngang (`overflow-x-auto`).
- **a11y:** Tự động cuộn xuống tin nhắn mới nhất khi có tin nhắn mới (`scrollIntoView`). Vùng nhập liệu có `aria-label="Nhập câu hỏi cho trợ lý AI"`.

### Kiểm thử giao diện (AI-UI)

| Mã        | Tình huống                                                                                                                    | Kết quả mong đợi                                      |
| :-------- | :---------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------- |
| AI-UI-T01 | `AiAssistantApi`: `chat` và `getHistory` gọi đúng endpoint, query param và body                                               | Pass với mock API                                     |
| AI-UI-T02 | Khách vãng lai vào `/ai-assistant`: hiển thị lời chào mặc định, các nút gợi ý nhanh, không gọi API lịch sử                    | Pass 4 trạng thái, sẵn sàng chat                      |
| AI-UI-T03 | Khách hàng đăng nhập vào `/ai-assistant`: gọi `GET /me/ai/history`, tải danh sách câu hỏi cũ đảo lại theo thứ tự thời gian    | Hiển thị đầy đủ tin nhắn cũ                           |
| AI-UI-T04 | Gửi câu hỏi: validate client rỗng/quá 1000 ký tự; khi hợp lệ gọi `POST /ai/chat` hiển thị typing indicator                    | Hiển thị câu hỏi của người dùng và câu trả lời của AI |
| AI-UI-T05 | Câu trả lời kèm gợi ý sản phẩm (`suggestions`): render thẻ sản phẩm, click mở đúng trang `/services/:id` hoặc `/packages/:id` | Hiển thị đúng tối đa 3 thẻ sản phẩm                   |
| AI-UI-T06 | Câu trả lời kèm đề xuất lịch (`bookingProposals`): render thẻ lịch hẹn, click mở `/booking/new` với query params              | Hiển thị chi tiết giờ trống và link đặt sẵn           |
| AI-UI-T07 | Server trả `scope = medical` hoặc `out_of_scope`: AI hiển thị câu cố định bảo vệ người dùng, không gợi ý sản phẩm             | Render đúng văn bản bảo vệ                            |
| AI-UI-T08 | Lỗi `503 ai_unavailable` hoặc `429 rate_limited`: hiển thị thông báo lỗi thân thiện, có nút gửi lại cho lỗi 503               | UI không bị crash, hỗ trợ thử lại                     |

## Việc để sau

- AI-LATER-01: trả lời dạng stream (SSE) để hiện chữ dần.
- AI-LATER-02: khách hàng xóa lịch sử trò chuyện.
- AI-LATER-03: mobile SCR-M16 (`app/(customer)/ai-assistant.tsx`).
- AI-LATER-04: trần số câu hỏi theo ngày / theo chi phí, báo cáo token đã dùng.
- AI-LATER-05: bộ đánh giá (eval) cho câu hỏi y khoa và độ chính xác dữ liệu.
- AI-LATER-06: cho nhân viên/chủ spa dùng trợ lý (Q-60 tạm thời).
- AI-LATER-07: màn SCR-W13/SCR-M18 đọc tham số `date`, `startTime`, `staffMemberId` từ link đề xuất (làm cùng web/mobile đặt lịch).

# Đặc tả nghiệp vụ

Thư mục này chứa đặc tả theo từng nhóm nghiệp vụ, viết theo [mẫu](../templates/feature-spec.md). Đây là nguồn mà code phải bám theo; báo cáo DA và file Excel tổng hợp là tài liệu gốc để tham khảo.

## Nguồn hiện có

| Tài liệu            | Vị trí                                                                              | Nội dung                                                            |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Báo cáo ĐATN (DA)   | `E:\UTE\HK126\Word\126_DA_NTTT_NguyenXuanHoang_2214_v1.docx` (ngoài repo)           | 34 UC, 32 bảng đặc tả, 26 bảng CSDL                                 |
| File Excel tổng hợp | [SPA_NhuNguyet_TongHop_PhanTich_v2.xlsx](../SPA_NhuNguyet_TongHop_PhanTich_v2.xlsx) | Checklist UC, đặc tả, BR, workflow, màn hình, API, CSDL, rà soát DA |

Từ bản v2.1, file Excel dùng tên bảng, cột, enum, trường JSON tiếng Anh theo [glossary](../domain/glossary.md) và [data-model.md](../domain/data-model.md). Riêng mô tả và luồng đặc tả UC (sheet `05`) cùng sheet rà soát DA (`26`) giữ nguyên lời văn của báo cáo. Excel và `data-model.md` được sinh từ [spec-source](../spec-source/README.md).

## File dự kiến

| File                      | Nhóm                              | Use case       |
| ------------------------- | --------------------------------- | -------------- |
| `auth.md`                 | Auth, Users                       | UC-SPA-01 → 05 |
| `catalog.md`              | Services, ServicePackages         | UC-SPA-06 → 09 |
| `orders.md`               | Orders, Payments, Promotions      | UC-SPA-10 → 14 |
| `bookings.md`             | Bookings (+ thuật toán giờ trống) | UC-SPA-15 → 17 |
| `purchases-treatments.md` | Purchases, Treatments             | UC-SPA-18 → 21 |
| `staff.md`                | Staff                             | UC-SPA-22 → 25 |
| `care.md`                 | Care                              | UC-SPA-26 → 28 |
| `reviews.md`              | Reviews                           | UC-SPA-29 → 31 |
| `ai-assistant.md`         | AiAssistant                       | UC-SPA-32      |
| `reports.md`              | Reports                           | UC-SPA-33      |
| `notifications.md`        | Notifications                     | UC-SPA-34      |

Viết đặc tả của một nhóm **trước khi** bắt đầu code nhóm đó, rồi giữ cập nhật cùng code.

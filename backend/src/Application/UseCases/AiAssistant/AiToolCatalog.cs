using System.Text.Json;
using NhuNguyetSpa.Application.Interfaces.Ai;

namespace NhuNguyetSpa.Application.UseCases.AiAssistant;

/// <summary>
/// Tools the model may call (docs/specs/ai-assistant.md, "Tool cho AI"). Guests never get the personal tools (BR-AI-02);
/// no tool takes a customer id.
/// </summary>
public static class AiToolCatalog
{
    public const string SearchCatalog = "search_catalog";
    public const string GetProductDetail = "get_product_detail";
    public const string FindAvailableSlots = "find_available_slots";
    public const string ListMyAppointments = "list_my_appointments";
    public const string ListMyPackages = "list_my_packages";
    public const string SuggestProducts = "suggest_products";
    public const string ProposeBooking = "propose_booking";
    public const string FinalAnswer = "final_answer";

    private static readonly AiToolDefinition[] GuestTools =
    [
        Tool(SearchCatalog, "Tìm dịch vụ lẻ và gói dịch vụ đang bán theo từ khóa, loại và giá tối đa.", """
            {"type":"object","properties":{
              "keyword":{"type":"string","description":"Từ khóa, có thể không dấu"},
              "productType":{"type":"string","enum":["service","package"],"description":"Bỏ trống để tìm cả hai"},
              "maxPrice":{"type":"number","description":"Giá tối đa (VNĐ)"}}}
            """),
        Tool(GetProductDetail, "Xem chi tiết một dịch vụ hoặc gói đang bán: mô tả, giá, thời lượng, số buổi, dịch vụ thành phần.", """
            {"type":"object","properties":{
              "productType":{"type":"string","enum":["service","package"]},
              "id":{"type":"string","description":"Mã sản phẩm lấy từ search_catalog"}},
             "required":["productType","id"]}
            """),
        Tool(FindAvailableSlots, "Tìm các giờ còn trống của một dịch vụ lẻ trong một ngày (giờ Việt Nam).", """
            {"type":"object","properties":{
              "serviceId":{"type":"string","description":"Mã dịch vụ lẻ"},
              "date":{"type":"string","description":"Ngày dạng yyyy-MM-dd"}},
             "required":["serviceId","date"]}
            """),
        Tool(SuggestProducts, "Hiện thẻ sản phẩm (tối đa 3) cho dịch vụ hoặc gói bạn đang giới thiệu.", """
            {"type":"object","properties":{
              "items":{"type":"array","items":{"type":"object","properties":{
                "productType":{"type":"string","enum":["service","package"]},
                "id":{"type":"string"}},"required":["productType","id"]}}},
             "required":["items"]}
            """),
        Tool(ProposeBooking,
            "Đề xuất một lịch hẹn còn trống để khách bấm xác nhận. Chọn đúng một nguồn: spaServiceId (đặt mới, cần thanh toán), " +
            "serviceEntitlementId (dịch vụ đã mua) hoặc treatmentSessionId (buổi trong gói). Không tự đặt lịch.", """
            {"type":"object","properties":{
              "spaServiceId":{"type":"string"},
              "serviceEntitlementId":{"type":"string"},
              "treatmentSessionId":{"type":"string"},
              "date":{"type":"string","description":"Ngày dạng yyyy-MM-dd"},
              "startTime":{"type":"string","description":"Giờ bắt đầu dạng HH:mm"},
              "staffMemberId":{"type":"string","description":"Bỏ trống nếu khách không chọn nhân viên"}},
             "required":["date","startTime"]}
            """),
        Tool(FinalAnswer, "Gửi câu trả lời cuối cùng cho khách. Luôn gọi đúng một lần ở cuối.", """
            {"type":"object","properties":{
              "scope":{"type":"string","enum":["in_scope","out_of_scope","medical"]},
              "answer":{"type":"string","description":"Câu trả lời tiếng Việt cho khách"}},
             "required":["scope","answer"]}
            """),
    ];

    private static readonly AiToolDefinition[] CustomerTools =
    [
        ..GuestTools,
        Tool(ListMyAppointments, "Xem các lịch hẹn sắp tới của khách đang đăng nhập.", """{"type":"object","properties":{}}"""),
        Tool(ListMyPackages,
            "Xem gói đã mua (số buổi đã dùng, còn lại, hạn dùng, buổi tiếp theo) và dịch vụ lẻ đã mua chưa dùng của khách đang đăng nhập.",
            """{"type":"object","properties":{}}"""),
    ];

    public static IReadOnlyList<AiToolDefinition> For(bool isCustomer) => isCustomer ? CustomerTools : GuestTools;

    private static AiToolDefinition Tool(string name, string description, string schema) =>
        new(name, description, JsonDocument.Parse(schema).RootElement.Clone());
}

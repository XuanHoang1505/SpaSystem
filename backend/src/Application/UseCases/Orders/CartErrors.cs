using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>Error codes of UC-SPA-10 (docs/specs/orders.md). Hidden products reuse <c>CatalogErrors</c>.</summary>
public static class CartErrors
{
    public const string CartItemExistsCode = "cart_item_exists";
    public const string CartFullCode = "cart_full";
    public const string CartItemNotFoundCode = "cart_item_not_found";

    public static ConflictException CartItemExists()
    {
        return new("Sản phẩm này đã có trong giỏ hàng.", CartItemExistsCode);
    }

    public static BusinessRuleException CartFull(int maxItems)
    {
        return new($"Giỏ hàng đã đủ {maxItems} sản phẩm, vui lòng thanh toán hoặc xóa bớt.", CartFullCode);
    }

    public static NotFoundException CartItemNotFound()
    {
        return new("Không tìm thấy sản phẩm trong giỏ hàng.", CartItemNotFoundCode);
    }
}

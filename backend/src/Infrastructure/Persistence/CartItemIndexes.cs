namespace NhuNguyetSpa.Infrastructure.Persistence;

/// <summary>Index names that <see cref="UnitOfWork"/> translates into <c>cart_item_exists</c> (BR-ORD-01).</summary>
public static class CartItemIndexes
{
    public const string UniqueService = "ux_cart_items_cart_id_spa_service_id";
    public const string UniquePackage = "ux_cart_items_cart_id_service_package_id";
}

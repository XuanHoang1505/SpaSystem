namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Cart</c> (docs/specs/orders.md, BR-ORD-01).</summary>
public sealed class CartOptions
{
    public const string SectionName = "Cart";
    public int MaxItems { get; set; } = 20;
}

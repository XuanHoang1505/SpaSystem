namespace NhuNguyetSpa.Infrastructure.Persistence;

/// <summary>Index names that <see cref="UnitOfWork"/> translates into <c>review_exists</c> (BR-REV-03).</summary>
public static class ReviewIndexes
{
    public const string UniqueService = "ux_reviews_customer_service";
    public const string UniquePackage = "ux_reviews_customer_package";
}

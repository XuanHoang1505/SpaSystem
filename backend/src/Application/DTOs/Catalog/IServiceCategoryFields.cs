namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary>Fields shared by the create and update category requests (BR-CAT-10).</summary>
public interface IServiceCategoryFields
{
    string Name { get; }
    string? Description { get; }
}

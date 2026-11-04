using FluentAssertions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests.Catalog;

/// <summary>State changes of SpaService and ServicePackage (docs/specs/catalog.md, UC-SPA-09).</summary>
public sealed class CatalogEntityTests
{
    [Fact]
    public void NewCatalogItemsAreOnSale()
    {
        new SpaService().Status.Should().Be(CatalogStatus.OnSale);
        new ServicePackage().Status.Should().Be(CatalogStatus.OnSale);
    }

    [Fact]
    public void ChangeStatusSetsStatus()
    {
        var service = new SpaService();
        service.ChangeStatus(CatalogStatus.Discontinued);
        service.Status.Should().Be(CatalogStatus.Discontinued);

        var package = new ServicePackage();
        package.ChangeStatus(CatalogStatus.Discontinued);
        package.ChangeStatus(CatalogStatus.OnSale);
        package.Status.Should().Be(CatalogStatus.OnSale);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public void SetImageRejectsBlankUrl(string url)
    {
        FluentActions.Invoking(() => new SpaService().SetImage(url)).Should().Throw<ArgumentException>();
        FluentActions.Invoking(() => new ServicePackage().SetImage(url)).Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SetImageAndRemoveImageUpdateImageUrl()
    {
        var package = new ServicePackage();
        package.SetImage("https://img.test/a.jpg");
        package.ImageUrl.Should().Be("https://img.test/a.jpg");
        package.RemoveImage();
        package.ImageUrl.Should().BeNull();
    }

    [Fact]
    public void ReplaceItemsReplacesWholeList()
    {
        var package = new ServicePackage();
        package.ReplaceItems([new ServicePackageItem { SortOrder = 1 }, new ServicePackageItem { SortOrder = 2 }]);
        var replacement = new ServicePackageItem { SortOrder = 1 };

        package.ReplaceItems([replacement]);

        package.Items.Should().ContainSingle().Which.Should().BeSameAs(replacement);
    }
}

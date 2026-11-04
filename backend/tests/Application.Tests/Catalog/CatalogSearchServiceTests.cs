using FluentAssertions;
using FluentValidation;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Application.Validators.Catalog;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Catalog;

/// <summary>Category list and suggestions (UC-SPA-06 A1, BR-CAT-01).</summary>
public sealed class CatalogSearchServiceTests
{
    private readonly ISpaServiceRepository _services = Substitute.For<ISpaServiceRepository>();
    private readonly IServicePackageRepository _packages = Substitute.For<IServicePackageRepository>();

    private CatalogSearchService Create(string? role) =>
        new(_services, _packages, CatalogTestDoubles.Viewer(role), new SuggestionQueryValidator());

    private static SuggestionCandidate Candidate(CatalogItemType type, string name, bool prefix) =>
        new(new CatalogSuggestionDto(type, Guid.NewGuid(), name, null), prefix);

    [Theory]
    [InlineData(null, true)]
    [InlineData(Roles.Owner, false)]
    public async Task CategoriesArePublicOnlyForNonOwner(string? role, bool publicOnly)
    {
        _services.GetCategoriesAsync(publicOnly, Arg.Any<CancellationToken>()).Returns(["Da", "Massage"]);

        var result = await Create(role).GetCategoriesAsync(CancellationToken.None);

        result.Data.Should().Equal("Da", "Massage");
    }

    [Fact]
    public async Task SuggestReturnsAtMostEightPrefixMatchesFirst()
    {
        _services.SuggestAsync("ch", 8, Arg.Any<CancellationToken>()).Returns([
            Candidate(CatalogItemType.Service, "Massage chân", false), Candidate(CatalogItemType.Service, "Chăm sóc da", true),
            Candidate(CatalogItemType.Service, "Tẩy da chết", false), Candidate(CatalogItemType.Service, "Chăm sóc tóc", true),
            Candidate(CatalogItemType.Service, "Xông hơi chanh", false),
        ]);
        _packages.SuggestAsync("ch", CatalogTestDoubles.VietnamToday, 8, Arg.Any<CancellationToken>()).Returns([
            Candidate(CatalogItemType.Package, "Gói chăm sóc", false), Candidate(CatalogItemType.Package, "Chống lão hóa", true),
            Candidate(CatalogItemType.Package, "Gói cho cô dâu", false), Candidate(CatalogItemType.Package, "Gói thư giãn chiều", false),
        ]);

        var result = (await Create(null).SuggestAsync(new SuggestionQuery { Search = "  ch " }, CancellationToken.None)).Data!;

        result.Should().HaveCount(8);
        result.Take(3).Select(item => item.Name).Should().Equal("Chăm sóc da", "Chăm sóc tóc", "Chống lão hóa");
        result.Select(item => item.Type).Should().Contain([CatalogItemType.Service, CatalogItemType.Package]);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("c")]
    [InlineData("   c  ")]
    public async Task SuggestRequiresTwoCharacters(string? search)
    {
        var act = () => Create(null).SuggestAsync(new SuggestionQuery { Search = search }, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }
}

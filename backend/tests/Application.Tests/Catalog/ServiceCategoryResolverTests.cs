using FluentAssertions;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Catalog;

/// <summary>BR-CAT-04 (CAT-T30).</summary>
public sealed class ServiceCategoryResolverTests
{
    private readonly ISpaServiceRepository _services = Substitute.For<ISpaServiceRepository>();

    [Theory]
    [InlineData("  Massage   body ", "Massage body")]
    [InlineData("Chăm\tsóc\n da", "Chăm sóc da")]
    [InlineData("   ", "")]
    public void NormalizeCollapsesWhitespace(string input, string expected) => ServiceCategoryResolver.Normalize(input).Should().Be(expected);

    [Fact]
    public async Task ResolverReusesExistingSpelling()
    {
        _services.FindCategoryAsync("cham soc DA", null, Arg.Any<CancellationToken>()).Returns("Chăm sóc da");

        var result = await new ServiceCategoryResolver(_services).ResolveAsync("  cham  soc DA", null, CancellationToken.None);

        result.Should().Be("Chăm sóc da");
    }

    [Fact]
    public async Task ResolverKeepsNewSpellingAndPassesExcludedServiceId()
    {
        var id = Guid.NewGuid();

        var result = await new ServiceCategoryResolver(_services).ResolveAsync("Massage  body", id, CancellationToken.None);

        result.Should().Be("Massage body");
        await _services.Received(1).FindCategoryAsync("Massage body", id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResolverDoesNotQueryForBlankCategory()
    {
        var result = await new ServiceCategoryResolver(_services).ResolveAsync("  ", null, CancellationToken.None);

        result.Should().BeEmpty();
        await _services.DidNotReceiveWithAnyArgs().FindCategoryAsync(default!, default, default);
    }
}

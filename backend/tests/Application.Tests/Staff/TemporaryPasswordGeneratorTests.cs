using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Staff;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Staff;

/// <summary>BR-STF-02 temporary password (STF-T02).</summary>
public sealed class TemporaryPasswordGeneratorTests
{
    [Theory]
    [InlineData(8)]
    [InlineData(12)]
    [InlineData(64)]
    public void GeneratesConfiguredLengthWithAllClasses(int length)
    {
        for (var i = 0; i < 1000; i++)
        {
            var password = TemporaryPasswordGenerator.Generate(length);

            password.Should().HaveLength(length);
            password.Should().MatchRegex("[a-z]").And.MatchRegex("[A-Z]").And.MatchRegex("[2-9]");
            password.Should().NotContainAny("0", "O", "o", "1", "l", "I");
            password.Should().MatchRegex("^[A-Za-z2-9]+$");
        }
    }

    [Fact]
    public void TwoCallsDiffer() =>
        TemporaryPasswordGenerator.Generate(12).Should().NotBe(TemporaryPasswordGenerator.Generate(12));

    [Theory]
    [InlineData(7)]
    [InlineData(65)]
    public void RejectsLengthOutsideRange(int length) =>
        FluentActions.Invoking(() => TemporaryPasswordGenerator.Generate(length)).Should().Throw<ArgumentOutOfRangeException>();
}

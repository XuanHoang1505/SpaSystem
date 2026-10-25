using AutoMapper;
using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Common.Models;
using Xunit;

namespace NhuNguyetSpa.Application.Tests;

public sealed class FoundationTests
{
    [Fact]
    public void ResultsRepresentSuccessAndFailureWithoutHttpDependencies()
    {
        OperationResult.Success().IsSuccess.Should().BeTrue();
        OperationResult.Success().Errors.Should().BeEmpty();
        OperationResult<int>.Success(42, "ok").Data.Should().Be(42);
        var result = OperationResult<int>.Failure("invalid", [new ErrorDetail("invalid", "Invalid input", "name")]);
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Be("invalid");
        result.Errors.Should().ContainSingle().Which.Field.Should().Be("name");
        OperationResult.Failure("invalid").IsSuccess.Should().BeFalse();
    }

    [Theory]
    [InlineData(1, 10, 21, 3, false, true)]
    [InlineData(2, 10, 21, 3, true, true)]
    [InlineData(3, 10, 21, 3, true, false)]
    [InlineData(1, 10, 0, 0, false, false)]
    public void PaginationComputesBoundaries(int page, int size, int count, int pages, bool previous, bool next)
    {
        var result = new PagedResult<int>([], page, size, count);
        result.TotalPages.Should().Be(pages);
        result.HasPreviousPage.Should().Be(previous);
        result.HasNextPage.Should().Be(next);
    }

    [Fact]
    public void QueryNormalizesLimitsAndResultRejectsInvalidInput()
    {
        var query = new PagedQuery();
        query.PageNumber.Should().Be(1);
        query.PageSize.Should().Be(10);
        query.PageSize = 500;
        query.PageSize.Should().Be(100);
        query.PageSize = 0;
        query.PageNumber = -5;
        query.PageSize.Should().Be(1);
        query.PageNumber.Should().Be(1);
        Action invalid = () => new PagedResult<int>([], 1, 0, 10);
        invalid.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void ApplicationRegistersMapperAndValidators()
    {
        using var services = new ServiceCollection().AddApplication().BuildServiceProvider();
        services.GetRequiredService<IMapper>().ConfigurationProvider.AssertConfigurationIsValid();
        var validator = services.GetRequiredService<IValidator<PagedQuery>>();
        validator.Validate(new PagedQuery { Search = new string('a', 201) }).IsValid.Should().BeFalse();
    }
}

using FluentAssertions;
using FluentValidation;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Application.Validators.Catalog;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Catalog;

/// <summary>Service categories as a table (Q-13, BR-CAT-10..14, docs/specs/catalog.md).</summary>
public sealed class ServiceCategoryServiceTests
{
    private readonly IServiceCategoryRepository _categories = Substitute.For<IServiceCategoryRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    private ServiceCategoryService Create(string? role = Roles.Owner) => new(
        _categories, CatalogTestDoubles.Viewer(role), _unitOfWork,
        new CreateServiceCategoryRequestValidator(), new UpdateServiceCategoryRequestValidator());

    [Theory]
    [InlineData(null, true)]
    [InlineData(Roles.Customer, true)]
    [InlineData(Roles.Owner, false)]
    public async Task ListIsPublicOnlyForNonOwner(string? role, bool publicOnly)
    {
        _categories.ListAsync(publicOnly, Arg.Any<CancellationToken>())
            .Returns([new ServiceCategoryDto(Guid.NewGuid(), "Massage", null, 0, true, 2)]);

        var result = await Create(role).ListAsync(CancellationToken.None);

        result.Data.Should().ContainSingle().Which.Name.Should().Be("Massage");
    }

    [Fact]
    public async Task CreateNormalizesNameAndUsesDefaults()
    {
        ServiceCategory? added = null;
        await _categories.AddAsync(Arg.Do<ServiceCategory>(category => added = category), Arg.Any<CancellationToken>());

        var result = await Create().CreateAsync(
            new CreateServiceCategoryRequest("  Massage   body ", "  ", null, null), CancellationToken.None);

        added!.Name.Should().Be("Massage body");
        added.Description.Should().BeNull();
        added.SortOrder.Should().Be(0);
        added.IsActive.Should().BeTrue();
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        result.Data!.Id.Should().Be(added.Id);
        result.Data.ServiceCount.Should().Be(0);
    }

    [Fact]
    public async Task CreateRejectsADuplicateName()
    {
        _categories.NameExistsAsync("Massage", null, Arg.Any<CancellationToken>()).Returns(true);

        var act = () => Create().CreateAsync(new CreateServiceCategoryRequest("Massage", null, null, null), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(CatalogErrors.ServiceCategoryExistsCode);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateChangesFieldsAndChecksTheNameAgainstOthers()
    {
        var category = new ServiceCategory { Name = "Massage" };
        _categories.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _categories.CountServicesAsync(category.Id, Arg.Any<CancellationToken>()).Returns(3);

        var result = await Create().UpdateAsync(
            category.Id, new UpdateServiceCategoryRequest("Massage body", "Thư giãn", 5, false), CancellationToken.None);

        await _categories.Received(1).NameExistsAsync("Massage body", category.Id, Arg.Any<CancellationToken>());
        category.Name.Should().Be("Massage body");
        category.Description.Should().Be("Thư giãn");
        category.SortOrder.Should().Be(5);
        category.IsActive.Should().BeFalse();
        result.Data!.ServiceCount.Should().Be(3);
    }

    [Fact]
    public async Task UpdateMissingCategoryThrowsNotFound()
    {
        var act = () => Create().UpdateAsync(Guid.NewGuid(), new UpdateServiceCategoryRequest("A", null, 0, true), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CatalogErrors.ServiceCategoryNotFoundCode);
    }

    [Fact]
    public async Task DeleteRefusesACategoryWithServices()
    {
        var category = new ServiceCategory { Name = "Massage" };
        _categories.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _categories.CountServicesAsync(category.Id, Arg.Any<CancellationToken>()).Returns(1);

        var act = () => Create().DeleteAsync(category.Id, CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(CatalogErrors.ServiceCategoryInUseCode);
        _categories.DidNotReceive().Remove(Arg.Any<ServiceCategory>());
    }

    [Fact]
    public async Task DeleteRemovesAnEmptyCategory()
    {
        var category = new ServiceCategory { Name = "Massage" };
        _categories.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);

        await Create().DeleteAsync(category.Id, CancellationToken.None);

        _categories.Received(1).Remove(category);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteMissingCategoryThrowsNotFound()
    {
        var act = () => Create().DeleteAsync(Guid.NewGuid(), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CatalogErrors.ServiceCategoryNotFoundCode);
    }

    public static TheoryData<CreateServiceCategoryRequest, string> InvalidRequests => new()
    {
        { new CreateServiceCategoryRequest("", null, null, null), "Name" },
        { new CreateServiceCategoryRequest(new string('a', 101), null, null, null), "Name" },
        { new CreateServiceCategoryRequest("A", new string('a', 501), null, null), "Description" },
        { new CreateServiceCategoryRequest("A", null, -1, null), "SortOrder" },
        { new CreateServiceCategoryRequest("A", null, 1000, null), "SortOrder" },
    };

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task CreateValidatesFields(CreateServiceCategoryRequest request, string field)
    {
        var act = () => Create().CreateAsync(request, CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors.Should().Contain(error => error.PropertyName == field);
    }
}

using FluentAssertions;
using FluentValidation;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Application.Validators.Catalog;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Catalog;

/// <summary>UC-SPA-06/07/09 for spa services (docs/specs/catalog.md).</summary>
public sealed class ServiceCatalogServiceTests
{
    private readonly ISpaServiceRepository _services = Substitute.For<ISpaServiceRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    public ServiceCatalogServiceTests()
    {
        _services.SearchAsync(Arg.Any<ServiceSearchCriteria>(), Arg.Any<CancellationToken>())
            .Returns(new PagedResult<ServiceListItemDto>([], 1, 10, 0));
    }

    private ServiceCatalogService Create(string? role) => new(
        _services, new ServiceCategoryResolver(_services), CatalogTestDoubles.Viewer(role), _unitOfWork,
        new CreateServiceRequestValidator(), new UpdateServiceRequestValidator(), new ChangeCatalogStatusRequestValidator(),
        new ServiceFilterValidator());

    [Theory]
    [InlineData(null)]
    [InlineData(Roles.Customer)]
    [InlineData(Roles.Staff)]
    public async Task SearchIgnoresStatusFilterForNonOwner(string? role)
    {
        await Create(role).SearchAsync(new PagedQuery(), new ServiceFilter { Status = "discontinued" }, CancellationToken.None);

        await _services.Received(1).SearchAsync(
            Arg.Is<ServiceSearchCriteria>(criteria => criteria.PublicOnly && criteria.Status == null), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SearchPassesStatusFilterForOwner()
    {
        await Create(Roles.Owner).SearchAsync(new PagedQuery(), new ServiceFilter { Status = "discontinued" }, CancellationToken.None);

        await _services.Received(1).SearchAsync(
            Arg.Is<ServiceSearchCriteria>(criteria => !criteria.PublicOnly && criteria.Status == CatalogStatus.Discontinued), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SearchNormalizesTextAndSort()
    {
        var query = new PagedQuery { Search = "  cham soc  ", SortBy = "PRICE", SortDirection = SortDirection.Desc, PageNumber = 2, PageSize = 5 };

        await Create(null).SearchAsync(query, new ServiceFilter { Category = "  chăm   sóc da " }, CancellationToken.None);

        await _services.Received(1).SearchAsync(Arg.Is<ServiceSearchCriteria>(criteria =>
            criteria.Search == "cham soc" && criteria.Category == "chăm sóc da" && criteria.SortBy == CatalogSortField.Price &&
            criteria.SortDirection == SortDirection.Desc && criteria.PageNumber == 2 && criteria.PageSize == 5), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("rating")]
    [InlineData("duration")]
    public async Task SearchRejectsUnknownSortField(string sortBy)
    {
        var act = () => Create(null).SearchAsync(new PagedQuery { SortBy = sortBy }, new ServiceFilter(), CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors.Should().Contain(error => error.PropertyName == "sortBy");
    }

    [Fact]
    public async Task OwnerSearchRejectsUnknownStatus()
    {
        var act = () => Create(Roles.Owner).SearchAsync(new PagedQuery(), new ServiceFilter { Status = "hidden" }, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task GetThrowsServiceNotFoundWhenRepositoryReturnsNull()
    {
        var id = Guid.NewGuid();

        var act = () => Create(null).GetAsync(id, CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CatalogErrors.ServiceNotFoundCode);
        await _services.Received(1).GetDetailAsync(id, true, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task OwnerGetDoesNotRestrictToOnSale()
    {
        var id = Guid.NewGuid();
        _services.GetDetailAsync(id, false, Arg.Any<CancellationToken>())
            .Returns(new ServiceDetailDto(id, "A", "B", null, 1, 1, null, CatalogStatus.Discontinued, CatalogTestDoubles.Now, null));

        var result = await Create(Roles.Owner).GetAsync(id, CancellationToken.None);

        result.Data!.Status.Should().Be(CatalogStatus.Discontinued);
    }

    [Fact]
    public async Task CreateServiceDefaultsToOnSaleAndUsesResolvedCategory()
    {
        _services.FindCategoryAsync("cham soc DA", null, Arg.Any<CancellationToken>()).Returns("Chăm sóc da");
        SpaService? added = null;
        await _services.AddAsync(Arg.Do<SpaService>(service => added = service), Arg.Any<CancellationToken>());

        var result = await Create(Roles.Owner).CreateAsync(
            new CreateServiceRequest("  Chăm sóc da mặt ", "  cham   soc DA ", "  ", 60, 350_000, null), CancellationToken.None);

        added.Should().NotBeNull();
        added!.Name.Should().Be("Chăm sóc da mặt");
        added.Category.Should().Be("Chăm sóc da");
        added.Description.Should().BeNull();
        added.Status.Should().Be(CatalogStatus.OnSale);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        result.Data!.Id.Should().Be(added.Id);
        result.Data.Category.Should().Be("Chăm sóc da");
    }

    [Fact]
    public async Task CreateServiceHonoursRequestedStatus()
    {
        SpaService? added = null;
        await _services.AddAsync(Arg.Do<SpaService>(service => added = service), Arg.Any<CancellationToken>());

        await Create(Roles.Owner).CreateAsync(new CreateServiceRequest("A", "B", null, 30, 0, CatalogStatus.Discontinued), CancellationToken.None);

        added!.Status.Should().Be(CatalogStatus.Discontinued);
    }

    [Fact]
    public async Task CreateServiceRejectsInvalidDataWithoutSaving()
    {
        var act = () => Create(Roles.Owner).CreateAsync(new CreateServiceRequest("", "B", null, 0, -1, null), CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateServiceExcludesItselfWhenResolvingCategory()
    {
        var service = new SpaService { Name = "A", Category = "Chăm sóc da", DurationMinutes = 30, Price = 1 };
        _services.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        await Create(Roles.Owner).UpdateAsync(service.Id, new UpdateServiceRequest("A", "Chăm Sóc Da", null, 45, 2), CancellationToken.None);

        await _services.Received(1).FindCategoryAsync("Chăm Sóc Da", service.Id, Arg.Any<CancellationToken>());
        service.Category.Should().Be("Chăm Sóc Da");
        service.DurationMinutes.Should().Be(45);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateMissingServiceThrowsServiceNotFound()
    {
        var act = () => Create(Roles.Owner).UpdateAsync(Guid.NewGuid(), new UpdateServiceRequest("A", "B", null, 30, 1), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CatalogErrors.ServiceNotFoundCode);
    }

    [Fact]
    public async Task ChangeStatusUpdatesService()
    {
        var service = new SpaService();
        _services.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        await Create(Roles.Owner).ChangeStatusAsync(service.Id, new ChangeCatalogStatusRequest(CatalogStatus.Discontinued), CancellationToken.None);

        service.Status.Should().Be(CatalogStatus.Discontinued);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ChangeStatusRequiresStatus()
    {
        var act = () => Create(Roles.Owner).ChangeStatusAsync(Guid.NewGuid(), new ChangeCatalogStatusRequest(null), CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }
}

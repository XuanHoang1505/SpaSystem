using FluentAssertions;
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

/// <summary>UC-SPA-06/07/09 for service packages (docs/specs/catalog.md, BR-CAT-01, 06).</summary>
public sealed class PackageCatalogServiceTests
{
    private readonly IServicePackageRepository _packages = Substitute.For<IServicePackageRepository>();
    private readonly ISpaServiceRepository _services = Substitute.For<ISpaServiceRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly SpaService _onSale = new() { Name = "Chăm sóc da", DurationMinutes = 60, Price = 1 };
    private readonly SpaService _discontinued = new() { Name = "Massage cổ", DurationMinutes = 30, Price = 1 };

    public PackageCatalogServiceTests()
    {
        _discontinued.ChangeStatus(CatalogStatus.Discontinued);
        _services.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns(call =>
            new[] { _onSale, _discontinued }.Where(service => call.Arg<IReadOnlyCollection<Guid>>().Contains(service.Id)).ToList());
        _packages.SearchAsync(Arg.Any<PackageSearchCriteria>(), Arg.Any<CancellationToken>())
            .Returns(new PagedResult<PackageListItemDto>([], 1, 10, 0));
        _packages.GetDetailAsync(Arg.Any<Guid>(), null, Arg.Any<CancellationToken>()).Returns(call => Detail(call.Arg<Guid>()));
    }

    private PackageCatalogService Create(string? role) => new(
        _packages, _services, CatalogTestDoubles.Viewer(role), _unitOfWork, new CreatePackageRequestValidator(),
        new UpdatePackageRequestValidator(), new ChangeCatalogStatusRequestValidator(), new PackageFilterValidator());

    private static PackageDetailDto Detail(Guid id) =>
        new(id, "Gói", null, 1, 30, 1, null, CatalogStatus.OnSale, null, null, CatalogTestDoubles.Now, null, []);

    private static CreatePackageRequest NewPackage(params PackageItemRequest[] items) =>
        new("Gói trẻ hóa", null, 2_000_000, 90, null, null, null, items);

    private static PackageItemRequest Item(SpaService service, int sortOrder) => new(service.Id, 2, sortOrder, 7, null);

    [Fact]
    public async Task PackageSearchUsesVietnamDateForPublicView()
    {
        await Create(Roles.Customer).SearchAsync(new PagedQuery(), new PackageFilter { Status = "discontinued" }, CancellationToken.None);

        await _packages.Received(1).SearchAsync(Arg.Is<PackageSearchCriteria>(criteria =>
            criteria.PublicOn == CatalogTestDoubles.VietnamToday && criteria.Status == null), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task OwnerPackageSearchHasNoSaleDate()
    {
        await Create(Roles.Owner).SearchAsync(new PagedQuery(), new PackageFilter { Status = "on_sale" }, CancellationToken.None);

        await _packages.Received(1).SearchAsync(Arg.Is<PackageSearchCriteria>(criteria =>
            criteria.PublicOn == null && criteria.Status == CatalogStatus.OnSale), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GuestGetMissingPackageThrowsPackageNotFound()
    {
        var id = Guid.NewGuid();

        var act = () => Create(null).GetAsync(id, CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CatalogErrors.PackageNotFoundCode);
        await _packages.Received(1).GetDetailAsync(id, CatalogTestDoubles.VietnamToday, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreatePackageAddsItemsAndReturnsDetail()
    {
        ServicePackage? added = null;
        await _packages.AddAsync(Arg.Do<ServicePackage>(package => added = package), Arg.Any<CancellationToken>());
        var second = new SpaService { Name = "Tẩy da chết", DurationMinutes = 30, Price = 1 };
        _services.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns([_onSale, second]);

        var result = await Create(Roles.Owner).CreateAsync(NewPackage(Item(second, 2), Item(_onSale, 1)), CancellationToken.None);

        added!.Status.Should().Be(CatalogStatus.OnSale);
        added.Items.Should().HaveCount(2).And.OnlyContain(item => item.ServicePackageId == added.Id);
        added.Items.Select(item => item.SortOrder).Should().BeEquivalentTo([1, 2]);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        result.Data!.Id.Should().Be(added.Id);
    }

    [Fact]
    public async Task SearchPassesTheServiceFilter()
    {
        var serviceId = Guid.NewGuid();

        await Create(null).SearchAsync(new PagedQuery(), new PackageFilter { ServiceId = serviceId }, CancellationToken.None);

        await _packages.Received(1).SearchAsync(
            Arg.Is<PackageSearchCriteria>(criteria => criteria.ServiceId == serviceId), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreatePackageTrimsShortDescription()
    {
        ServicePackage? added = null;
        await _packages.AddAsync(Arg.Do<ServicePackage>(package => added = package), Arg.Any<CancellationToken>());
        _services.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns([_onSale]);

        await Create(Roles.Owner).CreateAsync(NewPackage(Item(_onSale, 1)) with { ShortDescription = "  Gói 1 buổi  " }, CancellationToken.None);

        added!.ShortDescription.Should().Be("Gói 1 buổi");
    }

    [Fact]
    public async Task CreatePackageRejectsMissingService()
    {
        var act = () => Create(Roles.Owner).CreateAsync(
            NewPackage(Item(_onSale, 1), new PackageItemRequest(Guid.NewGuid(), 1, 2, 0, null)), CancellationToken.None);

        var error = (await act.Should().ThrowAsync<BusinessRuleException>()).Which;
        error.Code.Should().Be(CatalogErrors.PackageServiceNotFoundCode);
        error.Message.Should().Contain("2");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreatePackageRejectsDiscontinuedService()
    {
        var act = () => Create(Roles.Owner).CreateAsync(NewPackage(Item(_onSale, 1), Item(_discontinued, 2)), CancellationToken.None);

        var error = (await act.Should().ThrowAsync<BusinessRuleException>()).Which;
        error.Code.Should().Be(CatalogErrors.PackageServiceDiscontinuedCode);
        error.Message.Should().Contain("Massage cổ");
    }

    [Fact]
    public async Task UpdatePackageKeepsExistingDiscontinuedServiceButRejectsNewOne()
    {
        var package = new ServicePackage { Name = "Gói", Price = 1, ValidityDays = 30 };
        package.ReplaceItems([new ServicePackageItem { ServicePackageId = package.Id, SpaServiceId = _discontinued.Id, SortOrder = 1, SessionCount = 1 }]);
        _packages.GetWithItemsAsync(package.Id, Arg.Any<CancellationToken>()).Returns(package);
        var keep = new UpdatePackageRequest("Gói mới", null, 5, 60, null, null, [Item(_discontinued, 1), Item(_onSale, 2)]);

        await Create(Roles.Owner).UpdateAsync(package.Id, keep, CancellationToken.None);

        package.Name.Should().Be("Gói mới");
        _packages.Received(1).ReplaceItems(package, Arg.Is<IReadOnlyCollection<ServicePackageItem>>(items => items.Count == 2));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());

        var other = new ServicePackage { Name = "Gói khác", Price = 1, ValidityDays = 30 };
        _packages.GetWithItemsAsync(other.Id, Arg.Any<CancellationToken>()).Returns(other);
        var addDiscontinued = new UpdatePackageRequest("Gói khác", null, 5, 60, null, null, [Item(_discontinued, 1)]);

        var act = () => Create(Roles.Owner).UpdateAsync(other.Id, addDiscontinued, CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be(CatalogErrors.PackageServiceDiscontinuedCode);
    }

    [Fact]
    public async Task UpdateMissingPackageThrowsPackageNotFound()
    {
        var act = () => Create(Roles.Owner).UpdateAsync(
            Guid.NewGuid(), new UpdatePackageRequest("Gói", null, 1, 30, null, null, [Item(_onSale, 1)]), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CatalogErrors.PackageNotFoundCode);
    }

    [Fact]
    public async Task ChangeStatusOnMissingPackageThrowsPackageNotFound()
    {
        var act = () => Create(Roles.Owner).ChangeStatusAsync(Guid.NewGuid(), new ChangeCatalogStatusRequest(CatalogStatus.OnSale), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CatalogErrors.PackageNotFoundCode);
    }
}

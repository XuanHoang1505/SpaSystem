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
    private readonly IServiceCategoryRepository _categories = Substitute.For<IServiceCategoryRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ServiceCategory _skin = new() { Name = "Chăm sóc da" };
    private readonly ServiceCategory _hidden = new() { Name = "Ẩn", IsActive = false };

    public ServiceCatalogServiceTests()
    {
        _services.SearchAsync(Arg.Any<ServiceSearchCriteria>(), Arg.Any<CancellationToken>())
            .Returns(new PagedResult<ServiceListItemDto>([], 1, 10, 0));
        _categories.GetByIdAsync(_skin.Id, Arg.Any<CancellationToken>()).Returns(_skin);
        _categories.GetByIdAsync(_hidden.Id, Arg.Any<CancellationToken>()).Returns(_hidden);
    }

    private ServiceCatalogService Create(string? role) => new(
        _services, _categories, CatalogTestDoubles.Viewer(role), _unitOfWork,
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

        await Create(null).SearchAsync(query, new ServiceFilter { CategoryId = _skin.Id }, CancellationToken.None);

        await _services.Received(1).SearchAsync(Arg.Is<ServiceSearchCriteria>(criteria =>
            criteria.Search == "cham soc" && criteria.CategoryId == _skin.Id && criteria.SortBy == CatalogSortField.Price &&
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
            .Returns(new ServiceDetailDto(id, "A", Guid.Empty, "B", null, 1, 1, null, CatalogStatus.Discontinued, CatalogTestDoubles.Now, null));

        var result = await Create(Roles.Owner).GetAsync(id, CancellationToken.None);

        result.Data!.Status.Should().Be(CatalogStatus.Discontinued);
    }

    [Fact]
    public async Task CreateServiceDefaultsToOnSaleAndUsesTheCategory()
    {
        SpaService? added = null;
        await _services.AddAsync(Arg.Do<SpaService>(service => added = service), Arg.Any<CancellationToken>());

        var result = await Create(Roles.Owner).CreateAsync(
            new CreateServiceRequest("  Chăm sóc da mặt ", _skin.Id, "  ", 60, 350_000, null), CancellationToken.None);

        added.Should().NotBeNull();
        added!.Name.Should().Be("Chăm sóc da mặt");
        added.CategoryId.Should().Be(_skin.Id);
        added.Description.Should().BeNull();
        added.Status.Should().Be(CatalogStatus.OnSale);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        result.Data!.Id.Should().Be(added.Id);
        result.Data.Category.Should().Be("Chăm sóc da");
        result.Data.CategoryId.Should().Be(_skin.Id);
    }

    [Fact]
    public async Task CreateServiceTrimsShortDescriptionAndNumbersStepsInOrder()
    {
        SpaService? added = null;
        await _services.AddAsync(Arg.Do<SpaService>(service => added = service), Arg.Any<CancellationToken>());
        var request = new CreateServiceRequest("A", _skin.Id, null, 60, 1, null)
        {
            ShortDescription = "   ",
            Steps = [new ServiceStepRequest("  Làm sạch ", null, 10), new ServiceStepRequest("Đắp mặt nạ", "  Mặt nạ thảo mộc ", 20)],
        };

        var result = await Create(Roles.Owner).CreateAsync(request, CancellationToken.None);

        added!.ShortDescription.Should().BeNull();
        added.Steps.OrderBy(step => step.SortOrder).Select(step => (step.SortOrder, step.Title, step.Description, step.DurationMinutes))
            .Should().Equal((1, "Làm sạch", null, 10), (2, "Đắp mặt nạ", "Mặt nạ thảo mộc", 20));
        added.Steps.Should().OnlyContain(step => step.SpaServiceId == added.Id);
        result.Data!.Steps.Select(step => step.Title).Should().Equal("Làm sạch", "Đắp mặt nạ");
    }

    [Fact]
    public async Task UpdateWithoutStepsKeepsTheCurrentSteps()
    {
        var service = new SpaService { Name = "A", CategoryId = _skin.Id, DurationMinutes = 60, Price = 1 };
        var current = new List<ServiceStep> { new() { SpaServiceId = service.Id, SortOrder = 1, Title = "Cũ" } };
        _services.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _services.GetStepsAsync(service.Id, Arg.Any<CancellationToken>()).Returns(current);

        var result = await Create(Roles.Owner).UpdateAsync(
            service.Id, new UpdateServiceRequest("A", _skin.Id, null, 60, 1) { ShortDescription = " Mới " }, CancellationToken.None);

        _services.DidNotReceive().ReplaceSteps(Arg.Any<IReadOnlyCollection<ServiceStep>>(), Arg.Any<IReadOnlyCollection<ServiceStep>>());
        service.ShortDescription.Should().Be("Mới");
        result.Data!.Steps.Select(step => step.Title).Should().Equal("Cũ");
    }

    [Fact]
    public async Task UpdateWithoutStepsCannotShrinkTheDurationBelowTheKeptSteps()
    {
        var service = new SpaService { Name = "A", CategoryId = _skin.Id, DurationMinutes = 90, Price = 1 };
        var current = new List<ServiceStep>
        {
            new() { SpaServiceId = service.Id, SortOrder = 1, Title = "Một", DurationMinutes = 45 },
            new() { SpaServiceId = service.Id, SortOrder = 2, Title = "Hai", DurationMinutes = 40 },
        };
        _services.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _services.GetStepsAsync(service.Id, Arg.Any<CancellationToken>()).Returns(current);

        var act = () => Create(Roles.Owner).UpdateAsync(service.Id, new UpdateServiceRequest("A", _skin.Id, null, 30, 1), CancellationToken.None);

        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors.Should().Contain(error => error.PropertyName == "DurationMinutes");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateWithAStepListReplacesTheSteps()
    {
        var service = new SpaService { Name = "A", CategoryId = _skin.Id, DurationMinutes = 60, Price = 1 };
        var current = new List<ServiceStep> { new() { SpaServiceId = service.Id, SortOrder = 1, Title = "Cũ" } };
        _services.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _services.GetStepsAsync(service.Id, Arg.Any<CancellationToken>()).Returns(current);
        IReadOnlyCollection<ServiceStep>? next = null;
        _services.ReplaceSteps(current, Arg.Do<IReadOnlyCollection<ServiceStep>>(steps => next = steps));

        var empty = await Create(Roles.Owner).UpdateAsync(
            service.Id, new UpdateServiceRequest("A", _skin.Id, null, 60, 1) { Steps = [] }, CancellationToken.None);

        next.Should().BeEmpty();
        empty.Data!.Steps.Should().BeEmpty();
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateServiceWithUnknownCategoryIsRejected()
    {
        var act = () => Create(Roles.Owner).CreateAsync(new CreateServiceRequest("A", Guid.NewGuid(), null, 30, 1, null), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be(CatalogErrors.ServiceCategoryNotFoundCode);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateServiceInHiddenCategoryIsRejected()
    {
        var act = () => Create(Roles.Owner).CreateAsync(new CreateServiceRequest("A", _hidden.Id, null, 30, 1, null), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be(CatalogErrors.ServiceCategoryInactiveCode);
    }

    [Fact]
    public async Task UpdateKeepingAHiddenCategoryIsAllowed()
    {
        var service = new SpaService { Name = "A", CategoryId = _hidden.Id, DurationMinutes = 30, Price = 1 };
        _services.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        await Create(Roles.Owner).UpdateAsync(service.Id, new UpdateServiceRequest("B", _hidden.Id, null, 30, 1), CancellationToken.None);

        service.Name.Should().Be("B");
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateMovingToAHiddenCategoryIsRejected()
    {
        var service = new SpaService { Name = "A", CategoryId = _skin.Id, DurationMinutes = 30, Price = 1 };
        _services.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var act = () => Create(Roles.Owner).UpdateAsync(service.Id, new UpdateServiceRequest("A", _hidden.Id, null, 30, 1), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be(CatalogErrors.ServiceCategoryInactiveCode);
    }

    [Fact]
    public async Task CreateServiceHonoursRequestedStatus()
    {
        SpaService? added = null;
        await _services.AddAsync(Arg.Do<SpaService>(service => added = service), Arg.Any<CancellationToken>());

        await Create(Roles.Owner).CreateAsync(new CreateServiceRequest("A", _skin.Id, null, 30, 0, CatalogStatus.Discontinued), CancellationToken.None);

        added!.Status.Should().Be(CatalogStatus.Discontinued);
    }

    [Fact]
    public async Task CreateServiceRejectsInvalidDataWithoutSaving()
    {
        var act = () => Create(Roles.Owner).CreateAsync(new CreateServiceRequest("", _skin.Id, null, 0, -1, null), CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateServiceChangesFieldsAndCategory()
    {
        var other = new ServiceCategory { Name = "Massage" };
        _categories.GetByIdAsync(other.Id, Arg.Any<CancellationToken>()).Returns(other);
        var service = new SpaService { Name = "A", CategoryId = _skin.Id, DurationMinutes = 30, Price = 1 };
        _services.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        await Create(Roles.Owner).UpdateAsync(service.Id, new UpdateServiceRequest("A", other.Id, null, 45, 2), CancellationToken.None);

        service.CategoryId.Should().Be(other.Id);
        service.DurationMinutes.Should().Be(45);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateMissingServiceThrowsServiceNotFound()
    {
        var act = () => Create(Roles.Owner).UpdateAsync(Guid.NewGuid(), new UpdateServiceRequest("A", _skin.Id, null, 30, 1), CancellationToken.None);

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

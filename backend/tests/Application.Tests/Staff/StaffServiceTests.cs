using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Staff;
using NhuNguyetSpa.Application.Validators.Staff;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Staff;

/// <summary>UC-SPA-22 (docs/specs/staff.md). Today in Vietnam is 27/10/2026.</summary>
public sealed class StaffServiceTests
{
    private static readonly DateOnly Today = StaffTestDoubles.VietnamToday;
    private readonly IStaffMemberRepository _staff = Substitute.For<IStaffMemberRepository>();
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly ISpaServiceRepository _services = Substitute.For<ISpaServiceRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IRefreshTokenRepository _refreshTokens = Substitute.For<IRefreshTokenRepository>();
    private readonly IPasswordHasher _hasher = Substitute.For<IPasswordHasher>();
    private readonly IEmailSender _mail = Substitute.For<IEmailSender>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly List<EmailMessage> _sent = [];
    private readonly List<string> _hashed = [];
    private readonly SpaService _facial = Service("Chăm sóc da mặt", CatalogStatus.OnSale);
    private readonly SpaService _old = Service("Massage cũ", CatalogStatus.Discontinued);

    public StaffServiceTests()
    {
        _hasher.Hash(Arg.Do<string>(_hashed.Add)).Returns("hashed");
        _mail.SendAsync(Arg.Do<EmailMessage>(_sent.Add), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _unitOfWork.ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<CancellationToken, Task>>()(CancellationToken.None));
        _services.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(call => new[] { _facial, _old }.Where(service => call.Arg<IReadOnlyCollection<Guid>>().Contains(service.Id)).ToList());
        _staff.GetDetailAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(call => Detail(call.Arg<Guid>()));
        _appointments.GetOccupyingFromAsync(Arg.Any<Guid>(), Arg.Any<DateOnly>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns([]);
    }

    private StaffService Create(string? role = Roles.Owner)
    {
        IDateTimeProvider clock = StaffTestDoubles.Clock();
        return new StaffService(_staff, _users, _services, _appointments, _refreshTokens, _hasher, _mail, _unitOfWork, clock,
            StaffTestDoubles.User(role), Options.Create(new StaffOptions()), new CreateStaffRequestValidator(clock),
            new UpdateStaffRequestValidator(clock), new UpdateStaffServicesRequestValidator(), new ResignStaffRequestValidator(clock),
            new StaffFilterValidator());
    }

    private CreateStaffRequest NewStaff(params Guid[] serviceIds) =>
        new(" Nguyễn Thị An ", " An@Spa.vn ", "0912345678", Today, " Chăm sóc da ", serviceIds);

    [Fact]
    public async Task CreateChecksEmailBeforePhone()
    {
        _users.ExistsByEmailAsync("An@Spa.vn", Arg.Any<CancellationToken>()).Returns(true);
        _users.ExistsByPhoneAsync("0912345678", Arg.Any<CancellationToken>()).Returns(true);

        var act = () => Create().CreateAsync(NewStaff(), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("email_exists");
        await _users.DidNotReceive().AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateRejectsTakenPhone()
    {
        _users.ExistsByPhoneAsync("0912345678", Arg.Any<CancellationToken>()).Returns(true);

        var act = () => Create().CreateAsync(NewStaff(), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("phone_exists");
    }

    [Fact]
    public async Task CreateRejectsUnknownService()
    {
        var act = () => Create().CreateAsync(NewStaff(_facial.Id, Guid.NewGuid()), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("staff_service_not_found");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateRejectsDiscontinuedService()
    {
        var act = () => Create().CreateAsync(NewStaff(_old.Id), CancellationToken.None);

        var exception = await act.Should().ThrowAsync<BusinessRuleException>();
        exception.Which.Code.Should().Be("staff_service_discontinued");
        exception.Which.Message.Should().Contain("Massage cũ");
    }

    [Fact]
    public async Task CreateHashesPasswordAndMailsIt()
    {
        User? added = null;
        StaffMember? addedStaff = null;
        await _users.AddAsync(Arg.Do<User>(user => added = user), Arg.Any<CancellationToken>());
        await _staff.AddAsync(Arg.Do<StaffMember>(staff => addedStaff = staff), Arg.Any<CancellationToken>());

        var result = await Create().CreateAsync(NewStaff(_facial.Id), CancellationToken.None);

        added.Should().NotBeNull();
        added!.FullName.Should().Be("Nguyễn Thị An");
        added.Email.Should().Be("An@Spa.vn");
        added.Role.Should().Be(UserRole.Staff);
        added.Status.Should().Be(UserStatus.Active);
        added.PasswordHash.Should().Be("hashed");
        addedStaff!.Id.Should().Be(added.Id);
        addedStaff.Specialty.Should().Be("Chăm sóc da");
        addedStaff.Skills.Select(skill => skill.SpaServiceId).Should().Equal(_facial.Id);

        var mail = _sent.Should().ContainSingle().Subject;
        mail.ToEmail.Should().Be("An@Spa.vn");
        _hashed.Should().ContainSingle().Which.Should().HaveLength(12);
        mail.TextBody.Should().Contain("Mật khẩu tạm: " + _hashed[0]);
        result.Data!.Id.Should().Be(added.Id);
        typeof(StaffDetailDto).GetProperties().Select(property => property.Name).Should().NotContain(name => name.Contains("Password"));
    }

    [Fact]
    public async Task CreateSendsMailAfterSaveAndRollsBackOnMailFailure()
    {
        _mail.SendAsync(Arg.Any<EmailMessage>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new ServiceUnavailableException("Không gửi được email.", "email_send_failed"));

        var act = () => Create().CreateAsync(NewStaff(), CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be("email_send_failed");
        Received.InOrder(() =>
        {
            _unitOfWork.ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>());
            _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>());
            _mail.SendAsync(Arg.Any<EmailMessage>(), Arg.Any<CancellationToken>());
        });
    }

    [Fact]
    public async Task UpdateRejectsHireDateAfterResignation()
    {
        var staff = Existing();
        staff.Resign(new DateOnly(2026, 11, 1));

        var act = () => Create().UpdateAsync(staff.Id, new UpdateStaffRequest("An", staff.User.PhoneNumber, new DateOnly(2026, 11, 2), null),
            CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("resignation_before_hire_date");
    }

    [Fact]
    public async Task UpdateRejectsHireDateAfterEarliestShift()
    {
        var staff = Existing();
        _staff.GetEarliestActiveShiftDateAsync(staff.Id, Arg.Any<CancellationToken>()).Returns(new DateOnly(2026, 11, 3));

        var act = () => Create().UpdateAsync(staff.Id, new UpdateStaffRequest("An", staff.User.PhoneNumber, new DateOnly(2026, 11, 4), null),
            CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("hire_date_after_shift");
    }

    [Fact]
    public async Task UpdateSavesFieldsAndAllowsHireDateOnEarliestShift()
    {
        var staff = Existing();
        _staff.GetEarliestActiveShiftDateAsync(staff.Id, Arg.Any<CancellationToken>()).Returns(new DateOnly(2026, 11, 3));

        await Create().UpdateAsync(staff.Id, new UpdateStaffRequest(" Trần Bình ", staff.User.PhoneNumber, new DateOnly(2026, 11, 3), " "),
            CancellationToken.None);

        staff.User.FullName.Should().Be("Trần Bình");
        staff.HireDate.Should().Be(new DateOnly(2026, 11, 3));
        staff.Specialty.Should().BeNull();
        await _users.DidNotReceive().ExistsByPhoneAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdatePhoneTakenByOtherUser()
    {
        var staff = Existing();
        _users.ExistsByPhoneAsync("0999999999", Arg.Any<CancellationToken>()).Returns(true);

        var act = () => Create().UpdateAsync(staff.Id, new UpdateStaffRequest("An", "0999999999", Today, null), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("phone_exists");
    }

    [Fact]
    public async Task UpdateUnknownStaffIsNotFound()
    {
        var act = () => Create().UpdateAsync(Guid.NewGuid(), new UpdateStaffRequest("An", "0912345678", Today, null), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("staff_not_found");
    }

    [Fact]
    public async Task UpdateServicesKeepsExistingDiscontinued()
    {
        var staff = Existing();
        staff.ReplaceSkills([_old.Id]);

        await Create().UpdateServicesAsync(staff.Id, new UpdateStaffServicesRequest([_old.Id, _facial.Id]), CancellationToken.None);

        staff.Skills.Select(skill => skill.SpaServiceId).Should().BeEquivalentTo([_old.Id, _facial.Id]);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateServicesRejectsNewlyAddedDiscontinued()
    {
        var staff = Existing();

        var act = () => Create().UpdateServicesAsync(staff.Id, new UpdateStaffServicesRequest([_old.Id]), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("staff_service_discontinued");
    }

    [Fact]
    public async Task ResignTodayDeactivatesAndRevokes()
    {
        var staff = Existing();
        var reassign = new AppointmentToReassignDto(Guid.NewGuid(), Today.AddDays(1), new TimeOnly(9, 0), new TimeOnly(10, 0),
            AppointmentStatus.Confirmed, Guid.NewGuid(), "Khách A");
        _appointments.GetOccupyingFromAsync(staff.Id, Today, StaffTestDoubles.Now, Arg.Any<CancellationToken>()).Returns([reassign]);

        var result = await Create().ResignAsync(staff.Id, new ResignStaffRequest(Today), CancellationToken.None);

        staff.ResignationDate.Should().Be(Today);
        staff.User.Status.Should().Be(UserStatus.Inactive);
        await _staff.Received(1).CancelActiveShiftsFromAsync(staff.Id, Today, Arg.Any<CancellationToken>());
        await _refreshTokens.Received(1).DeleteAllActiveAsync(staff.Id, StaffTestDoubles.Now, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>());
        result.Data!.AppointmentsToReassign.Should().Equal(reassign);
        result.Data.Staff.Id.Should().Be(staff.Id);
    }

    [Fact]
    public async Task ResignTomorrowKeepsActive()
    {
        var staff = Existing();

        await Create().ResignAsync(staff.Id, new ResignStaffRequest(Today.AddDays(1)), CancellationToken.None);

        staff.ResignationDate.Should().Be(Today.AddDays(1));
        staff.User.Status.Should().Be(UserStatus.Active);
        await _staff.Received(1).CancelActiveShiftsFromAsync(staff.Id, Today.AddDays(1), Arg.Any<CancellationToken>());
        await _refreshTokens.DidNotReceive().DeleteAllActiveAsync(Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResignTwiceConflicts()
    {
        var staff = Existing();
        staff.Resign(Today);

        var act = () => Create().ResignAsync(staff.Id, new ResignStaffRequest(Today.AddDays(2)), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("staff_already_resigned");
    }

    [Fact]
    public async Task ResignBeforeHireDateRejected()
    {
        var staff = Existing();

        var act = () => Create().ResignAsync(staff.Id, new ResignStaffRequest(staff.HireDate.AddDays(-1)), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("resignation_before_hire_date");
    }

    [Theory]
    [InlineData(null)]
    [InlineData(Roles.Customer)]
    [InlineData(Roles.Staff)]
    public async Task SearchAsNonOwnerForbidden(string? role)
    {
        var act = () => Create(role).SearchAsync(new PagedQuery(), new StaffFilter(), CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task SearchPassesOwnerFilters()
    {
        var serviceId = Guid.NewGuid();
        _staff.SearchAsync(Arg.Any<StaffSearchCriteria>(), Arg.Any<CancellationToken>()).Returns(new PagedResult<StaffListItemDto>([], 1, 10, 0));

        await Create().SearchAsync(new PagedQuery { Search = "  thu " }, new StaffFilter { Status = "resigned", SpaServiceId = serviceId },
            CancellationToken.None);

        await _staff.Received(1).SearchAsync(Arg.Is<StaffSearchCriteria>(criteria =>
            criteria.Search == "thu" && criteria.Resigned == true && criteria.SpaServiceId == serviceId && criteria.Today == Today),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublicSearchIgnoresStatus()
    {
        _staff.SearchPublicAsync(Arg.Any<StaffSearchCriteria>(), Arg.Any<CancellationToken>())
            .Returns(new PagedResult<PublicStaffListItemDto>([], 1, 10, 0));

        await Create(null).SearchPublicAsync(new PagedQuery(), new StaffFilter { Status = "resigned" }, CancellationToken.None);

        await _staff.Received(1).SearchPublicAsync(Arg.Is<StaffSearchCriteria>(criteria => criteria.Resigned == null && criteria.Today == Today),
            Arg.Any<CancellationToken>());
    }

    private StaffMember Existing()
    {
        var user = new User { FullName = "An", Email = "an@spa.vn", PhoneNumber = "0912345678", Role = UserRole.Staff, Status = UserStatus.Active };
        var staff = new StaffMember { Id = user.Id, User = user, HireDate = new DateOnly(2026, 1, 1) };
        _staff.GetForUpdateAsync(staff.Id, Arg.Any<CancellationToken>()).Returns(staff);
        return staff;
    }

    private static StaffDetailDto Detail(Guid id) =>
        new(id, "An", "an@spa.vn", "0912345678", null, null, new DateOnly(2026, 1, 1), null, UserStatus.Active, [], DateTime.UtcNow, null);

    private static SpaService Service(string name, CatalogStatus status)
    {
        var service = new SpaService { Name = name, Category = "Da", DurationMinutes = 60, Price = 100_000 };
        service.ChangeStatus(status);
        return service;
    }
}

using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.UseCases.Notifications;
using NhuNguyetSpa.Application.UseCases.Orders;
using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.ValueObjects;
using static NhuNguyetSpa.Infrastructure.Persistence.Seeds.FullSeedContent;

namespace NhuNguyetSpa.Infrastructure.Persistence.Seeds;

/// <summary>
/// A complete development database (<c>npm run db:seed:full</c>, Development only). <b>Empties every table first</b>, then creates the
/// sample catalog (<see cref="CatalogDataSeeder"/>) with real photos, one owner, five staff (one resigned), sixteen customers (one
/// locked) and about fourteen months of history: shifts, orders and payments (paid, cancelled, expired, with promotions), bought
/// services and packages with treatment plans, appointments in every status, skin profiles, allergies, reviews with replies,
/// notifications, AI chat turns, OTP codes and refresh tokens. Dates are relative to today, so the data never goes stale.
/// The three main accounts share <see cref="Password"/>: owner@gmail.com, staff@gmail.com and customer@gmail.com.
/// Rows are written through a context without the audit interceptor so that their past timestamps are kept.
/// </summary>
public sealed class FullDataSeeder
{
    public const string Password = "Abc123456";
    private const int HistoryMonths = 14;

    private readonly IConfiguration _configuration;
    private readonly CatalogDataSeeder _catalog;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IDateTimeProvider _clock;
    private readonly ILogger<FullDataSeeder> _logger;

    private readonly Random _rng = new(20261117);
    private readonly List<StaffInfo> _staff = [];
    private readonly List<CustomerInfo> _customers = [];
    private readonly Dictionary<(Guid Owner, DateOnly Day), List<(TimeOnly Start, TimeOnly End)>> _busy = [];
    private readonly HashSet<(Guid Customer, Guid Product)> _reviewed = [];
    private readonly HashSet<(Guid Customer, Guid Promotion)> _promotionUsed = [];
    private readonly Dictionary<Guid, SkinType> _skinTypes = [];
    private readonly HashSet<string> _orderCodes = [];
    private readonly List<Promotion> _promotions = [];
    private AppDbContext _db = null!;
    private Dictionary<Guid, SpaService> _services = [];
    private Dictionary<Guid, ServicePackage> _packages = [];
    private DateTime _now;
    private DateOnly _today;
    private DateOnly _scheduleStart;
    private DateOnly _scheduleEnd;
    private Guid _ownerId;
    private int _reviewPhoto;

    public FullDataSeeder(IConfiguration configuration, CatalogDataSeeder catalog, IPasswordHasher passwordHasher, IDateTimeProvider clock,
        ILogger<FullDataSeeder> logger)
    {
        _configuration = configuration;
        _catalog = catalog;
        _passwordHasher = passwordHasher;
        _clock = clock;
        _logger = logger;
    }

    private sealed record StaffInfo(Guid Id, string Name, DayOfWeek OffDay, DateOnly HireDate, DateOnly? ResignedOn, HashSet<Guid> Skills);

    private sealed record CustomerInfo(Guid Id, string Name, DateOnly JoinedOn);

    private readonly record struct Product(SpaService? Service, ServicePackage? Package)
    {
        public Guid Id => Service?.Id ?? Package!.Id;
        public string Name => Service?.Name ?? Package!.Name;
        public decimal Price => Service?.Price ?? Package!.Price;
    }

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        _now = _clock.UtcNow;
        _today = SpaTime.Today(_now);
        _scheduleStart = _today.AddMonths(-HistoryMonths).AddDays(-7);
        _scheduleEnd = _today.AddDays(28);

        var connectionString = _configuration.GetConnectionString(DependencyInjection.ConnectionStringName);
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException($"Connection string 'ConnectionStrings:{DependencyInjection.ConnectionStringName}' is not configured.");
        var options = new DbContextOptionsBuilder<AppDbContext>();
        DependencyInjection.ConfigureDbContext(options, connectionString);
        await using var db = new AppDbContext(options.Options);
        _db = db;

        await TruncateAsync(cancellationToken);
        await _catalog.SeedAsync(cancellationToken);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await PrepareCatalogAsync(cancellationToken);
        var passwordHash = _passwordHasher.Hash(Password);
        AddSpaProfile();
        AddPeople(passwordHash);
        AddWorkSchedules();
        AddCertifications();
        AddPromotions();
        AddMainCustomerStory();
        AddMainStaffToday();
        AddHistory();
        AddAccountExtras();
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        _logger.LogInformation(
            "Full data seeded for {Today}: {Users} users, {Orders} orders, {Appointments} appointments, {Reviews} reviews, {Notifications} notifications. Password of every account: {Password}",
            _today, await db.Users.CountAsync(cancellationToken), await db.Orders.CountAsync(cancellationToken),
            await db.Appointments.CountAsync(cancellationToken), await db.Reviews.CountAsync(cancellationToken),
            await db.Notifications.CountAsync(cancellationToken), Password);
    }

    /// <summary>Empties every table of the model (the migrations history is not part of it).</summary>
    private async Task TruncateAsync(CancellationToken cancellationToken)
    {
        var tables = _db.Model.GetEntityTypes().Select(type => type.GetTableName()).OfType<string>().Distinct()
            .Select(name => "\"" + name + "\"");
        var sql = "TRUNCATE TABLE " + string.Join(", ", tables) + " RESTART IDENTITY CASCADE;";
        await _db.Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }

    // ---------------------------------------------------------------- catalog

    private async Task PrepareCatalogAsync(CancellationToken cancellationToken)
    {
        var categories = await _db.ServiceCategories.ToDictionaryAsync(row => row.Id, cancellationToken);
        var steam = categories[CatalogSeedIds.CategorySteam];
        steam.IsActive = true;
        steam.Description = "Xông hơi thảo dược giúp thư giãn và làm ấm cơ thể.";
        categories[CatalogSeedIds.CategoryNails].Description = "Sơn gel, chăm sóc móng tay và móng chân.";

        _db.SpaServices.Add(new SpaService
        {
            Id = NailGelServiceId,
            CategoryId = CatalogSeedIds.CategoryNails,
            Name = "Sơn gel tay",
            ShortDescription = "Sơn gel bền màu đến 3 tuần, kèm dưỡng da tay.",
            Description = "Dũa móng, làm sạch da thừa và sơn gel với bảng hơn 100 màu. Bền màu đến 3 tuần.",
            DurationMinutes = 60,
            Price = 180_000,
        });
        await _db.SaveChangesAsync(cancellationToken);

        _services = await _db.SpaServices.ToDictionaryAsync(row => row.Id, cancellationToken);
        _packages = await _db.ServicePackages.Include(row => row.Items).ToDictionaryAsync(row => row.Id, cancellationToken);
        _services[NailGelServiceId].ChangeStatus(CatalogStatus.OnSale);

        foreach (var (id, url) in ServicePhotos)
            _services[id].SetImage(url);
        foreach (var (id, url) in PackagePhotos)
            _packages[id].SetImage(url);
        foreach (var (id, texts) in ServiceTexts)
        {
            _services[id].Description = texts.Description;
            _services[id].ShortDescription = texts.ShortDescription;
        }
        foreach (var (id, texts) in PackageTexts)
        {
            _packages[id].Description = texts.Description;
            _packages[id].ShortDescription = texts.ShortDescription;
        }
        foreach (var (id, steps) in ExtraSteps)
        {
            for (var i = 0; i < steps.Length; i++)
                _db.ServiceSteps.Add(new ServiceStep { SpaServiceId = id, SortOrder = i + 1, Title = steps[i].Title, DurationMinutes = steps[i].Minutes });
        }
    }

    private void AddSpaProfile() => _db.SpaProfiles.Add(new SpaProfile
    {
        Name = "Spa Như Nguyệt",
        Introduction = "Spa Như Nguyệt chăm sóc da mặt, massage, gội đầu dưỡng sinh và chăm sóc cơ thể bằng thảo mộc thiên nhiên. "
            + "Đội ngũ kỹ thuật viên có chứng chỉ, tư vấn theo từng làn da.",
        Address = "1 Võ Văn Ngân, phường Thủ Đức, TP. Hồ Chí Minh",
        PhoneNumber = "02838961234",
        // jsonb columns (data-model.md): opening hours per weekday, policies as named texts.
        OpeningHours = System.Text.Json.JsonSerializer.Serialize(
            new[] { "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday" }
                .ToDictionary(day => day, _ => new { open = "08:00", close = "18:00" })),
        Policies = System.Text.Json.JsonSerializer.Serialize(new
        {
            arrival = "Vui lòng đến trước giờ hẹn 10 phút.",
            changeOrCancel = "Đổi hoặc hủy lịch trước giờ hẹn ít nhất 24 giờ.",
            hold = "Đặt lịch kèm thanh toán được giữ chỗ 20 phút.",
            refund = "Dịch vụ đã thanh toán không hoàn tiền, có thể đặt lại lịch khác.",
        }),
    });

    // ---------------------------------------------------------------- people

    private void AddPeople(string passwordHash)
    {
        var owner = NewUser(Owner, UserRole.Owner, passwordHash, Utc(_today.AddYears(-3), new TimeOnly(9, 0)));
        _ownerId = owner.Id;
        _db.OwnerProfiles.Add(new OwnerProfile { Id = owner.Id, Note = "Chủ Spa Như Nguyệt." });

        var face = Services(CatalogSeedIds.CategoryFace);
        var treatment = Services(CatalogSeedIds.CategoryTreatment);
        var massage = Services(CatalogSeedIds.CategoryMassage);
        var hair = Services(CatalogSeedIds.CategoryHairWash);
        var body = Services(CatalogSeedIds.CategoryBody);
        var waxing = Services(CatalogSeedIds.CategoryWaxing);
        var steam = Services(CatalogSeedIds.CategorySteam);
        Guid[] nails = [NailGelServiceId];

        AddStaff(new PersonDef("Trần Minh Thư", "staff@gmail.com", "0987654321", Gender.Female, new DateOnly(1995, 5, 20), Avatar(true, 47)),
            passwordHash, "Chăm sóc da mặt và trị liệu da", DayOfWeek.Monday, _today.AddYears(-3), null, [.. face, .. treatment, .. steam]);
        AddStaff(new PersonDef("Nguyễn Thị Hoa", "hoa.nguyen@nhunguyetspa.vn", "0987000002", Gender.Female, new DateOnly(1992, 9, 2), Avatar(true, 57)),
            passwordHash, "Massage và gội đầu dưỡng sinh", DayOfWeek.Wednesday, _today.AddYears(-3).AddDays(20), null, [.. massage, .. hair, .. steam]);
        AddStaff(new PersonDef("Phạm Ngọc Lan", "lan.pham@nhunguyetspa.vn", "0987000003", Gender.Female, new DateOnly(1997, 1, 15), Avatar(true, 29)),
            passwordHash, "Chăm sóc cơ thể, triệt lông và nail", DayOfWeek.Thursday, _today.AddYears(-2), null, [.. body, .. waxing, .. nails]);
        AddStaff(new PersonDef("Lê Tường Vy", "vy.le@nhunguyetspa.vn", "0987000004", Gender.Female, new DateOnly(1999, 7, 9), Avatar(true, 9)),
            passwordHash, "Chăm sóc da và massage", DayOfWeek.Sunday, _today.AddMonths(-5), null, [.. face, .. treatment, .. massage, .. hair]);
        AddStaff(new PersonDef("Đỗ Minh Quân", "quan.do@nhunguyetspa.vn", "0987000005", Gender.Male, new DateOnly(1993, 4, 4), Avatar(false, 75)),
            passwordHash, "Massage trị liệu", DayOfWeek.Friday, _today.AddYears(-2).AddDays(15), _today.AddDays(-40), [.. massage, .. body]);

        AddCustomer(MainCustomer, passwordHash, _today.AddDays(-150), locked: false, note: "Khách thân thiết, thích khung giờ chiều.");
        for (var i = 0; i < OtherCustomers.Length; i++)
        {
            var joined = _today.AddMonths(-HistoryMonths).AddDays(-20 + i * 23);
            AddCustomer(OtherCustomers[i], passwordHash, joined, locked: i == LockedCustomerIndex,
                note: i == LockedCustomerIndex ? "Tạm khóa do nhiều lần đặt lịch không đến." : null);
        }
    }

    private Guid[] Services(Guid categoryId) =>
        [.. _services.Values.Where(service => service.CategoryId == categoryId).Select(service => service.Id)];

    private User NewUser(PersonDef person, UserRole role, string passwordHash, DateTime createdAtUtc)
    {
        var user = new User
        {
            FullName = person.Name,
            Email = person.Email,
            PhoneNumber = person.Phone,
            PasswordHash = passwordHash,
            Role = role,
            Status = UserStatus.Active,
            DateOfBirth = person.DateOfBirth,
            Gender = person.Gender,
            AvatarUrl = person.AvatarUrl,
            CreatedAtUtc = createdAtUtc,
        };
        _db.Users.Add(user);
        return user;
    }

    private void AddStaff(PersonDef person, string passwordHash, string specialty, DayOfWeek offDay, DateOnly hireDate, DateOnly? resignedOn,
        Guid[] skills)
    {
        var user = NewUser(person, UserRole.Staff, passwordHash, Utc(hireDate, new TimeOnly(8, 0)));
        var staff = new StaffMember { Id = user.Id, HireDate = hireDate, Specialty = specialty };
        if (resignedOn is { } date)
        {
            staff.Resign(date);
            user.Status = UserStatus.Inactive;
        }
        _db.StaffMembers.Add(staff);
        foreach (var serviceId in skills.Distinct())
            _db.StaffSkills.Add(new StaffSkill { StaffMemberId = user.Id, SpaServiceId = serviceId });
        _staff.Add(new StaffInfo(user.Id, person.Name, offDay, hireDate, resignedOn, [.. skills]));
    }

    private void AddCustomer(PersonDef person, string passwordHash, DateOnly joinedOn, bool locked, string? note)
    {
        var user = NewUser(person, UserRole.Customer, passwordHash, Utc(joinedOn, new TimeOnly(19, 30)));
        if (locked)
            user.Status = UserStatus.Locked;
        _db.Customers.Add(new Customer { Id = user.Id, Note = note });
        _customers.Add(new CustomerInfo(user.Id, person.Name, joinedOn));
        _skinTypes[user.Id] = (SkinType)_rng.Next(5);
    }

    private StaffInfo MainStaff => _staff[0];
    private StaffInfo Hoa => _staff[1];
    private CustomerInfo MainCustomerInfo => _customers[0];

    // ---------------------------------------------------------------- shifts

    private IEnumerable<(TimeOnly Start, TimeOnly End)> Shifts(StaffInfo staff, DateOnly day)
    {
        if (day < _scheduleStart || day > _scheduleEnd || day < staff.HireDate || day.DayOfWeek == staff.OffDay)
            yield break;
        if (staff.ResignedOn is { } resigned && day >= resigned)
            yield break;
        yield return (new TimeOnly(8, 0), new TimeOnly(12, 0));
        yield return (new TimeOnly(13, 0), new TimeOnly(18, 0));
    }

    private void AddWorkSchedules()
    {
        foreach (var staff in _staff)
        {
            for (var day = _scheduleStart; day <= _scheduleEnd; day = day.AddDays(1))
            {
                foreach (var (start, end) in Shifts(staff, day))
                    _db.WorkSchedules.Add(WorkSchedule.Create(staff.Id, day, start, end));
            }
            if (staff.ResignedOn is not null)
                continue;
            // Evening overtime that was called off (cancelled shifts stay in the staff member's calendar, Q-72).
            var cancelled = WorkSchedule.Create(staff.Id, _today.AddDays(5 + _staff.IndexOf(staff)), new TimeOnly(18, 0), new TimeOnly(20, 0));
            cancelled.Cancel();
            _db.WorkSchedules.Add(cancelled);
            Notify(staff.Id, NotificationTemplates.ShiftsBatch(48, _today, _scheduleEnd), null, null, _now.AddDays(-2), force: true);
        }
    }

    private void AddCertifications()
    {
        var reviewedAt = _now.AddDays(-60);
        Certification(MainStaff, "Chứng chỉ Kỹ thuật viên chăm sóc da", "Trường Trung cấp Thẩm mỹ Sài Gòn", "KTV-2021-0458",
            _today.AddYears(-4), null, CertificationVerificationStatus.Verified, reviewedAt);
        Certification(MainStaff, "Chứng nhận Peel da sinh học", "Học viện Thẩm mỹ Quốc tế", "PEEL-2024-112",
            _today.AddYears(-2), _today.AddDays(20), CertificationVerificationStatus.Verified, reviewedAt);
        Certification(MainStaff, "Chứng chỉ Spa Therapist", "Hiệp hội Spa Việt Nam", "SPA-2026-031",
            _today.AddDays(-20), _today.AddYears(3), CertificationVerificationStatus.Pending, null);
        Certification(Hoa, "Chứng chỉ Massage trị liệu", "Trường Cao đẳng Y tế TP.HCM", "MSG-2020-207",
            _today.AddYears(-5), null, CertificationVerificationStatus.Verified, reviewedAt);
        Certification(Hoa, "Chứng nhận Gội đầu dưỡng sinh", "Trung tâm Đào tạo Spa Hoa Sen", null,
            _today.AddMonths(-3), null, CertificationVerificationStatus.Rejected, _now.AddDays(-10));
        Certification(_staff[2], "Chứng chỉ Triệt lông công nghệ cao", "Học viện Thẩm mỹ Quốc tế", "TL-2023-090",
            _today.AddYears(-3), _today.AddDays(-30), CertificationVerificationStatus.Verified, _now.AddDays(-300));
        Certification(_staff[2], "Chứng chỉ Nail cơ bản", "Trung tâm Đào tạo Nail Sài Gòn", "NAIL-2022-561",
            _today.AddYears(-2), null, CertificationVerificationStatus.Verified, reviewedAt);
        Certification(_staff[3], "Chứng chỉ Chăm sóc da cơ bản", "Trường Trung cấp Thẩm mỹ Sài Gòn", "KTV-2025-873",
            _today.AddMonths(-8), null, CertificationVerificationStatus.Pending, null);
    }

    private void Certification(StaffInfo staff, string name, string issuer, string? number, DateOnly issuedOn, DateOnly? expiresOn,
        CertificationVerificationStatus status, DateTime? reviewedAtUtc)
    {
        var certification = new StaffCertification { StaffMemberId = staff.Id, CreatedAtUtc = (reviewedAtUtc ?? _now).AddDays(-2) };
        certification.Describe(name, issuer, number, issuedOn, expiresOn, true, null);
        if (status == CertificationVerificationStatus.Verified)
            certification.Verify(_ownerId, reviewedAtUtc!.Value);
        else if (status == CertificationVerificationStatus.Rejected)
            certification.Reject("Ảnh chứng chỉ bị mờ, không đọc được số hiệu. Vui lòng tải lại ảnh rõ hơn.", _ownerId, reviewedAtUtc!.Value);
        _db.StaffCertifications.Add(certification);
    }

    private void AddPromotions()
    {
        var monthStart = new DateOnly(_today.Year, _today.Month, 1);
        Promotion("CHAOBANMOI", "Giảm 10% cho đơn đầu tiên, tối đa 200.000 đ.", DiscountType.Percentage, 10, 0, 200_000,
            _today.AddDays(-HistoryMonths * 31), _today.AddDays(180), perCustomer: 1, usage: null, PromotionStatus.Active);
        Promotion("GIAM50K", "Giảm 50.000 đ cho đơn từ 500.000 đ.", DiscountType.FixedAmount, 50_000, 500_000, null,
            _today.AddDays(-200), _today.AddDays(60), perCustomer: 3, usage: null, PromotionStatus.Active);
        Promotion($"THANG{_today.Month}", $"Ưu đãi tháng {_today.Month}: giảm 15% cho đơn từ 1.000.000 đ, tối đa 300.000 đ.",
            DiscountType.Percentage, 15, 1_000_000, 300_000, monthStart, monthStart.AddMonths(1), perCustomer: 1, usage: 100,
            PromotionStatus.Active);
        Promotion("HE2026", "Chào hè: giảm 20%, tối đa 250.000 đ (đã dừng sớm).", DiscountType.Percentage, 20, 0, 250_000,
            _today.AddDays(-150), _today.AddDays(30), perCustomer: 1, usage: 200, PromotionStatus.Stopped);
        Promotion("TETXUAN", "Tết sum vầy: giảm 100.000 đ cho đơn từ 800.000 đ.", DiscountType.FixedAmount, 100_000, 800_000, null,
            _today.AddDays(-300), _today.AddDays(-260), perCustomer: 2, usage: null, PromotionStatus.Active);
        Promotion("TETRANGRO", "Đón Tết rạng rỡ: giảm 20%, tối đa 300.000 đ (sắp diễn ra).", DiscountType.Percentage, 20, 0, 300_000,
            _today.AddDays(45), _today.AddDays(100), perCustomer: 1, usage: 150, PromotionStatus.Active);
    }

    private void Promotion(string code, string description, DiscountType type, decimal value, decimal minOrder, decimal? maxDiscount,
        DateOnly start, DateOnly end, int? perCustomer, int? usage, PromotionStatus status)
    {
        var promotion = new Promotion
        {
            Code = code,
            Description = description,
            DiscountType = type,
            DiscountValue = value,
            MinOrderAmount = minOrder,
            MaxDiscountAmount = maxDiscount,
            StartsAtUtc = Utc(start, TimeOnly.MinValue),
            EndsAtUtc = Utc(end, TimeOnly.MinValue),
            PerCustomerLimit = perCustomer,
            UsageLimit = usage,
            Status = status,
        };
        _db.Promotions.Add(promotion);
        _promotions.Add(promotion);
    }

    // ---------------------------------------------------------------- the main customer (customer@gmail.com)

    private void AddMainCustomerStory()
    {
        var me = MainCustomerInfo;
        var welcome = Utc(me.JoinedOn, new TimeOnly(19, 35));
        Notify(me.Id, new NotificationContent(NotificationType.System, "Chào mừng bạn đến với Spa Như Nguyệt",
            "Tài khoản của bạn đã được tạo. Khám phá các dịch vụ chăm sóc da và thư giãn ngay hôm nay."), null, null, welcome, force: true);
        _db.CustomerAllergies.Add(new CustomerAllergy
        {
            CustomerId = me.Id, Allergen = "Cồn (alcohol)", Severity = AllergySeverity.Moderate,
            Note = "Đỏ rát khi dùng toner có cồn.", RecordedAtUtc = _now.AddDays(-58),
        });
        _db.CustomerAllergies.Add(new CustomerAllergy
        {
            CustomerId = me.Id, Allergen = "Tinh dầu bạc hà", Severity = AllergySeverity.Mild, Note = "Hơi ngứa nhẹ.",
            RecordedAtUtc = _now.AddDays(-33),
        });
        _skinTypes[me.Id] = SkinType.Combination;

        // F: an old massage, a no-show, then the entitlement expired.
        var (orderF, paidF) = PaidOrder(me, At(-100, 18, 10), [new Product(_services[CatalogSeedIds.MassageFoot], null)], null);
        var footRight = Entitlement(me, orderF.Items.First());
        footRight.ExpiresAtUtc = paidF.AddDays(90);
        footRight.Status = EntitlementStatus.Expired;
        if (Visit(me, _services[CatalogSeedIds.MassageFoot], _today.AddDays(-95), AppointmentStatus.NoShow, paidF, Hoa) is { } noShow)
        {
            noShow.Appointment.ServiceEntitlementId = footRight.Id;
            noShow.Appointment.Note = "Khách không đến, gọi điện không liên lạc được.";
        }

        // I: deep cleansing, done and reviewed (3 stars, the spa replied).
        var deepClean = _services[CatalogSeedIds.FaceDeepClean];
        var (orderI, paidI) = PaidOrder(me, At(-75, 20, 5), [new Product(deepClean, null)], null);
        var deepRight = Entitlement(me, orderI.Items.First());
        if (Visit(me, deepClean, _today.AddDays(-70), AppointmentStatus.Completed, paidI, MainStaff) is { } cleaned)
        {
            deepRight.Status = EntitlementStatus.Used;
            cleaned.Appointment.ServiceEntitlementId = deepRight.Id;
            Completed(cleaned.Appointment, me, deepClean, false, "Da hỗn hợp, nhiều mụn đầu đen vùng mũi.", skinProfile: true);
            AddReview(me, deepClean.Id, null, deepClean.Name, EndUtc(cleaned.Appointment), 3,
                "Da sạch hơn nhưng phải chờ khoảng 15 phút dù đã đặt lịch.", OwnerReplies[2], image: null);
        }

        // A: the acne package with the first-order promotion; sessions 1–3 done, session 4 booked, session 5 left.
        var acne = _packages[CatalogSeedIds.PackageAcne];
        var welcomePromotion = _promotions.Single(promotion => promotion.Code == "CHAOBANMOI");
        var (orderA, paidA) = PaidOrder(me, At(-62, 10, 15), [new Product(null, acne)], welcomePromotion);
        var acneVisit = PackageJourney(me, orderA.Items.First(), acne, paidA, MainStaff, scripted: true, stopAfter: 3);
        if (acneVisit is not null)
        {
            var acneService = _services[CatalogSeedIds.TreatmentAcne];
            AddReview(me, acneService.Id, null, acneService.Name, EndUtc(acneVisit), 4,
                "Mụn viêm giảm rõ sau 3 buổi, chị Thư tư vấn rất kỹ. Mong spa có thêm khung giờ tối.", null, ReviewPhotos[0]);
        }

        // B: hot stone massage (done, 5 stars with a photo) and hydrating facial (booked for tomorrow or soon after).
        var hotStone = _services[CatalogSeedIds.MassageHotStone];
        var hydrate = _services[CatalogSeedIds.FaceHydrate];
        var (orderB, paidB) = PaidOrder(me, At(-36, 12, 40), [new Product(hotStone, null), new Product(hydrate, null)], null);
        var stoneRight = Entitlement(me, orderB.Items.First(item => item.SpaServiceId == hotStone.Id));
        if (Visit(me, hotStone, _today.AddDays(-33), AppointmentStatus.Completed, paidB, Hoa) is { } stone)
        {
            stoneRight.Status = EntitlementStatus.Used;
            stone.Appointment.ServiceEntitlementId = stoneRight.Id;
            Completed(stone.Appointment, me, hotStone, false, "Cơ vai gáy căng nhiều, đã tập trung massage vùng này.", skinProfile: false);
            AddReview(me, hotStone.Id, null, hotStone.Name, EndUtc(stone.Appointment), 5,
                "Massage đá nóng tuyệt vời, chị Hoa làm rất có tâm. Ngủ một giấc ngon lành!", OwnerReplies[0], ReviewPhotos[1]);
        }
        var hydrateRight = Entitlement(me, orderB.Items.First(item => item.SpaServiceId == hydrate.Id));
        if (Visit(me, hydrate, _today.AddDays(1), AppointmentStatus.Confirmed, _now.AddDays(-2), MainStaff) is { } upcoming)
        {
            hydrateRight.Status = EntitlementStatus.Booked;
            upcoming.Appointment.ServiceEntitlementId = hydrateRight.Id;
            Booked(upcoming.Appointment, me, upcoming.Staff, hydrate, false, force: true);
        }

        // C: the relax package, finished; reviewed (5 stars) and replied.
        var relax = _packages[CatalogSeedIds.PackageRelax];
        var (orderC, paidC) = PaidOrder(me, At(-24, 9, 30), [new Product(null, relax)], null);
        PackageJourney(me, orderC.Items.First(), relax, paidC, Hoa, scripted: true);

        // D: two services bought and not booked yet.
        PaidOrder(me, At(-9, 21, 0),
            [new Product(_services[CatalogSeedIds.FacePearl], null), new Product(_services[CatalogSeedIds.MassageNeck], null)], null,
            issue: line => Entitlement(me, line));

        // E: herbal hair wash, booked then cancelled by the customer; the entitlement is available again.
        var hairWash = _services[CatalogSeedIds.HairHerbal];
        var (orderE, paidE) = PaidOrder(me, At(-6, 13, 20), [new Product(hairWash, null)], null);
        var hairRight = Entitlement(me, orderE.Items.First());
        if (Visit(me, hairWash, _today.AddDays(2), AppointmentStatus.Cancelled, paidE, Hoa) is { } cancelled)
        {
            cancelled.Appointment.ServiceEntitlementId = hairRight.Id;
            cancelled.Appointment.CreatedAtUtc = paidE.AddMinutes(20);
            CancelledByCustomer(cancelled.Appointment, me, cancelled.Staff, hairWash, false, _now.AddDays(-4), CancellationReasons[0]);
        }

        // G: an order the customer cancelled; H: a book-now order whose payment expired with its held slot.
        var waxUnderarm = _services[CatalogSeedIds.WaxUnderarm];
        NewOrder(me, At(-8, 11, 0), [new Product(waxUnderarm, null)], null, OrderStatus.Cancelled);
        var whitening = _services[CatalogSeedIds.BodyWhitening];
        var expired = NewOrder(me, At(-3, 16, 45), [new Product(whitening, null)], null, OrderStatus.Expired);
        if (Visit(me, whitening, _today.AddDays(1), AppointmentStatus.HoldExpired, expired.CreatedAtUtc, _staff[2], flexDays: 3) is { } hold)
        {
            hold.Appointment.OrderItemId = expired.Items.First().Id;
            hold.Appointment.CreatedAtUtc = expired.CreatedAtUtc;
            hold.Appointment.HoldExpiresAtUtc = expired.PaymentDueAtUtc.AddMinutes(5);
        }

        // Cart, AI chat, a promotion notice.
        var cart = new Cart { CustomerId = me.Id, CreatedAtUtc = _now.AddDays(-1), UpdatedAtUtc = _now.AddHours(-3) };
        _db.Carts.Add(cart);
        _db.CartItems.Add(new CartItem
        {
            CartId = cart.Id, SpaServiceId = CatalogSeedIds.FaceLift, UnitPrice = _services[CatalogSeedIds.FaceLift].Price, AddedAtUtc = _now.AddDays(-1),
        });
        _db.CartItems.Add(new CartItem
        {
            CartId = cart.Id, ServicePackageId = CatalogSeedIds.PackageHydrate, UnitPrice = _packages[CatalogSeedIds.PackageHydrate].Price,
            AddedAtUtc = _now.AddHours(-3),
        });
        for (var i = 0; i < AiChats.Length; i++)
        {
            _db.AiChatMessages.Add(new AiChatMessage
            {
                CustomerId = me.Id, Question = AiChats[i].Question, Answer = AiChats[i].Answer, CreatedAtUtc = _now.AddDays(-12 + i * 3).AddMinutes(i),
            });
        }
        Notify(me.Id, new NotificationContent(NotificationType.Promotion, $"Ưu đãi tháng {_today.Month}",
            $"Nhập mã THANG{_today.Month} để được giảm 15% cho đơn từ 1.000.000 đ, tối đa 300.000 đ."), null, null, _now.AddDays(-1), force: true);
    }

    /// <summary>staff@gmail.com: appointments today (one done earlier when the clock allows) and in the next days.</summary>
    private void AddMainStaffToday()
    {
        var others = _customers.Skip(1).Where((_, index) => index != LockedCustomerIndex).ToList();
        (Guid ServiceId, AppointmentStatus Status, int Offset)[] plan =
        [
            (CatalogSeedIds.FaceLift, AppointmentStatus.Completed, 0),
            (CatalogSeedIds.TreatmentPeel, AppointmentStatus.Confirmed, 0),
            (CatalogSeedIds.FaceDeepClean, AppointmentStatus.Confirmed, 0),
            (CatalogSeedIds.TreatmentAcne, AppointmentStatus.Confirmed, 1),
            (CatalogSeedIds.FacePearl, AppointmentStatus.PendingConfirmation, 2),
        ];
        for (var i = 0; i < plan.Length; i++)
        {
            var customer = others[i];
            var service = _services[plan[i].ServiceId];
            var (order, paidAt) = PaidOrder(customer, _now.AddDays(-3 - i).AddHours(-2), [new Product(service, null)], null);
            var right = Entitlement(customer, order.Items.First());
            if (Visit(customer, service, _today.AddDays(plan[i].Offset), plan[i].Status, paidAt, MainStaff, flexDays: 0) is not { } visit)
                continue;
            visit.Appointment.ServiceEntitlementId = right.Id;
            if (plan[i].Status == AppointmentStatus.Completed)
            {
                right.Status = EntitlementStatus.Used;
                Completed(visit.Appointment, customer, service, false, null, skinProfile: true);
            }
            else
            {
                right.Status = EntitlementStatus.Booked;
                Booked(visit.Appointment, customer, visit.Staff, service, false, force: true);
            }
        }
    }

    // ---------------------------------------------------------------- history of the other customers

    private void AddHistory()
    {
        var customers = _customers.Skip(1).ToList();
        var firstMonth = new DateOnly(_today.Year, _today.Month, 1).AddMonths(-(HistoryMonths - 1));
        for (var month = 0; month < HistoryMonths; month++)
        {
            var monthStart = firstMonth.AddMonths(month);
            var daysInMonth = DateTime.DaysInMonth(monthStart.Year, monthStart.Month);
            var lastDay = month == HistoryMonths - 1 ? _today.Day : daysInMonth;
            // Revenue grows over the year, with a bump around Tết (January/February).
            var seasonal = monthStart.Month is 1 or 2 ? 6 : monthStart.Month == 12 ? 4 : 0;
            var count = (int)Math.Round((10 + month * 0.9 + seasonal + _rng.Next(0, 6)) * lastDay / daysInMonth);
            for (var n = 0; n < count; n++)
            {
                var day = monthStart.AddDays(_rng.Next(lastDay));
                var createdAt = Utc(day, new TimeOnly(_rng.Next(8, 22), _rng.Next(60)));
                if (createdAt > _now.AddHours(-1))
                    continue;
                var eligible = customers.Where(customer => customer.JoinedOn <= day).ToList();
                if (eligible.Count == 0)
                    continue;
                var customer = eligible[_rng.Next(eligible.Count)];
                var products = PickProducts(day);
                var roll = _rng.NextDouble();
                if (roll < 0.06)
                {
                    NewOrder(customer, createdAt, products, null, OrderStatus.Cancelled);
                    continue;
                }
                if (roll < 0.13)
                {
                    NewOrder(customer, createdAt, products, null, OrderStatus.Expired);
                    continue;
                }
                var promotion = _rng.NextDouble() < 0.3 ? PickPromotion(customer, createdAt, products.Sum(product => product.Price)) : null;
                var (order, paidAt) = PaidOrder(customer, createdAt, products, promotion);
                foreach (var line in order.Items)
                {
                    if (line.SpaServiceId is { } serviceId)
                        ServiceJourney(customer, line, _services[serviceId], paidAt);
                    else
                        PackageJourney(customer, line, _packages[line.ServicePackageId!.Value], paidAt, null, scripted: false);
                }
            }
        }
        AddUnrecognizedPayment(customers[_rng.Next(customers.Count)]);
    }

    private List<Product> PickProducts(DateOnly day)
    {
        var age = _today.DayNumber - day.DayNumber;
        var services = _services.Values.Where(service => service.Status == CatalogStatus.OnSale || age > 120).ToList();
        var packages = _packages.Values
            .Where(package => (package.Status == CatalogStatus.OnSale || age > 120)
                && (package.SaleStartDate is null || package.SaleStartDate <= day) && (package.SaleEndDate is null || package.SaleEndDate >= day))
            .ToList();
        var roll = _rng.NextDouble();
        if (roll < 0.2 && packages.Count > 0)
            return [new Product(null, packages[_rng.Next(packages.Count)])];
        var first = services[_rng.Next(services.Count)];
        if (roll < 0.35)
        {
            var second = services.Where(service => service.Id != first.Id).ElementAt(_rng.Next(services.Count - 1));
            return [new Product(first, null), new Product(second, null)];
        }
        return [new Product(first, null)];
    }

    private Promotion? PickPromotion(CustomerInfo customer, DateTime atUtc, decimal subtotal)
    {
        var stoppedOn = _now.AddDays(-30);
        var candidates = _promotions
            .Where(promotion => promotion.StartsAtUtc <= atUtc && atUtc < promotion.EndsAtUtc && subtotal >= promotion.MinOrderAmount)
            .Where(promotion => promotion.Status == PromotionStatus.Active || atUtc < stoppedOn)
            .Where(promotion => promotion.PerCustomerLimit != 1 || !_promotionUsed.Contains((customer.Id, promotion.Id)))
            .ToList();
        return candidates.Count == 0 ? null : candidates[_rng.Next(candidates.Count)];
    }

    /// <summary>A bought service: used, missed, cancelled, booked ahead or still waiting to be booked.</summary>
    private void ServiceJourney(CustomerInfo customer, OrderItem line, SpaService service, DateTime paidAt)
    {
        var right = Entitlement(customer, line);
        if (_rng.NextDouble() < 0.08)
            return;
        var bookNow = _rng.NextDouble() < 0.25;
        var target = SpaTime.Today(paidAt).AddDays(_rng.Next(1, 22));
        if (target < _today)
        {
            var roll = _rng.NextDouble();
            var status = roll < 0.84 ? AppointmentStatus.Completed : roll < 0.92 ? AppointmentStatus.NoShow : AppointmentStatus.Cancelled;
            if (Visit(customer, service, target, status, paidAt) is not { } visit)
                return;
            visit.Appointment.ServiceEntitlementId = right.Id;
            if (bookNow)
                visit.Appointment.OrderItemId = line.Id;
            switch (status)
            {
                case AppointmentStatus.Completed:
                    right.Status = EntitlementStatus.Used;
                    Completed(visit.Appointment, customer, service, false, null, skinProfile: null);
                    if (_rng.NextDouble() < 0.45)
                        AddReview(customer, service.Id, null, service.Name, EndUtc(visit.Appointment));
                    break;
                case AppointmentStatus.NoShow:
                    visit.Appointment.Note = "Khách không đến, không liên lạc được.";
                    break;
                default:
                    var cancelledAt = Utc(visit.Appointment.Date, visit.Appointment.StartTime).AddHours(-_rng.Next(26, 72));
                    if (cancelledAt < visit.Appointment.CreatedAtUtc)
                        cancelledAt = visit.Appointment.CreatedAtUtc.AddMinutes(30);
                    CancelledByCustomer(visit.Appointment, customer, visit.Staff, service, false, cancelledAt,
                        CancellationReasons[_rng.Next(CancellationReasons.Length)]);
                    break;
            }
            return;
        }
        if (target > _today.AddDays(14))
            target = _today.AddDays(_rng.Next(1, 15));
        var future = _rng.NextDouble() < 0.1 ? AppointmentStatus.PendingConfirmation : AppointmentStatus.Confirmed;
        if (Visit(customer, service, target, future, paidAt) is not { } booked)
            return;
        right.Status = EntitlementStatus.Booked;
        booked.Appointment.ServiceEntitlementId = right.Id;
        if (bookNow)
            booked.Appointment.OrderItemId = line.Id;
        Booked(booked.Appointment, customer, booked.Staff, service, false, force: false);
    }

    /// <summary>A bought package: plan, ordered sessions, completed visits, the next booked session and sometimes a pause or cancel.</summary>
    /// <returns>The last completed visit, if any.</returns>
    private Appointment? PackageJourney(CustomerInfo customer, OrderItem line, ServicePackage package, DateTime paidAt, StaffInfo? primary,
        bool scripted, int? stopAfter = null)
    {
        var steps = package.Items.OrderBy(item => item.SortOrder)
            .SelectMany(item => Enumerable.Repeat(item, item.SessionCount)).ToList();
        var paidDay = SpaTime.Today(paidAt);
        var expiresAt = paidAt.AddDays(package.ValidityDays);
        primary ??= _staff
            .Where(staff => staff.HireDate <= paidDay && (staff.ResignedOn is null || staff.ResignedOn > paidDay))
            .OrderByDescending(staff => steps.Count(step => staff.Skills.Contains(step.SpaServiceId)))
            .ThenBy(_ => _rng.Next())
            .First();
        var customerPackage = new CustomerPackage
        {
            CustomerId = customer.Id,
            OrderItemId = line.Id,
            PackageName = package.Name,
            PurchasedAtUtc = paidAt,
            ActivatedAtUtc = paidAt,
            ExpiresAtUtc = expiresAt,
            TotalSessions = steps.Count,
            Status = CustomerPackageStatus.Active,
        };
        var plan = new TreatmentPlan
        {
            CustomerPackageId = customerPackage.Id,
            PrimaryStaffMemberId = primary.Id,
            Goal = PlanGoals.GetValueOrDefault(package.Id, "Chăm sóc da theo liệu trình."),
            ExpectedEndDate = paidDay.AddDays(Math.Min(package.ValidityDays, steps.Sum(step => Math.Max(step.MinDaysBetweenSessions, 5)) + 14)),
            Status = TreatmentPlanStatus.NotStarted,
            Note = scripted ? "Khách da hỗn hợp, dị ứng cồn: dùng sản phẩm không cồn." : null,
        };
        var sessions = steps.Select((step, index) => new TreatmentSession
        {
            TreatmentPlanId = plan.Id,
            SpaServiceId = step.SpaServiceId,
            SequenceNumber = index + 1,
            ServiceName = _services[step.SpaServiceId].Name,
            DurationMinutes = _services[step.SpaServiceId].DurationMinutes,
            Status = TreatmentSessionStatus.NotBooked,
        }).ToList();
        foreach (var session in sessions)
            plan.Sessions.Add(session);
        _db.CustomerPackages.Add(customerPackage);
        _db.TreatmentPlans.Add(plan);

        var pauseAfter = !scripted && _rng.NextDouble() < 0.07 ? _rng.Next(1, steps.Count) : -1;
        var cancelAfter = !scripted && pauseAfter < 0 && _rng.NextDouble() < 0.04 ? _rng.Next(1, steps.Count) : -1;
        var used = 0;
        var hasBooked = false;
        var previous = paidDay;
        var notBefore = paidAt;
        DateOnly? first = null;
        Appointment? last = null;
        for (var i = 0; i < steps.Count; i++)
        {
            var service = _services[steps[i].SpaServiceId];
            var gap = i == 0 ? _rng.Next(1, 6) : Math.Max(steps[i].MinDaysBetweenSessions, 3) + _rng.Next(0, 4);
            var date = previous.AddDays(gap);
            if (Utc(date, new TimeOnly(18, 0)) > expiresAt)
                break;
            if (stopAfter == used && date < _today.AddDays(3))
                date = _today.AddDays(3);
            if (date < _today)
            {
                if (Visit(customer, service, date, AppointmentStatus.Completed, notBefore, primary, flexDays: 2) is not { } visit)
                    break;
                visit.Appointment.TreatmentSessionId = sessions[i].Id;
                sessions[i].Status = TreatmentSessionStatus.Completed;
                sessions[i].CompletedAtUtc = EndUtc(visit.Appointment);
                sessions[i].Note = SessionNotes[_rng.Next(SessionNotes.Length)];
                Completed(visit.Appointment, customer, service, true, null, skinProfile: scripted ? true : null);
                used++;
                first ??= visit.Appointment.Date;
                last = visit.Appointment;
                previous = visit.Appointment.Date;
                notBefore = EndUtc(visit.Appointment);
                if (i + 1 == pauseAfter || i + 1 == cancelAfter)
                    break;
                continue;
            }
            if (date <= _today.AddDays(21)
                && Visit(customer, service, date, AppointmentStatus.Confirmed, _now.AddDays(-_rng.Next(1, 4)), primary, flexDays: 4) is { } next)
            {
                next.Appointment.TreatmentSessionId = sessions[i].Id;
                sessions[i].Status = TreatmentSessionStatus.Booked;
                Booked(next.Appointment, customer, next.Staff, service, true, force: scripted);
                hasBooked = true;
            }
            break;
        }

        customerPackage.UsedSessions = used;
        plan.StartDate = first;
        if (used == steps.Count)
        {
            customerPackage.Status = CustomerPackageStatus.Completed;
            plan.Status = TreatmentPlanStatus.Completed;
            plan.ActualEndDate = last!.Date;
            if (scripted || _rng.NextDouble() < 0.55)
            {
                AddReview(customer, null, package.Id, package.Name, EndUtc(last), scripted ? 5 : null,
                    scripted ? "Gói thư giãn rất đáng tiền, ba buổi đều được chăm sóc chu đáo. Sẽ mua tiếp gói này!" : null,
                    scripted ? OwnerReplies[1] : null, scripted ? ReviewPhotos[3] : null);
            }
            return last;
        }
        plan.Status = used > 0 ? TreatmentPlanStatus.InProgress : TreatmentPlanStatus.NotStarted;
        if (!hasBooked && used > 0 && pauseAfter == used)
        {
            plan.Pause("Khách đi công tác dài ngày, xin tạm dừng liệu trình.");
            Notify(customer.Id, NotificationTemplates.TreatmentStatus(package.Name, TreatmentPlanStatus.Paused, plan.StatusReason),
                NotificationReferenceType.TreatmentPlan, plan.Id, notBefore.AddDays(2));
        }
        else if (!hasBooked && used > 0 && cancelAfter == used)
        {
            plan.Cancel("Khách chuyển nơi ở, không tiếp tục liệu trình.");
            customerPackage.Cancel();
            Notify(customer.Id, NotificationTemplates.TreatmentStatus(package.Name, TreatmentPlanStatus.Cancelled, plan.StatusReason),
                NotificationReferenceType.TreatmentPlan, plan.Id, notBefore.AddDays(3));
        }
        else if (expiresAt < _now)
        {
            customerPackage.Status = CustomerPackageStatus.Expired;
        }
        if (!scripted && last is not null && _rng.NextDouble() < 0.3)
            AddReview(customer, null, package.Id, package.Name, EndUtc(last));
        return last;
    }

    /// <summary>A success that arrived after the customer cancelled the order: reported apart for a manual refund (Q-20).</summary>
    private void AddUnrecognizedPayment(CustomerInfo customer)
    {
        var order = NewOrder(customer, _now.AddDays(-12), [new Product(_services[CatalogSeedIds.MassageOil], null)], null, OrderStatus.Cancelled);
        order.Payments.Add(new Payment
        {
            OrderId = order.Id,
            Provider = "vnpay",
            Amount = order.GrandTotal,
            Status = PaymentStatus.Succeeded,
            RequestCode = OrderCodeGenerator.PaymentRequestCode(order.Code, 1),
            ProviderTransactionId = TransactionId(),
            ExpiresAtUtc = order.PaymentDueAtUtc,
            PaidAtUtc = order.CreatedAtUtc.AddMinutes(14),
            CreatedAtUtc = order.CreatedAtUtc.AddMinutes(1),
            UpdatedAtUtc = order.CreatedAtUtc.AddMinutes(14),
        });
    }

    // ---------------------------------------------------------------- tokens, OTP codes, extra chats

    private void AddAccountExtras()
    {
        var me = MainCustomerInfo;
        _db.OtpCodes.Add(new OtpCode
        {
            Email = MainCustomer.Email, Purpose = OtpPurpose.Registration, CodeHash = _passwordHasher.Hash("482913"),
            ExpiresAtUtc = Utc(me.JoinedOn, new TimeOnly(19, 40)), UsedAtUtc = Utc(me.JoinedOn, new TimeOnly(19, 31)),
            CreatedAtUtc = Utc(me.JoinedOn, new TimeOnly(19, 30)),
        });
        _db.OtpCodes.Add(new OtpCode
        {
            Email = OtherCustomers[1].Email, Purpose = OtpPurpose.PasswordReset, CodeHash = _passwordHasher.Hash("905172"), FailedAttempts = 2,
            ExpiresAtUtc = _now.AddDays(-5).AddMinutes(10), CreatedAtUtc = _now.AddDays(-5),
        });
        foreach (var userId in new[] { me.Id, MainStaff.Id, _ownerId })
        {
            _db.RefreshTokens.Add(new RefreshToken
            {
                UserId = userId, TokenHash = Convert.ToHexString(SHA256.HashData(RandomNumberGenerator.GetBytes(32))),
                CreatedAtUtc = _now.AddDays(-20), ExpiresAtUtc = _now.AddDays(-13), RevokedAtUtc = _now.AddDays(-19),
            });
        }
        var other = _customers[2];
        _db.AiChatMessages.Add(new AiChatMessage
        {
            CustomerId = other.Id, Question = "Spa mở cửa đến mấy giờ?",
            Answer = "Spa Như Nguyệt mở cửa từ 08:00 đến 18:00, từ Thứ Hai đến Chủ nhật.", CreatedAtUtc = _now.AddDays(-7),
        });
        _db.AiChatMessages.Add(new AiChatMessage
        {
            CustomerId = other.Id, Question = "Mình bị nổi mẩn đỏ ngứa khắp mặt, có phải dị ứng không?",
            Answer = "Mình không thể chẩn đoán tình trạng da. Nếu mẩn đỏ, ngứa kéo dài hoặc lan rộng, bạn nên gặp bác sĩ da liễu sớm. Khi da ổn định, spa có thể tư vấn dịch vụ chăm sóc dịu nhẹ.",
            CreatedAtUtc = _now.AddDays(-7).AddMinutes(2),
        });
    }

    // ---------------------------------------------------------------- orders

    private (Order Order, DateTime PaidAtUtc) PaidOrder(CustomerInfo customer, DateTime createdAtUtc, IReadOnlyList<Product> products,
        Promotion? promotion, Action<OrderItem>? issue = null)
    {
        var order = NewOrder(customer, createdAtUtc, products, promotion, OrderStatus.Paid);
        var paidAt = order.Payments.Single(payment => payment.Status == PaymentStatus.Succeeded).PaidAtUtc!.Value;
        if (issue is not null)
        {
            foreach (var line in order.Items)
                issue(line);
        }
        if (customer.Id == MainCustomerInfo.Id || paidAt > _now.AddDays(-45))
        {
            Notify(customer.Id, NotificationTemplates.OrderPaid(order.Code, order.GrandTotal, null, null, null, false),
                NotificationReferenceType.Order, order.Id, paidAt, force: customer.Id == MainCustomerInfo.Id);
        }
        return (order, paidAt);
    }

    private Order NewOrder(CustomerInfo customer, DateTime createdAtUtc, IReadOnlyList<Product> products, Promotion? promotion, OrderStatus status)
    {
        var subtotal = products.Sum(product => product.Price);
        if (promotion is not null && subtotal < promotion.MinOrderAmount)
            promotion = null;
        var discount = promotion is null
            ? 0
            : DiscountCalculator.CalculateTotal(promotion.DiscountType, promotion.DiscountValue, promotion.MaxDiscountAmount, subtotal);
        var shares = DiscountCalculator.Allocate(discount, [.. products.Select(product => product.Price)]);
        string code;
        do
            code = OrderCodeGenerator.NewOrderCode(createdAtUtc);
        while (!_orderCodes.Add(code));

        var order = new Order
        {
            Code = code,
            CustomerId = customer.Id,
            Subtotal = subtotal,
            DiscountTotal = discount,
            GrandTotal = subtotal - discount,
            Status = status,
            PaymentDueAtUtc = createdAtUtc.AddMinutes(15),
            IdempotencyKey = Guid.NewGuid(),
            CreatedAtUtc = createdAtUtc,
            CreatedBy = customer.Id,
        };
        for (var i = 0; i < products.Count; i++)
        {
            order.Items.Add(new OrderItem
            {
                OrderId = order.Id,
                SpaServiceId = products[i].Service?.Id,
                ServicePackageId = products[i].Package?.Id,
                ProductName = products[i].Name,
                UnitPrice = products[i].Price,
                DiscountAmount = shares[i],
                LineTotal = products[i].Price - shares[i],
            });
        }
        switch (status)
        {
            case OrderStatus.Paid:
                var attempt = 1;
                if (_rng.NextDouble() < 0.12)
                {
                    order.Payments.Add(NewPayment(order, attempt++, PaymentStatus.Failed, createdAtUtc.AddMinutes(1), null));
                }
                var paidAt = createdAtUtc.AddMinutes(_rng.Next(3, 13));
                order.Payments.Add(NewPayment(order, attempt, PaymentStatus.Succeeded, createdAtUtc.AddMinutes(2), paidAt));
                order.UpdatedAtUtc = paidAt;
                if (discount > 0 && promotion is not null)
                {
                    _db.PromotionRedemptions.Add(new PromotionRedemption
                    {
                        OrderId = order.Id, PromotionId = promotion.Id, PromotionCode = promotion.Code, DiscountAmount = discount, RedeemedAtUtc = paidAt,
                    });
                    _promotionUsed.Add((customer.Id, promotion.Id));
                }
                break;
            case OrderStatus.Expired:
                if (_rng.NextDouble() < 0.6)
                    order.Payments.Add(NewPayment(order, 1, PaymentStatus.Expired, createdAtUtc.AddMinutes(1), null));
                order.UpdatedAtUtc = order.PaymentDueAtUtc.AddMinutes(5);
                break;
            case OrderStatus.Cancelled:
                order.CancelledAtUtc = createdAtUtc.AddMinutes(_rng.Next(3, 14));
                order.CancellationReason = OrderCancellationReasons[_rng.Next(OrderCancellationReasons.Length)];
                order.UpdatedAtUtc = order.CancelledAtUtc;
                order.UpdatedBy = customer.Id;
                break;
        }
        _db.Orders.Add(order);
        return order;
    }

    private Payment NewPayment(Order order, int attempt, PaymentStatus status, DateTime createdAtUtc, DateTime? paidAtUtc) => new()
    {
        OrderId = order.Id,
        Provider = "vnpay",
        Amount = order.GrandTotal,
        Status = status,
        RequestCode = OrderCodeGenerator.PaymentRequestCode(order.Code, attempt),
        ProviderTransactionId = status is PaymentStatus.Succeeded or PaymentStatus.Failed ? TransactionId() : null,
        ExpiresAtUtc = order.PaymentDueAtUtc,
        PaidAtUtc = paidAtUtc,
        CreatedAtUtc = createdAtUtc,
        UpdatedAtUtc = paidAtUtc ?? createdAtUtc.AddMinutes(2),
    };

    private string TransactionId() => _rng.Next(10_000_000, 99_999_999).ToString(System.Globalization.CultureInfo.InvariantCulture);

    private ServiceEntitlement Entitlement(CustomerInfo customer, OrderItem line)
    {
        var right = new ServiceEntitlement { CustomerId = customer.Id, OrderItemId = line.Id, Status = EntitlementStatus.Available };
        _db.ServiceEntitlements.Add(right);
        return right;
    }

    // ---------------------------------------------------------------- appointments

    /// <summary>
    /// Finds a free slot from <paramref name="date"/> on (up to <paramref name="flexDays"/> later) inside a shift of a skilled staff member,
    /// never overlapping that staff member's or the customer's other visits. Past statuses end before now, upcoming ones start after it.
    /// </summary>
    private (Appointment Appointment, StaffInfo Staff)? Visit(CustomerInfo customer, SpaService service, DateOnly date, AppointmentStatus status,
        DateTime notBeforeUtc, StaffInfo? preferred = null, int flexDays = 5)
    {
        var past = status is AppointmentStatus.Completed or AppointmentStatus.NoShow;
        var upcoming = status is AppointmentStatus.Confirmed or AppointmentStatus.PendingConfirmation or AppointmentStatus.Held;
        var occupies = status is not (AppointmentStatus.Cancelled or AppointmentStatus.HoldExpired);
        var minutes = service.DurationMinutes;
        var skilled = _staff.Where(staff => staff.Skills.Contains(service.Id)).ToList();
        if (skilled.Count == 0)
            skilled = [.. _staff];
        for (var offset = 0; offset <= flexDays; offset++)
        {
            var day = date.AddDays(offset);
            if (past && day > _today)
                break;
            var order = skilled.OrderBy(_ => _rng.Next()).ToList();
            if (preferred is not null && order.Remove(preferred))
                order.Insert(0, preferred);
            foreach (var staff in order)
            {
                var starts = Shifts(staff, day)
                    .SelectMany(shift => Enumerable.Range(0, 20)
                        .Select(step => shift.Start.AddMinutes(step * 30))
                        .Where(start => start >= shift.Start && start.ToTimeSpan() + TimeSpan.FromMinutes(minutes) <= shift.End.ToTimeSpan()))
                    .ToList();
                if (starts.Count == 0)
                    continue;
                var rotate = _rng.Next(starts.Count);
                for (var k = 0; k < starts.Count; k++)
                {
                    var start = starts[(rotate + k) % starts.Count];
                    var end = start.AddMinutes(minutes);
                    var startUtc = Utc(day, start);
                    if (startUtc <= notBeforeUtc.AddHours(1))
                        continue;
                    if (past && Utc(day, end) > _now.AddMinutes(-15))
                        continue;
                    if (upcoming && startUtc < _now.AddHours(1))
                        continue;
                    if (!IsFree(staff.Id, day, start, end) || !IsFree(customer.Id, day, start, end))
                        continue;
                    if (occupies)
                    {
                        Take(staff.Id, day, start, end);
                        Take(customer.Id, day, start, end);
                    }
                    var upper = startUtc < _now ? startUtc : _now;
                    var createdAt = notBeforeUtc + (upper - notBeforeUtc) * (0.1 + _rng.NextDouble() * 0.4);
                    var appointment = new Appointment
                    {
                        CustomerId = customer.Id,
                        StaffMemberId = staff.Id,
                        Date = day,
                        StartTime = start,
                        EndTime = end,
                        Status = status,
                        CreatedAtUtc = createdAt < notBeforeUtc ? notBeforeUtc : createdAt,
                    };
                    _db.Appointments.Add(appointment);
                    return (appointment, staff);
                }
            }
        }
        return null;
    }

    private bool IsFree(Guid owner, DateOnly day, TimeOnly start, TimeOnly end) =>
        !_busy.TryGetValue((owner, day), out var taken) || taken.All(slot => slot.End <= start || end <= slot.Start);

    private void Take(Guid owner, DateOnly day, TimeOnly start, TimeOnly end)
    {
        if (!_busy.TryGetValue((owner, day), out var taken))
            _busy[(owner, day)] = taken = [];
        taken.Add((start, end));
    }

    private void Completed(Appointment appointment, CustomerInfo customer, SpaService service, bool packageSession, string? note, bool? skinProfile)
    {
        appointment.Note = note;
        var skinCare = service.CategoryId == CatalogSeedIds.CategoryFace || service.CategoryId == CatalogSeedIds.CategoryTreatment;
        if (skinProfile ?? (skinCare && _rng.NextDouble() < 0.7))
            AddSkinProfile(appointment, customer.Id);
        Notify(customer.Id, NotificationTemplates.Completed(service.Name, appointment.Date, packageSession),
            NotificationReferenceType.Appointment, appointment.Id, EndUtc(appointment).AddMinutes(10));
    }

    private void Booked(Appointment appointment, CustomerInfo customer, StaffInfo staff, SpaService service, bool packageSession, bool force)
    {
        if (appointment.Status == AppointmentStatus.Confirmed)
        {
            Notify(customer.Id, NotificationTemplates.AppointmentConfirmed(service.Name, appointment.Date, appointment.StartTime, staff.Name, packageSession),
                NotificationReferenceType.Appointment, appointment.Id, appointment.CreatedAtUtc, force);
        }
        Notify(staff.Id, NotificationTemplates.NewAppointmentForStaff(service.Name, appointment.Date, appointment.StartTime, customer.Name),
            NotificationReferenceType.Appointment, appointment.Id, appointment.CreatedAtUtc.AddMinutes(1), force);
    }

    private void CancelledByCustomer(Appointment appointment, CustomerInfo customer, StaffInfo staff, SpaService service, bool packageSession,
        DateTime cancelledAtUtc, string reason)
    {
        appointment.CancelledAtUtc = cancelledAtUtc;
        appointment.CancellationReason = reason;
        var content = NotificationTemplates.CancelledByCustomer(service.Name, customer.Name, appointment.Date, appointment.StartTime, packageSession);
        Notify(_ownerId, content, NotificationReferenceType.Appointment, appointment.Id, cancelledAtUtc);
        Notify(staff.Id, content, NotificationReferenceType.Appointment, appointment.Id, cancelledAtUtc);
    }

    private void AddSkinProfile(Appointment appointment, Guid customerId)
    {
        var type = _skinTypes[customerId];
        var assessedAt = EndUtc(appointment).AddMinutes(-5);
        var profile = new SkinProfile
        {
            CustomerId = customerId,
            AssessedByStaffMemberId = appointment.StaffMemberId,
            AppointmentId = appointment.Id,
            AssessedAtUtc = assessedAt,
            CreatedAtUtc = assessedAt,
            CreatedBy = appointment.StaffMemberId,
        };
        profile.Record(type, Pick(Concerns[type]), Pick(CurrentProducts), Pick(CareGoals), Pick(Recommendations), Pick(SkinNotes));
        _db.SkinProfiles.Add(profile);
    }

    // ---------------------------------------------------------------- reviews and notifications

    private void AddReview(CustomerInfo customer, Guid? serviceId, Guid? packageId, string productName, DateTime afterUtc, int? rating = null,
        string? comment = null, string? reply = null, string? image = null)
    {
        if (!_reviewed.Add((customer.Id, serviceId ?? packageId!.Value)))
            return;
        var createdAt = afterUtc.AddHours(_rng.Next(2, 50));
        if (createdAt > _now)
            createdAt = afterUtc.AddMinutes(30) < _now ? afterUtc.AddMinutes(30) : _now;
        rating ??= _rng.NextDouble() switch { < 0.55 => 5, < 0.85 => 4, < 0.95 => 3, < 0.99 => 2, _ => 1 };
        comment ??= _rng.NextDouble() < 0.1 ? null : Pick(ReviewComments[rating.Value]);
        var review = Review.Create(customer.Id, serviceId, packageId, rating.Value, comment);
        review.CreatedAtUtc = createdAt;
        review.CreatedBy = customer.Id;
        image ??= _rng.NextDouble() < 0.15 ? ReviewPhotos[_reviewPhoto++ % ReviewPhotos.Length] : null;
        if (image is not null)
            review.SetImage(image);
        reply ??= _rng.NextDouble() < 0.5 ? OwnerReplies[rating >= 4 ? _rng.Next(2) : 2 + _rng.Next(2)] : null;
        var repliedAt = createdAt.AddHours(_rng.Next(3, 30));
        if (reply is not null && repliedAt < _now)
        {
            review.Reply(reply, repliedAt);
            review.UpdatedAtUtc = repliedAt;
            review.UpdatedBy = _ownerId;
            Notify(customer.Id, NotificationTemplates.ReviewReplied(productName), NotificationReferenceType.Review, review.Id, repliedAt,
                force: customer.Id == MainCustomerInfo.Id);
        }
        if (rating <= 2 && _rng.NextDouble() < 0.4)
            review.Hide();
        _db.Reviews.Add(review);
    }

    /// <summary>Notices older than 45 days are left out unless forced; older ones are mostly read.</summary>
    private void Notify(Guid userId, NotificationContent content, NotificationReferenceType? referenceType, Guid? referenceId, DateTime atUtc,
        bool force = false)
    {
        if (atUtc > _now)
            atUtc = _now.AddMinutes(-1);
        if (!force && atUtc < _now.AddDays(-45))
            return;
        var reference = referenceType is { } type && referenceId is { } id ? new NotificationReference(type, id) : null;
        var notification = Notification.Create(userId, content.Type, content.Title, content.Body, reference, null, atUtc);
        var age = _now - atUtc;
        if (age > TimeSpan.FromDays(14) || (age > TimeSpan.FromDays(2) && _rng.NextDouble() < 0.75))
        {
            var readAt = atUtc.AddHours(_rng.Next(1, 24));
            notification.MarkRead(readAt < _now ? readAt : _now);
        }
        _db.Notifications.Add(notification);
    }

    // ---------------------------------------------------------------- helpers

    private T Pick<T>(IReadOnlyList<T> items) => items[_rng.Next(items.Count)];

    private static DateTime Utc(DateOnly day, TimeOnly time) => SpaTime.ToUtc(day.ToDateTime(time));

    private static DateTime EndUtc(Appointment appointment) => Utc(appointment.Date, appointment.EndTime);

    /// <summary>A Vietnam wall-clock time <paramref name="daysAgo"/> days before today (negative = in the past).</summary>
    private DateTime At(int daysAgo, int hour, int minute) => Utc(_today.AddDays(daysAgo), new TimeOnly(hour, minute));
}

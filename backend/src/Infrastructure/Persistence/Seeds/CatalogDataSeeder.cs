using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Infrastructure.Persistence.Seeds;

/// <summary>
/// Sample catalog for testing UC-SPA-06/07/09 by hand (<c>npm run db:seed:catalog</c>, Development only): 8 categories, 22 services
/// (short descriptions, 3–5 procedure steps for 18 of them) and 9 packages covering every case the screens handle (hidden and empty category, discontinued service and package, missing and
/// broken image, a package not on sale yet, one whose sale ended, one with a discontinued component). Ids are fixed
/// (<see cref="CatalogSeedIds"/>). Each run creates missing rows and resets existing ones to these values; it never deletes, because
/// orders, carts and staff skills may refer to the services. Sale dates are relative to today (Vietnam time).
/// </summary>
public sealed class CatalogDataSeeder
{
    private readonly AppDbContext _context;
    private readonly IDateTimeProvider _clock;
    private readonly ILogger<CatalogDataSeeder> _logger;

    public CatalogDataSeeder(AppDbContext context, IDateTimeProvider clock, ILogger<CatalogDataSeeder> logger)
    {
        _context = context;
        _clock = clock;
        _logger = logger;
    }

    // Q-71: one package (PackageWaxLegs) keeps no short description, to test the empty case.
    private static readonly Dictionary<Guid, string> PackageShortDescriptions = new()
    {
        [CatalogSeedIds.PackageAcne] = "5 buổi làm sạch, trị mụn và làm dịu da.",
        [CatalogSeedIds.PackageHydrate] = "6 buổi cấp ẩm cho làn da khô, thiếu sức sống.",
        [CatalogSeedIds.PackageRelax] = "3 buổi massage và gội đầu thư giãn cuối tuần.",
        [CatalogSeedIds.PackageRejuvenate] = "10 buổi nâng cơ, peel và dưỡng sáng da.",
        [CatalogSeedIds.PackageWithDiscontinued] = "Chăm sóc da kèm lấy nhân mụn (có dịch vụ đã ngừng bán).",
        [CatalogSeedIds.PackageUpcoming] = "Gói chăm sóc dịp Tết, sắp mở bán.",
        [CatalogSeedIds.PackageEnded] = "Gói mùa hè đã hết thời gian mở bán.",
        [CatalogSeedIds.PackageDiscontinued] = "Gói body đã ngừng bán.",
    };

    private static string Image(string slug) => $"https://picsum.photos/seed/nhunguyet-{slug}/800/600";

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        var today = SpaTime.Today(_clock.UtcNow);
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        var face = await CategoryAsync(CatalogSeedIds.CategoryFace, "Chăm sóc da mặt", "Làm sạch, cấp ẩm và phục hồi da mặt.", 1, true, cancellationToken);
        var treatment = await CategoryAsync(CatalogSeedIds.CategoryTreatment, "Trị liệu da chuyên sâu", "Liệu trình cho da mụn, da xỉn màu, da lão hóa.", 2, true, cancellationToken);
        var massage = await CategoryAsync(CatalogSeedIds.CategoryMassage, "Massage body", "Thư giãn cơ thể với đá nóng và tinh dầu.", 3, true, cancellationToken);
        var hair = await CategoryAsync(CatalogSeedIds.CategoryHairWash, "Gội đầu dưỡng sinh", "Gội đầu thảo mộc kết hợp massage đầu, cổ, vai.", 4, true, cancellationToken);
        var body = await CategoryAsync(CatalogSeedIds.CategoryBody, "Chăm sóc cơ thể", "Tẩy tế bào chết, ủ trắng, đắp bùn khoáng.", 5, true, cancellationToken);
        var waxing = await CategoryAsync(CatalogSeedIds.CategoryWaxing, "Triệt lông", "Triệt lông nhẹ nhàng cho từng vùng.", 6, true, cancellationToken);
        // Hidden: leaves the guest filter, its service stays visible (BR-CAT-12).
        var steam = await CategoryAsync(CatalogSeedIds.CategorySteam, "Xông hơi thảo dược", "Danh mục đang ẩn (dữ liệu thử).", 7, false, cancellationToken);
        // Empty: guests never see it, the owner can delete it (BR-CAT-13).
        await CategoryAsync(CatalogSeedIds.CategoryNails, "Nail & mi", "Danh mục chưa có dịch vụ (dữ liệu thử).", 8, true, cancellationToken);

        var s = new Dictionary<Guid, SpaService>();
        async Task Add(Guid id, ServiceCategory category, string name, int minutes, decimal price, string description,
            string? imageUrl, CatalogStatus status = CatalogStatus.OnSale) =>
            s[id] = await ServiceAsync(id, category, name, minutes, price, description, imageUrl, status, cancellationToken);

        await Add(CatalogSeedIds.FaceDeepClean, face, "Làm sạch sâu da mặt", 60, 350_000,
            "Tẩy trang, rửa mặt, tẩy tế bào chết và xông hơi giúp lỗ chân lông thông thoáng.\nPhù hợp mọi loại da.", Image("lam-sach"));
        await Add(CatalogSeedIds.FaceHydrate, face, "Cấp ẩm phục hồi", 90, 650_000,
            "Bổ sung độ ẩm cho làn da khô, căng thiếu sức sống bằng tinh chất thảo mộc.", Image("cap-am"));
        await Add(CatalogSeedIds.FaceBasic, face, "Chăm sóc da cơ bản", 45, 250_000,
            "Liệu trình chăm sóc nhẹ nhàng dành cho lần đầu đến spa.", imageUrl: null);
        await Add(CatalogSeedIds.FacePearl, face, "Dưỡng trắng ngọc trai", 75, 550_000,
            "Đắp mặt nạ bột ngọc trai và massage giúp da sáng mịn.", Image("ngoc-trai"));
        await Add(CatalogSeedIds.FaceLift, face, "Massage mặt nâng cơ", 60, 450_000,
            "Kỹ thuật massage mặt giúp thư giãn cơ mặt, gương mặt thon gọn hơn.", Image("nang-co"));
        await Add(CatalogSeedIds.TreatmentAcne, treatment, "Trị mụn chuyên sâu", 90, 750_000,
            "Làm sạch, lấy nhân mụn và làm dịu da theo quy trình của spa.", Image("tri-mun"));
        await Add(CatalogSeedIds.TreatmentPeel, treatment, "Peel da sinh học", 60, 900_000,
            "Tẩy da chết sinh học giúp bề mặt da đều màu, mịn màng.", Image("peel"));
        await Add(CatalogSeedIds.TreatmentInfusion, treatment, "Điện di tinh chất", 45, 500_000,
            "Đưa tinh chất dưỡng vào da bằng máy điện di.", Image("dien-di"));
        await Add(CatalogSeedIds.TreatmentExtraction, treatment, "Lấy nhân mụn", 60, 400_000,
            "Dịch vụ đã ngừng bán (dữ liệu thử), vẫn nằm trong một gói đang bán.", Image("lay-nhan"), CatalogStatus.Discontinued);
        await Add(CatalogSeedIds.MassageHotStone, massage, "Massage đá nóng", 90, 700_000,
            "Đá bazan làm ấm giúp thư giãn sâu các nhóm cơ.", Image("da-nong"));
        await Add(CatalogSeedIds.MassageOil, massage, "Massage tinh dầu toàn thân", 60, 500_000,
            "Massage toàn thân với tinh dầu sả chanh, oải hương.", Image("tinh-dau"));
        await Add(CatalogSeedIds.MassageNeck, massage, "Massage cổ vai gáy", 45, 300_000,
            "Giảm căng cứng vùng cổ, vai, gáy cho dân văn phòng.", Image("co-vai-gay"));
        await Add(CatalogSeedIds.MassageFoot, massage, "Massage chân thảo dược", 45, 280_000,
            "Ngâm chân thảo dược và massage bàn chân.", Image("chan"));
        await Add(CatalogSeedIds.HairHerbal, hair, "Gội đầu dưỡng sinh thảo mộc", 60, 220_000,
            "Gội đầu bằng nước bồ kết, sả, vỏ bưởi kết hợp massage đầu.", Image("goi-dau"));
        await Add(CatalogSeedIds.HairNeck, hair, "Gội đầu kết hợp massage cổ vai", 75, 320_000,
            "Gội đầu thảo mộc và massage cổ vai thư giãn.", Image("goi-dau-co-vai"));
        await Add(CatalogSeedIds.BodyScrub, body, "Tẩy tế bào chết toàn thân", 60, 450_000,
            "Tẩy tế bào chết bằng muối khoáng và cà phê.", Image("tay-te-bao"));
        await Add(CatalogSeedIds.BodyWhitening, body, "Ủ trắng body", 90, 850_000,
            "Ủ dưỡng toàn thân giúp da sáng và mềm mịn.", Image("u-trang"));
        await Add(CatalogSeedIds.BodyMud, body, "Đắp bùn khoáng", 60, 600_000,
            "Dịch vụ đã ngừng bán, không có ảnh (dữ liệu thử).", imageUrl: null, CatalogStatus.Discontinued);
        await Add(CatalogSeedIds.WaxUnderarm, waxing, "Triệt lông nách", 30, 300_000,
            "Triệt lông vùng nách nhẹ nhàng.", Image("triet-nach"));
        await Add(CatalogSeedIds.WaxLegs, waxing, "Triệt lông chân", 60, 900_000,
            "Triệt lông toàn bộ chân.", Image("triet-chan"));
        // Broken image URL: the screens must fall back to the placeholder.
        await Add(CatalogSeedIds.WaxFace, waxing, "Triệt lông mặt", 30, 350_000,
            "Ảnh của dịch vụ này là link hỏng (dữ liệu thử).", "https://res.cloudinary.com/demo/image/upload/khong-ton-tai.jpg");
        await Add(CatalogSeedIds.SteamHerbal, steam, "Xông hơi thảo dược", 30, 150_000,
            "Dịch vụ đang bán thuộc danh mục đang ẩn (dữ liệu thử).", Image("xong-hoi"));
        // Q-71: one service (FaceBasic) keeps no short description, to test the empty case.
        var shortDescriptions = new Dictionary<Guid, string>
        {
            [CatalogSeedIds.FaceDeepClean] = "Làm sạch sâu lỗ chân lông, da thông thoáng và mềm mịn.",
            [CatalogSeedIds.FaceHydrate] = "Cấp ẩm chuyên sâu cho làn da khô, căng mướt sau một buổi.",
            [CatalogSeedIds.FacePearl] = "Mặt nạ bột ngọc trai giúp da sáng và đều màu hơn.",
            [CatalogSeedIds.FaceLift] = "Massage nâng cơ giúp gương mặt thư giãn và thon gọn.",
            [CatalogSeedIds.TreatmentAcne] = "Làm sạch, lấy nhân mụn và làm dịu da theo quy trình của spa.",
            [CatalogSeedIds.TreatmentPeel] = "Tẩy da chết sinh học cho bề mặt da mịn và đều màu.",
            [CatalogSeedIds.TreatmentInfusion] = "Đưa tinh chất dưỡng vào da bằng máy điện di.",
            [CatalogSeedIds.TreatmentExtraction] = "Lấy nhân mụn nhẹ nhàng (đã ngừng bán).",
            [CatalogSeedIds.MassageHotStone] = "Đá bazan làm ấm giúp thư giãn sâu toàn thân.",
            [CatalogSeedIds.MassageOil] = "Massage toàn thân với tinh dầu thiên nhiên tự chọn.",
            [CatalogSeedIds.MassageNeck] = "Giảm căng cứng vùng cổ, vai, gáy cho dân văn phòng.",
            [CatalogSeedIds.MassageFoot] = "Ngâm chân thảo dược và massage bàn chân thư giãn.",
            [CatalogSeedIds.HairHerbal] = "Gội đầu bồ kết, sả, vỏ bưởi kết hợp massage đầu.",
            [CatalogSeedIds.HairNeck] = "Gội đầu thảo mộc kèm massage cổ vai gáy.",
            [CatalogSeedIds.BodyScrub] = "Tẩy tế bào chết toàn thân bằng muối khoáng và cà phê.",
            [CatalogSeedIds.BodyWhitening] = "Ủ dưỡng toàn thân giúp da sáng và mềm mịn.",
            [CatalogSeedIds.BodyMud] = "Đắp bùn khoáng thư giãn (đã ngừng bán).",
            [CatalogSeedIds.WaxUnderarm] = "Triệt lông vùng nách nhanh, nhẹ nhàng.",
            [CatalogSeedIds.WaxLegs] = "Triệt lông toàn bộ chân cho làn da mịn màng.",
            [CatalogSeedIds.WaxFace] = "Triệt lông vùng mặt (ảnh là link hỏng để thử).",
            [CatalogSeedIds.SteamHerbal] = "Xông hơi thảo dược giúp thư giãn và ấm cơ thể.",
        };
        foreach (var (id, service) in s)
            service.ShortDescription = shortDescriptions.GetValueOrDefault(id);

        // Q-71: 18 services have 3–5 steps (minutes never exceed the service duration); FaceBasic, BodyMud, WaxUnderarm and
        // WaxFace have none, to test the empty case.
        var procedures = new Dictionary<Guid, (string Title, string? Description, int? Minutes)[]>
        {
            [CatalogSeedIds.FaceDeepClean] =
            [
                ("Tẩy trang và rửa mặt", null, 10), ("Tẩy tế bào chết", null, 10),
                ("Xông hơi, làm sạch lỗ chân lông", "Hơi nước ấm giúp lỗ chân lông mở để làm sạch sâu.", 20), ("Đắp mặt nạ làm dịu", null, 15),
            ],
            [CatalogSeedIds.FaceHydrate] =
            [
                ("Làm sạch da", null, 15), ("Massage mặt", null, 20),
                ("Điện di tinh chất cấp ẩm", "Tinh chất được đưa sâu vào da bằng máy điện di.", 25), ("Đắp mặt nạ cấp ẩm", null, 20),
            ],
            [CatalogSeedIds.FacePearl] =
            [
                ("Làm sạch da", null, 15), ("Tẩy tế bào chết", null, 10), ("Đắp mặt nạ bột ngọc trai", null, 30), ("Thoa kem dưỡng", null, 10),
            ],
            [CatalogSeedIds.FaceLift] = [("Làm sạch da", null, 10), ("Massage nâng cơ mặt", null, 35), ("Đắp mặt nạ săn chắc", null, 15)],
            [CatalogSeedIds.TreatmentAcne] =
            [
                ("Soi da và làm sạch", "Kỹ thuật viên soi da để chọn cách chăm sóc phù hợp.", 15), ("Lấy nhân mụn", null, 35),
                ("Chiếu ánh sáng làm dịu", null, 15), ("Đắp mặt nạ làm dịu", null, 20),
            ],
            [CatalogSeedIds.TreatmentPeel] =
            [
                ("Làm sạch da", null, 10), ("Thoa dung dịch peel", null, 20), ("Trung hòa và làm dịu", null, 15),
                ("Thoa kem chống nắng", "Nên dùng kem chống nắng đều đặn vài ngày sau buổi peel.", 5),
            ],
            [CatalogSeedIds.TreatmentInfusion] = [("Làm sạch da", null, 10), ("Điện di tinh chất", null, 25), ("Thoa kem dưỡng", null, 5)],
            [CatalogSeedIds.TreatmentExtraction] = [("Làm sạch da", null, 10), ("Xông hơi", null, 10), ("Lấy nhân mụn", null, 30)],
            [CatalogSeedIds.MassageHotStone] =
            [
                ("Ngâm chân thảo dược", null, 10), ("Massage tinh dầu làm ấm cơ", null, 30), ("Massage đá nóng", null, 40),
                ("Thư giãn với trà thảo mộc", null, 10),
            ],
            [CatalogSeedIds.MassageOil] = [("Chọn tinh dầu", "Sả chanh, oải hương hoặc bưởi.", 5), ("Massage lưng và vai", null, 25), ("Massage tay, chân", null, 25)],
            [CatalogSeedIds.MassageNeck] = [("Chườm ấm cổ vai", null, 10), ("Massage cổ vai gáy", null, 30), ("Kéo giãn nhẹ", null, 5)],
            [CatalogSeedIds.MassageFoot] = [("Ngâm chân thảo dược", null, 15), ("Massage bàn chân", null, 25), ("Thoa kem dưỡng", null, 5)],
            [CatalogSeedIds.HairHerbal] =
            [
                ("Massage đầu khô", null, 10), ("Gội đầu thảo mộc", null, 25), ("Massage cổ vai", null, 15), ("Sấy tóc", null, 10),
            ],
            [CatalogSeedIds.HairNeck] = [("Gội đầu thảo mộc", null, 25), ("Massage cổ vai gáy", null, 30), ("Sấy tóc", null, 10)],
            [CatalogSeedIds.BodyScrub] = [("Tắm tráng", null, 10), ("Tẩy tế bào chết toàn thân", null, 35), ("Thoa dưỡng thể", null, 10)],
            [CatalogSeedIds.BodyWhitening] =
            [
                ("Tẩy tế bào chết", null, 20), ("Đắp hỗn hợp ủ trắng", null, 40), ("Tắm tráng", null, 15), ("Thoa dưỡng thể", null, 10),
            ],
            [CatalogSeedIds.WaxLegs] = [("Làm sạch vùng da", null, 10), ("Triệt lông", null, 40), ("Thoa gel làm dịu", null, 10)],
            [CatalogSeedIds.SteamHerbal] = [("Thay đồ", null, 5), ("Xông hơi thảo dược", null, 20), ("Uống trà gừng", null, null)],
        };
        foreach (var id in CatalogSeedIds.Services)
            await ReplaceStepsAsync(id, procedures.GetValueOrDefault(id) ?? [], cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        static ServicePackageItem Item(Guid serviceId, int sortOrder, int sessions, int gap, string? note = null) => new()
        {
            SpaServiceId = serviceId, SortOrder = sortOrder, SessionCount = sessions, MinDaysBetweenSessions = gap, Note = note,
        };

        await PackageAsync(CatalogSeedIds.PackageAcne, "Liệu trình trị mụn 5 buổi",
            "Gói 5 buổi làm sạch, trị mụn và làm dịu da, các buổi cách nhau ít nhất một tuần.", 3_200_000, 120, Image("goi-tri-mun"),
            null, null, CatalogStatus.OnSale,
            [Item(CatalogSeedIds.FaceBasic, 1, 1, 0), Item(CatalogSeedIds.TreatmentAcne, 2, 3, 7, "Nên đến sớm 10 phút để soi da."),
                Item(CatalogSeedIds.TreatmentInfusion, 3, 1, 7)], cancellationToken);
        // No own image: falls back to the first item's service image (BR-CAT-07).
        await PackageAsync(CatalogSeedIds.PackageHydrate, "Gói cấp ẩm 6 buổi",
            "Cấp ẩm và phục hồi cho da khô trong 6 buổi.", 3_600_000, 180, imageUrl: null,
            null, null, CatalogStatus.OnSale,
            [Item(CatalogSeedIds.FaceDeepClean, 1, 2, 0), Item(CatalogSeedIds.FaceHydrate, 2, 4, 7)], cancellationToken);
        await PackageAsync(CatalogSeedIds.PackageRelax, "Gói thư giãn 3 buổi",
            "Massage tinh dầu, gội đầu dưỡng sinh và massage đá nóng.", 1_290_000, 60, Image("goi-thu-gian"),
            null, null, CatalogStatus.OnSale,
            [Item(CatalogSeedIds.MassageOil, 1, 1, 0), Item(CatalogSeedIds.HairHerbal, 2, 1, 3), Item(CatalogSeedIds.MassageHotStone, 3, 1, 3)],
            cancellationToken);
        await PackageAsync(CatalogSeedIds.PackageRejuvenate, "Gói trẻ hóa 10 buổi",
            "Massage nâng cơ, peel sinh học và dưỡng trắng trong 10 buổi.", 7_900_000, 365, Image("goi-tre-hoa"),
            null, today.AddDays(30), CatalogStatus.OnSale,
            [Item(CatalogSeedIds.FaceLift, 1, 4, 7), Item(CatalogSeedIds.TreatmentPeel, 2, 3, 14), Item(CatalogSeedIds.FacePearl, 3, 3, 7)],
            cancellationToken);
        await PackageAsync(CatalogSeedIds.PackageWaxLegs, "Gói triệt lông chân 8 buổi",
            "8 buổi triệt lông chân, mỗi buổi cách nhau ít nhất 4 tuần.", 5_600_000, 365, imageUrl: null,
            null, null, CatalogStatus.OnSale,
            [Item(CatalogSeedIds.WaxLegs, 1, 8, 28)], cancellationToken);
        // On sale although one component is discontinued (Q-14).
        await PackageAsync(CatalogSeedIds.PackageWithDiscontinued, "Gói chăm sóc da kèm lấy nhân mụn",
            "Gói đang bán có một dịch vụ thành phần đã ngừng bán (dữ liệu thử).", 1_300_000, 90, Image("goi-lay-nhan"),
            null, null, CatalogStatus.OnSale,
            [Item(CatalogSeedIds.FaceBasic, 1, 2, 0), Item(CatalogSeedIds.TreatmentExtraction, 2, 2, 7)], cancellationToken);
        await PackageAsync(CatalogSeedIds.PackageUpcoming, "Gói Tết rạng rỡ",
            "Chưa tới thời gian mở bán: khách chưa thấy, chủ spa thấy (dữ liệu thử).", 2_200_000, 90, Image("goi-tet"),
            today.AddDays(20), today.AddDays(60), CatalogStatus.OnSale,
            [Item(CatalogSeedIds.FaceHydrate, 1, 2, 0), Item(CatalogSeedIds.BodyWhitening, 2, 1, 7)], cancellationToken);
        await PackageAsync(CatalogSeedIds.PackageEnded, "Gói hè sảng khoái",
            "Đã hết thời gian mở bán: khách không thấy (dữ liệu thử).", 1_500_000, 60, Image("goi-he"),
            today.AddDays(-90), today.AddDays(-10), CatalogStatus.OnSale,
            [Item(CatalogSeedIds.BodyScrub, 1, 2, 0), Item(CatalogSeedIds.MassageNeck, 2, 2, 3)], cancellationToken);
        await PackageAsync(CatalogSeedIds.PackageDiscontinued, "Gói body cũ",
            "Gói đã ngừng bán (dữ liệu thử).", 2_400_000, 120, imageUrl: null,
            null, null, CatalogStatus.Discontinued,
            [Item(CatalogSeedIds.BodyScrub, 1, 3, 0), Item(CatalogSeedIds.BodyMud, 2, 2, 7)], cancellationToken);


        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        _logger.LogInformation("Sample catalog seeded: {Categories} categories, {Services} services, {Packages} packages",
            CatalogSeedIds.Categories.Count, CatalogSeedIds.Services.Count, CatalogSeedIds.Packages.Count);
    }

    /// <summary>
    /// By id, else by name ignoring case and accents (a category created by hand or by the migration is reused instead of breaking
    /// the unique index), else new.
    /// </summary>
    private async Task<ServiceCategory> CategoryAsync(
        Guid id, string name, string description, int sortOrder, bool isActive, CancellationToken cancellationToken)
    {
        var category = await _context.ServiceCategories.FirstOrDefaultAsync(row => row.Id == id, cancellationToken)
            ?? await _context.ServiceCategories.FirstOrDefaultAsync(
                row => AppDbContext.Unaccent(row.Name.ToLower()) == AppDbContext.Unaccent(name.ToLower()), cancellationToken);
        if (category is null)
        {
            category = new ServiceCategory { Id = id };
            _context.ServiceCategories.Add(category);
        }
        category.Name = name;
        category.Description = description;
        category.SortOrder = sortOrder;
        category.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
        return category;
    }

    private async Task<SpaService> ServiceAsync(Guid id, ServiceCategory category, string name, int minutes, decimal price,
        string description, string? imageUrl, CatalogStatus status, CancellationToken cancellationToken)
    {
        var service = await _context.SpaServices.FirstOrDefaultAsync(row => row.Id == id, cancellationToken);
        if (service is null)
        {
            service = new SpaService { Id = id };
            _context.SpaServices.Add(service);
        }
        service.CategoryId = category.Id;
        service.Name = name;
        service.DurationMinutes = minutes;
        service.Price = price;
        service.Description = description;
        service.ChangeStatus(status);
        if (imageUrl is null)
            service.RemoveImage();
        else
            service.SetImage(imageUrl);
        return service;
    }

    /// <summary>Deletes the service's steps, saves, then adds the new ones (the unique (service, sort order) index never sees both).</summary>
    private async Task ReplaceStepsAsync(
        Guid serviceId, IReadOnlyList<(string Title, string? Description, int? Minutes)> steps, CancellationToken cancellationToken)
    {
        var current = await _context.ServiceSteps.Where(step => step.SpaServiceId == serviceId).ToListAsync(cancellationToken);
        if (current.Count > 0)
        {
            _context.ServiceSteps.RemoveRange(current);
            await _context.SaveChangesAsync(cancellationToken);
        }
        _context.ServiceSteps.AddRange(steps.Select((step, index) => new ServiceStep
        {
            SpaServiceId = serviceId, SortOrder = index + 1, Title = step.Title, Description = step.Description, DurationMinutes = step.Minutes,
        }));
    }

    private async Task PackageAsync(Guid id, string name, string description, decimal price, int validityDays, string? imageUrl,
        DateOnly? saleStart, DateOnly? saleEnd, CatalogStatus status, IReadOnlyList<ServicePackageItem> items,
        CancellationToken cancellationToken)
    {
        var package = await _context.ServicePackages.Include(row => row.Items).FirstOrDefaultAsync(row => row.Id == id, cancellationToken);
        if (package is null)
        {
            package = new ServicePackage { Id = id };
            _context.ServicePackages.Add(package);
        }
        package.Name = name;
        package.ShortDescription = PackageShortDescriptions.GetValueOrDefault(id);
        package.Description = description;
        package.Price = price;
        package.ValidityDays = validityDays;
        package.SaleStartDate = saleStart;
        package.SaleEndDate = saleEnd;
        package.ChangeStatus(status);
        if (imageUrl is null)
            package.RemoveImage();
        else
            package.SetImage(imageUrl);
        // Replace the items in their own save so the unique (package, sort_order) index never sees old and new rows together.
        if (package.Items.Count > 0)
        {
            _context.ServicePackageItems.RemoveRange(package.Items);
            await _context.SaveChangesAsync(cancellationToken);
            package.ReplaceItems([]);
        }
        package.ReplaceItems(items.Select(item =>
        {
            item.ServicePackageId = package.Id;
            return item;
        }));
    }
}

/// <summary>Fixed ids of the sample catalog (<see cref="CatalogDataSeeder"/>), prefix <c>0c</c>.</summary>
public static class CatalogSeedIds
{
    public static readonly Guid CategoryFace = Guid.Parse("0c000000-0000-0000-0000-000000000001");
    public static readonly Guid CategoryTreatment = Guid.Parse("0c000000-0000-0000-0000-000000000002");
    public static readonly Guid CategoryMassage = Guid.Parse("0c000000-0000-0000-0000-000000000003");
    public static readonly Guid CategoryHairWash = Guid.Parse("0c000000-0000-0000-0000-000000000004");
    public static readonly Guid CategoryBody = Guid.Parse("0c000000-0000-0000-0000-000000000005");
    public static readonly Guid CategoryWaxing = Guid.Parse("0c000000-0000-0000-0000-000000000006");
    public static readonly Guid CategorySteam = Guid.Parse("0c000000-0000-0000-0000-000000000007");
    public static readonly Guid CategoryNails = Guid.Parse("0c000000-0000-0000-0000-000000000008");

    public static readonly Guid FaceDeepClean = Guid.Parse("0c000000-0000-0000-0000-000000000101");
    public static readonly Guid FaceHydrate = Guid.Parse("0c000000-0000-0000-0000-000000000102");
    public static readonly Guid FaceBasic = Guid.Parse("0c000000-0000-0000-0000-000000000103");
    public static readonly Guid FacePearl = Guid.Parse("0c000000-0000-0000-0000-000000000104");
    public static readonly Guid FaceLift = Guid.Parse("0c000000-0000-0000-0000-000000000105");
    public static readonly Guid TreatmentAcne = Guid.Parse("0c000000-0000-0000-0000-000000000106");
    public static readonly Guid TreatmentPeel = Guid.Parse("0c000000-0000-0000-0000-000000000107");
    public static readonly Guid TreatmentInfusion = Guid.Parse("0c000000-0000-0000-0000-000000000108");
    public static readonly Guid TreatmentExtraction = Guid.Parse("0c000000-0000-0000-0000-000000000109");
    public static readonly Guid MassageHotStone = Guid.Parse("0c000000-0000-0000-0000-000000000110");
    public static readonly Guid MassageOil = Guid.Parse("0c000000-0000-0000-0000-000000000111");
    public static readonly Guid MassageNeck = Guid.Parse("0c000000-0000-0000-0000-000000000112");
    public static readonly Guid MassageFoot = Guid.Parse("0c000000-0000-0000-0000-000000000113");
    public static readonly Guid HairHerbal = Guid.Parse("0c000000-0000-0000-0000-000000000114");
    public static readonly Guid HairNeck = Guid.Parse("0c000000-0000-0000-0000-000000000115");
    public static readonly Guid BodyScrub = Guid.Parse("0c000000-0000-0000-0000-000000000116");
    public static readonly Guid BodyWhitening = Guid.Parse("0c000000-0000-0000-0000-000000000117");
    public static readonly Guid BodyMud = Guid.Parse("0c000000-0000-0000-0000-000000000118");
    public static readonly Guid WaxUnderarm = Guid.Parse("0c000000-0000-0000-0000-000000000119");
    public static readonly Guid WaxLegs = Guid.Parse("0c000000-0000-0000-0000-000000000120");
    public static readonly Guid WaxFace = Guid.Parse("0c000000-0000-0000-0000-000000000121");
    public static readonly Guid SteamHerbal = Guid.Parse("0c000000-0000-0000-0000-000000000122");

    public static readonly Guid PackageAcne = Guid.Parse("0c000000-0000-0000-0000-000000000201");
    public static readonly Guid PackageHydrate = Guid.Parse("0c000000-0000-0000-0000-000000000202");
    public static readonly Guid PackageRelax = Guid.Parse("0c000000-0000-0000-0000-000000000203");
    public static readonly Guid PackageRejuvenate = Guid.Parse("0c000000-0000-0000-0000-000000000204");
    public static readonly Guid PackageWaxLegs = Guid.Parse("0c000000-0000-0000-0000-000000000205");
    public static readonly Guid PackageWithDiscontinued = Guid.Parse("0c000000-0000-0000-0000-000000000206");
    public static readonly Guid PackageUpcoming = Guid.Parse("0c000000-0000-0000-0000-000000000207");
    public static readonly Guid PackageEnded = Guid.Parse("0c000000-0000-0000-0000-000000000208");
    public static readonly Guid PackageDiscontinued = Guid.Parse("0c000000-0000-0000-0000-000000000209");

    public static readonly IReadOnlyList<Guid> Categories =
        [CategoryFace, CategoryTreatment, CategoryMassage, CategoryHairWash, CategoryBody, CategoryWaxing, CategorySteam, CategoryNails];

    public static readonly IReadOnlyList<Guid> Services =
    [
        FaceDeepClean, FaceHydrate, FaceBasic, FacePearl, FaceLift, TreatmentAcne, TreatmentPeel, TreatmentInfusion, TreatmentExtraction,
        MassageHotStone, MassageOil, MassageNeck, MassageFoot, HairHerbal, HairNeck, BodyScrub, BodyWhitening, BodyMud, WaxUnderarm,
        WaxLegs, WaxFace, SteamHerbal,
    ];

    public static readonly IReadOnlyList<Guid> Packages =
    [
        PackageAcne, PackageHydrate, PackageRelax, PackageRejuvenate, PackageWaxLegs, PackageWithDiscontinued, PackageUpcoming,
        PackageEnded, PackageDiscontinued,
    ];
}

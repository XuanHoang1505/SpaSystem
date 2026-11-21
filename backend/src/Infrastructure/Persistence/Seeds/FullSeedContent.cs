using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Infrastructure.Persistence.Seeds;

/// <summary>
/// Texts, people and image links for <see cref="FullDataSeeder"/>. Photos are Unsplash links (free to use under the Unsplash License),
/// avatars come from randomuser.me; both were checked to load and to match the subject.
/// </summary>
internal static class FullSeedContent
{
    public static string Photo(string id) => $"https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=1200&q=80";

    public static string Avatar(bool female, int number) =>
        $"https://randomuser.me/api/portraits/{(female ? "women" : "men")}/{number}.jpg";

    public static readonly Guid NailGelServiceId = Guid.Parse("0c000000-0000-0000-0000-000000000123");

    public static readonly Dictionary<Guid, string> ServicePhotos = new()
    {
        [CatalogSeedIds.FaceDeepClean] = Photo("1616394584738-fc6e612e71b9"),
        [CatalogSeedIds.FaceHydrate] = Photo("1498843053639-170ff2122f35"),
        [CatalogSeedIds.FaceBasic] = Photo("1531299204812-e6d44d9a185c"),
        [CatalogSeedIds.FacePearl] = Photo("1596755389378-c31d21fd1273"),
        [CatalogSeedIds.FaceLift] = Photo("1512290923902-8a9f81dc236c"),
        [CatalogSeedIds.TreatmentAcne] = Photo("1552693673-1bf958298935"),
        [CatalogSeedIds.TreatmentPeel] = Photo("1570172619644-dfd03ed5d881"),
        [CatalogSeedIds.TreatmentInfusion] = Photo("1617897903246-719242758050"),
        [CatalogSeedIds.TreatmentExtraction] = Photo("1576426863848-c21f53c60b19"),
        [CatalogSeedIds.MassageHotStone] = Photo("1600334089648-b0d9d3028eb2"),
        [CatalogSeedIds.MassageOil] = Photo("1544161515-4ab6ce6db874"),
        [CatalogSeedIds.MassageNeck] = Photo("1519823551278-64ac92734fb1"),
        [CatalogSeedIds.MassageFoot] = Photo("1611073615830-9f76902c10fe"),
        [CatalogSeedIds.HairHerbal] = Photo("1595476108010-b4d1f102b1b1"),
        [CatalogSeedIds.HairNeck] = Photo("1522337360788-8b13dee7a37e"),
        [CatalogSeedIds.BodyScrub] = Photo("1590439471364-192aa70c0b53"),
        [CatalogSeedIds.BodyWhitening] = Photo("1540555700478-4be289fbecef"),
        [CatalogSeedIds.BodyMud] = Photo("1598440947619-2c35fc9aa908"),
        [CatalogSeedIds.WaxUnderarm] = Photo("1608248543803-ba4f8c70ae0b"),
        [CatalogSeedIds.WaxLegs] = Photo("1610992015732-2449b76344bc"),
        [CatalogSeedIds.WaxFace] = Photo("1487412947147-5cebf100ffc2"),
        [CatalogSeedIds.SteamHerbal] = Photo("1583416750470-965b2707b355"),
        [NailGelServiceId] = Photo("1604654894610-df63bc536371"),
    };

    public static readonly Dictionary<Guid, string> PackagePhotos = new()
    {
        [CatalogSeedIds.PackageAcne] = Photo("1515377905703-c4788e51af15"),
        [CatalogSeedIds.PackageHydrate] = Photo("1631729371254-42c2892f0e6e"),
        [CatalogSeedIds.PackageRelax] = Photo("1560750588-73207b1ef5b8"),
        [CatalogSeedIds.PackageRejuvenate] = Photo("1620733723572-11c53f73a416"),
        [CatalogSeedIds.PackageWaxLegs] = Photo("1507652313519-d4e9174996dd"),
        [CatalogSeedIds.PackageWithDiscontinued] = Photo("1556228578-8c89e6adf883"),
        [CatalogSeedIds.PackageUpcoming] = Photo("1571875257727-256c39da42af"),
        [CatalogSeedIds.PackageEnded] = Photo("1576426863848-c21f53c60b19"),
        [CatalogSeedIds.PackageDiscontinued] = Photo("1598440947619-2c35fc9aa908"),
    };

    public static readonly string[] ReviewPhotos =
    [
        Photo("1596755389378-c31d21fd1273"), Photo("1600334089648-b0d9d3028eb2"), Photo("1544161515-4ab6ce6db874"),
        Photo("1620733723572-11c53f73a416"), Photo("1540555700478-4be289fbecef"), Photo("1616394584738-fc6e612e71b9"),
        Photo("1519823551278-64ac92734fb1"), Photo("1595476108010-b4d1f102b1b1"),
    ];

    /// <summary>Texts of the sample catalog that described test cases ("dữ liệu thử") are replaced by real descriptions.</summary>
    public static readonly Dictionary<Guid, (string Description, string ShortDescription)> ServiceTexts = new()
    {
        [CatalogSeedIds.FaceBasic] = ("Liệu trình chăm sóc nhẹ nhàng dành cho lần đầu đến spa: làm sạch, massage mặt và đắp mặt nạ dịu da.",
            "Chăm sóc da nhẹ nhàng cho lần đầu đến spa."),
        [CatalogSeedIds.TreatmentExtraction] = ("Lấy nhân mụn bằng dụng cụ vô khuẩn, hạn chế thâm và sẹo. Spa đã ngừng bán lẻ dịch vụ này, dịch vụ chỉ còn trong gói.",
            "Lấy nhân mụn nhẹ nhàng, hạn chế thâm."),
        [CatalogSeedIds.BodyMud] = ("Đắp bùn khoáng giàu khoáng chất giúp thải độc, làm mềm da. Spa đã ngừng bán dịch vụ này.",
            "Đắp bùn khoáng thư giãn toàn thân."),
        [CatalogSeedIds.WaxFace] = ("Triệt lông vùng mép, cằm và hai bên má bằng công nghệ ánh sáng, nhẹ nhàng với da mặt.",
            "Triệt lông vùng mặt nhẹ nhàng, an toàn."),
        [CatalogSeedIds.SteamHerbal] = ("Xông hơi với lá sả, gừng và vỏ bưởi giúp thư giãn, làm ấm cơ thể và thông thoáng lỗ chân lông.",
            "Xông hơi thảo dược giúp thư giãn và ấm cơ thể."),
    };

    public static readonly Dictionary<Guid, (string Description, string ShortDescription)> PackageTexts = new()
    {
        [CatalogSeedIds.PackageWaxLegs] = ("8 buổi triệt lông chân, mỗi buổi cách nhau ít nhất 4 tuần để đạt hiệu quả lâu dài.",
            "8 buổi triệt lông chân, cách nhau 4 tuần."),
        [CatalogSeedIds.PackageWithDiscontinued] = ("2 buổi chăm sóc da cơ bản và 2 buổi lấy nhân mụn, giúp da sạch mụn ẩn và thông thoáng.",
            "Chăm sóc da kèm lấy nhân mụn."),
        [CatalogSeedIds.PackageUpcoming] = ("Cấp ẩm da mặt và ủ trắng body cho làn da rạng rỡ đón Tết. Gói sắp mở bán.",
            "Gói chăm sóc dịp Tết, sắp mở bán."),
        [CatalogSeedIds.PackageEnded] = ("Tẩy tế bào chết toàn thân và massage cổ vai gáy cho mùa hè sảng khoái. Gói đã hết thời gian mở bán.",
            "Gói mùa hè đã kết thúc."),
        [CatalogSeedIds.PackageDiscontinued] = ("Tẩy tế bào chết và đắp bùn khoáng toàn thân. Gói đã ngừng bán.", "Gói body đã ngừng bán."),
    };

    /// <summary>Procedures for the services the sample catalog leaves without steps.</summary>
    public static readonly Dictionary<Guid, (string Title, int Minutes)[]> ExtraSteps = new()
    {
        [CatalogSeedIds.FaceBasic] = [("Làm sạch da", 10), ("Massage mặt thư giãn", 15), ("Đắp mặt nạ dịu da", 15)],
        [CatalogSeedIds.BodyMud] = [("Tắm tráng", 10), ("Đắp bùn khoáng toàn thân", 35), ("Tắm tráng và thoa dưỡng thể", 15)],
        [CatalogSeedIds.WaxUnderarm] = [("Làm sạch vùng da", 5), ("Triệt lông", 20), ("Thoa gel làm dịu", 5)],
        [CatalogSeedIds.WaxFace] = [("Làm sạch da mặt", 5), ("Triệt lông", 20), ("Thoa gel làm dịu", 5)],
        [NailGelServiceId] = [("Dũa và làm sạch móng", 15), ("Sơn gel và hơ đèn", 35), ("Dưỡng da tay", 10)],
    };

    public sealed record PersonDef(string Name, string Email, string Phone, Gender Gender, DateOnly DateOfBirth, string? AvatarUrl);

    public static readonly PersonDef Owner = new("Nguyễn Như Nguyệt", "owner@gmail.com", "0901234567", Gender.Female, new DateOnly(1986, 3, 12),
        Avatar(true, 65));

    public static readonly PersonDef MainCustomer = new("Lê Thị Thu Hà", "customer@gmail.com", "0912345678", Gender.Female,
        new DateOnly(1996, 8, 21), Avatar(true, 44));

    public static readonly PersonDef[] OtherCustomers =
    [
        new("Phạm Thị Lan Anh", "lananh.pham@example.com", "0913000001", Gender.Female, new DateOnly(1994, 2, 14), Avatar(true, 12)),
        new("Võ Ngọc Mai", "ngocmai.vo@example.com", "0913000002", Gender.Female, new DateOnly(1999, 11, 3), Avatar(true, 21)),
        new("Trương Thị Kim Ngân", "kimngan.truong@example.com", "0913000003", Gender.Female, new DateOnly(1991, 6, 27), Avatar(true, 33)),
        new("Huỳnh Bảo Trâm", "baotram.huynh@example.com", "0913000004", Gender.Female, new DateOnly(2000, 1, 9), null),
        new("Đặng Thùy Linh", "thuylinh.dang@example.com", "0913000005", Gender.Female, new DateOnly(1997, 4, 18), Avatar(true, 52)),
        new("Bùi Thị Hồng Nhung", "hongnhung.bui@example.com", "0913000006", Gender.Female, new DateOnly(1989, 9, 30), Avatar(true, 68)),
        new("Lý Minh Khang", "minhkhang.ly@example.com", "0913000007", Gender.Male, new DateOnly(1993, 12, 5), Avatar(false, 32)),
        new("Nguyễn Hoàng Yến", "hoangyen.nguyen@example.com", "0913000008", Gender.Female, new DateOnly(1995, 7, 22), Avatar(true, 79)),
        new("Trần Gia Hân", "giahan.tran@example.com", "0913000009", Gender.Female, new DateOnly(2001, 3, 15), null),
        new("Phan Thị Diễm", "diem.phan@example.com", "0913000010", Gender.Female, new DateOnly(1988, 10, 2), Avatar(true, 90)),
        new("Đỗ Quốc Bảo", "quocbao.do@example.com", "0913000011", Gender.Male, new DateOnly(1990, 5, 11), Avatar(false, 46)),
        new("Mai Thanh Thảo", "thanhthao.mai@example.com", "0913000012", Gender.Female, new DateOnly(1998, 8, 8), Avatar(true, 15)),
        new("Cao Ngọc Trinh", "ngoctrinh.cao@example.com", "0913000013", Gender.Female, new DateOnly(1992, 2, 28), Avatar(true, 26)),
        new("Hồ Thị Thanh Vân", "thanhvan.ho@example.com", "0913000014", Gender.Female, new DateOnly(1985, 12, 19), null),
        new("Vương Khánh Linh", "khanhlinh.vuong@example.com", "0913000015", Gender.Female, new DateOnly(2002, 6, 6), Avatar(true, 38)),
    ];

    /// <summary>Index into <see cref="OtherCustomers"/> of the locked account.</summary>
    public const int LockedCustomerIndex = 9;

    public static readonly string[] CancellationReasons =
    [
        "Có việc đột xuất, sẽ đặt lại sau.", "Bận công tác, xin dời sang tuần sau.", "Không sắp xếp được thời gian.",
        "Bị ốm nên không đến được.", "Muốn đổi sang khung giờ khác.",
    ];

    public static readonly string[] OrderCancellationReasons =
    [
        "Đặt nhầm dịch vụ.", "Muốn chọn gói khác phù hợp hơn.", "Chưa sắp xếp được thời gian.", "Đổi ý, sẽ mua sau.",
    ];

    public static readonly Dictionary<SkinType, string[]> Concerns = new()
    {
        [SkinType.Normal] = ["Da khá ổn định, lỗ chân lông nhỏ, cần duy trì độ ẩm.", "Da hơi xỉn màu do thức khuya."],
        [SkinType.Dry] = ["Da khô, bong tróc nhẹ hai bên má.", "Da thiếu nước, xuất hiện nếp nhăn nhỏ vùng mắt."],
        [SkinType.Oily] = ["Đổ dầu nhiều vùng chữ T, lỗ chân lông to.", "Mụn ẩn vùng trán và cằm, da bóng dầu."],
        [SkinType.Combination] = ["Vùng chữ T đổ dầu, hai má khô.", "Mụn đầu đen ở mũi, má hơi khô."],
        [SkinType.Sensitive] = ["Da nhạy cảm, dễ ửng đỏ khi thay đổi thời tiết.", "Da mỏng, có mao mạch nhỏ, dễ kích ứng."],
    };

    public static readonly string[] CurrentProducts =
    [
        "Sữa rửa mặt dịu nhẹ, kem chống nắng SPF50.", "Nước tẩy trang, toner không cồn, kem dưỡng ẩm.",
        "Serum vitamin C buổi sáng, retinol buổi tối.", "Chỉ dùng sữa rửa mặt và kem chống nắng.", "Gel rửa mặt cho da dầu, serum BHA 2%.",
    ];

    public static readonly string[] CareGoals =
    [
        "Giảm mụn, se khít lỗ chân lông.", "Cấp ẩm, giúp da căng mịn.", "Làm đều màu da, mờ thâm.", "Thư giãn, giảm căng thẳng.",
        "Phục hồi da sau thời gian dùng mỹ phẩm không phù hợp.",
    ];

    public static readonly string[] Recommendations =
    [
        "Duy trì chăm sóc da 2 tuần/lần, dùng kem chống nắng hằng ngày.", "Nên theo liệu trình trị mụn 5 buổi.",
        "Bổ sung serum cấp ẩm, tránh tẩy tế bào chết quá 2 lần/tuần.", "Nên peel nhẹ sau 2 tuần để làm đều màu da.",
        "Uống đủ nước, hạn chế đồ ngọt và đồ chiên rán.",
    ];

    public static readonly string?[] SkinNotes =
    [
        null, "Khách thích tinh dầu oải hương.", "Không dùng sản phẩm có cồn.", "Khách hay đến buổi tối sau giờ làm.", null,
        "Da phản ứng tốt với mặt nạ thảo mộc.",
    ];

    public static readonly string[] SessionNotes =
    [
        "Da phản ứng tốt, không kích ứng.", "Mụn viêm giảm rõ, còn ít mụn ẩn vùng cằm.", "Khách hài lòng, da sáng hơn buổi trước.",
        "Da hơi đỏ sau buổi, đã thoa gel làm dịu.", "Cơ vai gáy còn căng, nên massage thêm.", "Khách ngủ thiếp đi, rất thư giãn.",
    ];

    public static readonly Dictionary<int, string[]> ReviewComments = new()
    {
        [5] =
        [
            "Nhân viên rất nhẹ nhàng, chu đáo. Da mình mịn hẳn sau buổi đầu tiên!", "Không gian thơm, yên tĩnh, massage xong ngủ một giấc thật ngon.",
            "Kỹ thuật viên tư vấn kỹ, làm rất có tâm. Chắc chắn sẽ quay lại.", "Giá hợp lý, dịch vụ tốt hơn mong đợi. 10 điểm!",
            "Mình đã giới thiệu cho cả nhóm bạn, ai cũng khen.",
        ],
        [4] =
        [
            "Dịch vụ tốt, nhân viên thân thiện. Chỉ là cuối tuần hơi đông.", "Da cải thiện rõ, mong spa có thêm khung giờ tối.",
            "Massage đã, tinh dầu thơm. Phòng hơi lạnh một chút.", "Hài lòng, sẽ quay lại khi có dịp.",
        ],
        [3] =
        [
            "Dịch vụ ổn nhưng phải chờ khoảng 15 phút.", "Hiệu quả chưa rõ lắm, có lẽ cần thêm vài buổi.", "Bình thường, chưa thấy khác biệt nhiều.",
        ],
        [2] = ["Phải chờ khá lâu dù đã đặt lịch trước.", "Da hơi kích ứng sau buổi làm, mong spa tư vấn kỹ hơn."],
        [1] = ["Trải nghiệm không như kỳ vọng, nhân viên làm hơi vội."],
    };

    public static readonly string[] OwnerReplies =
    [
        "Cảm ơn chị đã tin tưởng Spa Như Nguyệt. Hẹn gặp lại chị ở buổi tiếp theo nhé!",
        "Spa rất vui khi chị hài lòng. Chúc chị luôn xinh đẹp và khỏe mạnh!",
        "Cảm ơn góp ý của chị, spa sẽ sắp xếp thêm nhân sự giờ cao điểm để chị không phải chờ.",
        "Spa xin lỗi vì trải nghiệm chưa trọn vẹn. Bộ phận chăm sóc khách hàng sẽ liên hệ chị trong hôm nay.",
    ];

    public static readonly Dictionary<Guid, string> PlanGoals = new()
    {
        [CatalogSeedIds.PackageAcne] = "Giảm mụn viêm, mụn ẩn và se khít lỗ chân lông.",
        [CatalogSeedIds.PackageHydrate] = "Phục hồi độ ẩm, da căng mịn và đều màu.",
        [CatalogSeedIds.PackageRelax] = "Thư giãn, giảm căng cơ vai gáy và cải thiện giấc ngủ.",
        [CatalogSeedIds.PackageRejuvenate] = "Nâng cơ, giảm nếp nhăn nhỏ và làm sáng da.",
        [CatalogSeedIds.PackageWaxLegs] = "Giảm lông chân lâu dài, da mịn màng.",
        [CatalogSeedIds.PackageWithDiscontinued] = "Làm sạch mụn ẩn, da thông thoáng.",
        [CatalogSeedIds.PackageEnded] = "Làm sạch da toàn thân, giảm mỏi cổ vai gáy.",
        [CatalogSeedIds.PackageDiscontinued] = "Làm mềm da, thải độc toàn thân.",
    };

    public static readonly (string Question, string Answer)[] AiChats =
    [
        ("Da mình dầu và hay nổi mụn ở trán, nên chọn dịch vụ nào?",
            "Với da dầu hay nổi mụn, bạn có thể tham khảo dịch vụ Làm sạch sâu da mặt hoặc Liệu trình trị mụn 5 buổi. Kỹ thuật viên sẽ soi da trước buổi để tư vấn cụ thể. Nếu mụn sưng đau kéo dài, bạn nên gặp bác sĩ da liễu."),
        ("Massage đá nóng mất bao lâu và giá bao nhiêu?",
            "Massage đá nóng kéo dài 90 phút, giá 700.000 đ. Dịch vụ gồm ngâm chân thảo dược, massage tinh dầu làm ấm cơ và massage đá nóng."),
        ("Thứ bảy tuần này còn lịch trống buổi chiều không?",
            "Thứ bảy này còn một số khung giờ buổi chiều cho Massage đá nóng, ví dụ 14:00 và 15:30. Bạn có thể bấm vào đề xuất bên dưới để đặt lịch."),
        ("Gói trị mụn của mình còn mấy buổi?",
            "Liệu trình trị mụn 5 buổi của bạn đã hoàn thành 3/5 buổi. Buổi 4 đã được đặt, buổi 5 có thể đặt sau buổi 4 ít nhất 7 ngày."),
    ];
}

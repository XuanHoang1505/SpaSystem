namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>Display names used in notification texts: service names and user full names by id.</summary>
public sealed record NoticeNames(IReadOnlyDictionary<Guid, string> Services, IReadOnlyDictionary<Guid, string> Users)
{
    public string Service(Guid id) => Services.TryGetValue(id, out var name) ? name : "dịch vụ";

    public string User(Guid id) => Users.TryGetValue(id, out var name) ? name : "khách hàng";
}

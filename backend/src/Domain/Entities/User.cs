using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>users</c> (thesis: NguoiDung). See docs/domain/data-model.md.</summary>
public sealed class User : BaseAuditableEntity
{
    public const string AccountInactiveCode = "account_inactive";

    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string? AvatarUrl { get; set; }
    public UserStatus Status { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public Gender? Gender { get; set; }

    /// <summary>Personal fields a user or the owner may edit; email, role and status never change here (BR-AUTH-14).</summary>
    public void UpdateProfile(string fullName, string phoneNumber, DateOnly? dateOfBirth, Gender? gender)
    {
        FullName = fullName;
        PhoneNumber = phoneNumber;
        DateOfBirth = dateOfBirth;
        Gender = gender;
    }

    public void ChangePasswordHash(string passwordHash) => PasswordHash = passwordHash;

    public void SetAvatar(string url) => AvatarUrl = url;

    public void RemoveAvatar() => AvatarUrl = null;

    /// <summary>Active → Locked (BR-AUTH-18). False when already locked; an inactive account cannot be locked.</summary>
    public bool Lock() => ChangeStatus(UserStatus.Locked);

    /// <summary>Locked → Active (BR-AUTH-18). False when already active; an inactive account cannot be unlocked.</summary>
    public bool Unlock() => ChangeStatus(UserStatus.Active);

    private bool ChangeStatus(UserStatus target)
    {
        if (Status == UserStatus.Inactive)
            throw new ConflictException("Tài khoản đã ngừng hoạt động (nhân viên nghỉ việc), không thể khóa hoặc mở khóa.", AccountInactiveCode);
        if (Status == target)
            return false;
        Status = target;
        return true;
    }
}

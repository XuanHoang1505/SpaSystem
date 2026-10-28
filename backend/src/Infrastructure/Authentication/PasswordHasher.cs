using Microsoft.AspNetCore.Identity;
using NhuNguyetSpa.Domain.Entities;
using IPasswordHasher = NhuNguyetSpa.Application.Interfaces.Authentication.IPasswordHasher;

namespace NhuNguyetSpa.Infrastructure.Authentication;

/// <summary>ASP.NET Core Identity password hashing (PBKDF2), as chosen in the thesis.</summary>
public sealed class PasswordHasher : IPasswordHasher
{
    private static readonly PasswordHasher<User> Inner = new();
    private static readonly Lazy<string> Dummy = new(() => Inner.HashPassword(null!, Guid.NewGuid().ToString("N")));

    public string DummyHash => Dummy.Value;

    public string Hash(string password) => Inner.HashPassword(null!, password);

    public bool Verify(string passwordHash, string password) =>
        Inner.VerifyHashedPassword(null!, passwordHash, password) is PasswordVerificationResult.Success
            or PasswordVerificationResult.SuccessRehashNeeded;
}

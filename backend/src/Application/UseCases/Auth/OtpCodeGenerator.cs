using System.Security.Cryptography;

namespace NhuNguyetSpa.Application.UseCases.Auth;

/// <summary>Six random digits from a cryptographic RNG (BR-AUTH-07); leading zeros are kept.</summary>
public static class OtpCodeGenerator
{
    public static string Generate() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
}

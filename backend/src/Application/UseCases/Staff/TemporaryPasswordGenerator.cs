using System.Security.Cryptography;

namespace NhuNguyetSpa.Application.UseCases.Staff;

/// <summary>
/// Temporary password for a new staff account (BR-STF-02): cryptographic randomness, at least one lowercase letter,
/// one uppercase letter and one digit (so it passes BR-AUTH-10), without look-alike characters (0 O o 1 l I).
/// </summary>
public static class TemporaryPasswordGenerator
{
    public const int MinLength = 8;
    public const int MaxLength = 64;

    private const string Lower = "abcdefghijkmnpqrstuvwxyz";
    private const string Upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string Digits = "23456789";
    private const string All = Lower + Upper + Digits;

    public static string Generate(int length)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(length, MinLength);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(length, MaxLength);

        var characters = new char[length];
        characters[0] = Pick(Lower);
        characters[1] = Pick(Upper);
        characters[2] = Pick(Digits);
        for (var i = 3; i < length; i++)
            characters[i] = Pick(All);

        for (var i = length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (characters[i], characters[j]) = (characters[j], characters[i]);
        }
        return new string(characters);
    }

    private static char Pick(string alphabet) => alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];
}

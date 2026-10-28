using System.Security.Cryptography;
using NhuNguyetSpa.Application.Common;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>Order codes <c>DH + yyMMdd (VN date) + 6 chars</c> and payment request codes <c>order code + attempt</c> (BR-ORD-07).</summary>
public static class OrderCodeGenerator
{
    // No 0/O, 1/I/L so a code read aloud or typed by hand is unambiguous.
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int RandomLength = 6;

    public static string NewOrderCode(DateTime utcNow)
    {
        Span<char> random = stackalloc char[RandomLength];
        for (var i = 0; i < random.Length; i++)
            random[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        return $"DH{SpaTime.Today(utcNow):yyMMdd}{random}";
    }

    public static string PaymentRequestCode(string orderCode, int attempt)
    {
        return $"{orderCode}{attempt:00}";
    }
}

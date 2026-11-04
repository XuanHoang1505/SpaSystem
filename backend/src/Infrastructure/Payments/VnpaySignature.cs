using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace NhuNguyetSpa.Infrastructure.Payments;

/// <summary>
/// VNPay 2.1.0 signing: parameters sorted by name (ordinal), each <c>UrlEncode(key)=UrlEncode(value)</c> joined with <c>&amp;</c>,
/// then HMAC-SHA512 with the hash secret as lowercase hex. The same encoded string is the query string of the payment URL.
/// </summary>
public static class VnpaySignature
{
    public static string BuildQuery(IEnumerable<KeyValuePair<string, string>> parameters)
    {
        return string.Join('&', parameters
            .OrderBy(pair => pair.Key, StringComparer.Ordinal)
            .Select(pair => $"{WebUtility.UrlEncode(pair.Key)}={WebUtility.UrlEncode(pair.Value)}"));
    }

    public static string Sign(IEnumerable<KeyValuePair<string, string>> parameters, string secret)
    {
        var hash = HMACSHA512.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(BuildQuery(parameters)));
        return Convert.ToHexStringLower(hash);
    }
}

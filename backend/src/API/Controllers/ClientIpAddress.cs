using System.Net;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>The caller's address as the payment gateway expects it (<c>vnp_IpAddr</c>).</summary>
public static class ClientIpAddress
{
    private const string Loopback = "127.0.0.1";

    /// <summary>
    /// IPv4-mapped IPv6 (<c>::ffff:a.b.c.d</c>) becomes plain IPv4 and any loopback becomes 127.0.0.1. A real IPv6 address is
    /// kept as is: <see cref="IPAddress.MapToIPv4"/> on <c>::1</c> gives the meaningless <c>0.0.0.1</c>.
    /// </summary>
    public static string Format(IPAddress? address)
    {
        return address switch
        {
            null => Loopback,
            _ when IPAddress.IsLoopback(address) => Loopback,
            _ when address.IsIPv4MappedToIPv6 => address.MapToIPv4().ToString(),
            _ => address.ToString(),
        };
    }
}

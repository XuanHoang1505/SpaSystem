using System.Net;
using FluentAssertions;
using NhuNguyetSpa.API.Controllers;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Payments;

/// <summary>The IPv4 text sent to VNPay as vnp_IpAddr (found in the ORD-T26 manual run: ::1 became "0.0.0.1").</summary>
public sealed class ClientIpAddressTests
{
    [Theory]
    [InlineData("::1", "127.0.0.1")]
    [InlineData("127.0.0.1", "127.0.0.1")]
    [InlineData("::ffff:192.168.1.59", "192.168.1.59")]
    [InlineData("203.113.5.7", "203.113.5.7")]
    [InlineData("2001:db8::1", "2001:db8::1")]
    public void FormatsTheCallerAddress(string address, string expected) =>
        ClientIpAddress.Format(IPAddress.Parse(address)).Should().Be(expected);

    [Fact]
    public void MissingAddressFallsBackToLoopback() => ClientIpAddress.Format(null).Should().Be("127.0.0.1");
}

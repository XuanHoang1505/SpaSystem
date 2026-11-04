using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Payments;
using NhuNguyetSpa.Application.Interfaces.Services.Payments;

namespace NhuNguyetSpa.API.Controllers;

/// <summary>
/// VNPay callbacks (UC-SPA-11 step 8). Anonymous: trust comes only from the signature (BR-ORD-05). IPN answers in VNPay's own
/// JSON format, not the API envelope; the return URL sends the browser to the client's result page.
/// </summary>
[Route("api/v1/payments/vnpay")]
[AllowAnonymous]
public sealed class VnpayCallbacksController : ApiController
{
    private readonly IPaymentService _payments;
    private readonly IOptions<PaymentOptions> _options;
    private readonly ILogger<VnpayCallbacksController> _logger;

    public VnpayCallbacksController(IPaymentService payments, IOptions<PaymentOptions> options, ILogger<VnpayCallbacksController> logger)
    {
        _payments = payments;
        _options = options;
        _logger = logger;
    }

    [HttpGet("ipn")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Ipn(CancellationToken cancellationToken)
    {
        (string Code, string Message) answer;
        try
        {
            var outcome = await _payments.ProcessCallbackAsync(Query(), fromReturnUrl: false, cancellationToken);
            answer = outcome.Status switch
            {
                PaymentCallbackStatus.Confirmed => ("00", "Confirm Success"),
                PaymentCallbackStatus.AlreadyProcessed => ("02", "Order already confirmed"),
                PaymentCallbackStatus.PaymentNotFound => ("01", "Order not found"),
                PaymentCallbackStatus.InvalidAmount => ("04", "Invalid amount"),
                PaymentCallbackStatus.InvalidSignature => ("97", "Invalid signature"),
                _ => ("99", "Unknown error"),
            };
        }
        catch (Exception exception) when (!(exception is OperationCanceledException))
        {
            _logger.LogError(exception, "VNPay IPN could not be processed.");
            answer = ("99", "Unknown error");
        }
        return Content(JsonSerializer.Serialize(new Dictionary<string, string> { ["RspCode"] = answer.Code, ["Message"] = answer.Message }),
            "application/json");
    }

    [HttpGet("return/{client}")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Return(string client, CancellationToken cancellationToken)
    {
        if (client != "web" && client != "mobile")
            return NotFound();
        var target = client == "web" ? _options.Value.ClientReturnUrls.Web : _options.Value.ClientReturnUrls.Mobile;
        if (string.IsNullOrWhiteSpace(target))
        {
            _logger.LogError("Payment result page for {Client} is not configured (PAYMENT_{Upper}_RETURN_URL).", client, client.ToUpperInvariant());
            return NotFound();
        }

        var outcome = await _payments.ProcessCallbackAsync(Query(), fromReturnUrl: true, cancellationToken);
        var separator = target.Contains('?') ? '&' : '?';
        var invalid = outcome.Status == PaymentCallbackStatus.InvalidSignature
                      || outcome.Status == PaymentCallbackStatus.PaymentNotFound
                      || outcome.Status == PaymentCallbackStatus.InvalidAmount
                      || outcome.OrderId == null;
        var query = invalid
            ? "error=invalid_payment_result"
            : $"orderId={outcome.OrderId}";
        return Redirect($"{target}{separator}{query}");
    }

    private Dictionary<string, string> Query()
    {
        return Request.Query.ToDictionary(pair => pair.Key, pair => pair.Value.ToString());
    }
}

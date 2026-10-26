using System.Net;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Auth;

/// <summary>
/// OTP mail copy (BR-AUTH-12): Vietnamese, HTML + plain text. The HTML follows email-client rules: table layout,
/// inline styles, no images or links (nothing for clients to block), a hidden preheader for the inbox preview,
/// and light/dark colour-scheme hints.
/// </summary>
public static class OtpEmailTemplates
{
    private const string SpaName = "Spa Như Nguyệt";

    public static EmailMessage Create(OtpPurpose purpose, string toEmail, string toName, string otp, int expirationMinutes)
    {
        var registration = purpose == OtpPurpose.Registration;
        var subject = registration ? $"Mã xác thực đăng ký tài khoản – {SpaName}" : $"Mã đặt lại mật khẩu – {SpaName}";
        var heading = registration ? "Xác thực đăng ký tài khoản" : "Đặt lại mật khẩu";
        var action = registration ? "xác thực đăng ký tài khoản" : "đặt lại mật khẩu";
        var intro = registration
            ? $"Cảm ơn bạn đã đăng ký tài khoản tại {SpaName}. Nhập mã dưới đây để hoàn tất đăng ký."
            : "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhập mã dưới đây để tiếp tục.";
        var warning = $"Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên {SpaName}. "
            + "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email; tài khoản của bạn vẫn an toàn.";

        var text = $"""
            Xin chào {toName},

            {intro}

            Mã OTP để {action} tại {SpaName} của bạn là: {otp}

            Mã có hiệu lực trong {expirationMinutes} phút và chỉ dùng được một lần.
            {warning}

            Email này được gửi tự động, vui lòng không trả lời.
            {SpaName}
            """;

        var name = WebUtility.HtmlEncode(toName);
        // Digits spaced for reading; the copy stays "123456" because spacing is CSS, not characters.
        var html = $$"""
            <!doctype html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="color-scheme" content="light dark">
              <meta name="supported-color-schemes" content="light dark">
              <title>{{subject}}</title>
              <style>
                a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
                @media (max-width: 520px) { .card { padding: 24px 20px !important; } .otp { font-size: 30px !important; letter-spacing: 6px !important; padding-left: 6px !important; } }
                @media (prefers-color-scheme: dark) {
                  body, .page { background: #1d1716 !important; }
                  .brand { color: #e8b4c3 !important; }
                  .card { background: #2a2220 !important; }
                  .ink { color: #f3e9e5 !important; }
                  .muted { color: #c2b2ab !important; }
                  .otp-box { background: #3a2c2a !important; border-color: #b9798a !important; }
                  .otp { color: #f6d5de !important; }
                  .note { background: #33291f !important; color: #ecd9b8 !important; }
                }
              </style>
            </head>
            <body style="margin:0;padding:0;background:#f6f1ee">
              <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">Mã OTP của bạn là {{otp}}, hiệu lực {{expirationMinutes}} phút.&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
              <table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f1ee">
                <tr>
                  <td align="center" style="padding:32px 16px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
                      <tr>
                        <td align="center" class="brand" style="padding:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:1px;color:#8a4b5c">
                          {{SpaName}}
                        </td>
                      </tr>
                      <tr>
                        <td class="card" style="background:#ffffff;border-radius:16px;padding:36px 32px;font-family:Arial,Helvetica,sans-serif;color:#3a2e2a">
                          <h1 class="ink" style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#3a2e2a">{{heading}}</h1>
                          <p class="ink" style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3a2e2a">Xin chào {{name}},</p>
                          <p class="ink" style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3a2e2a">{{intro}}</p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td class="otp-box" align="center" style="background:#fbf3f5;border:1px dashed #d8a7b4;border-radius:12px;padding:20px 12px">
                                <div class="muted" style="font-size:13px;color:#8c7a73;margin-bottom:8px">Mã OTP của bạn</div>
                                <div class="otp" style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:bold;letter-spacing:10px;padding-left:10px;color:#8a4b5c">{{otp}}</div>
                              </td>
                            </tr>
                          </table>
                          <p class="ink" style="margin:20px 0 24px;font-size:15px;line-height:1.6;color:#3a2e2a">Mã có hiệu lực trong <strong>{{expirationMinutes}} phút</strong> và chỉ dùng được một lần.</p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td class="note" style="background:#fdf6ea;border-radius:10px;padding:14px 16px;font-size:13px;line-height:1.6;color:#7a5a2e">
                                &#9888;&#65039; {{warning}}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" class="muted" style="padding:20px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8c7a73">
                          Email này được gửi tự động, vui lòng không trả lời.<br>© {{SpaName}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        return new EmailMessage(toEmail, toName, subject, html, text);
    }
}

using System.Net;
using NhuNguyetSpa.Application.Interfaces.Notifications;

namespace NhuNguyetSpa.Application.UseCases.Staff;

/// <summary>
/// Mail with a new staff member's sign-in details (BR-STF-08): Vietnamese, HTML + plain text, same email-client
/// rules as <see cref="Auth.OtpEmailTemplates"/>. The password exists only in this message, never in logs or responses.
/// </summary>
public static class StaffAccountEmailTemplates
{
    private const string SpaName = "Spa Như Nguyệt";

    public static EmailMessage Create(string toEmail, string toName, string temporaryPassword)
    {
        var subject = $"Tài khoản nhân viên – {SpaName}";
        const string heading = "Tài khoản nhân viên của bạn";
        var intro = $"Chủ spa đã tạo tài khoản nhân viên cho bạn trên hệ thống {SpaName}. Dùng thông tin dưới đây để đăng nhập.";
        const string reminder = "Sau lần đăng nhập đầu tiên, hãy đổi mật khẩu bằng chức năng \"Quên mật khẩu\" ở màn hình đăng nhập.";
        var warning = "Không chia sẻ mật khẩu này với bất kỳ ai. "
            + $"Nếu bạn không phải nhân viên của {SpaName}, hãy bỏ qua email này.";

        var text = $"""
            Xin chào {toName},

            {intro}

            Email đăng nhập: {toEmail}
            Mật khẩu tạm: {temporaryPassword}

            {reminder}
            {warning}

            Email này được gửi tự động, vui lòng không trả lời.
            {SpaName}
            """;

        var name = WebUtility.HtmlEncode(toName);
        var email = WebUtility.HtmlEncode(toEmail);
        var password = WebUtility.HtmlEncode(temporaryPassword);
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
                @media (max-width: 520px) { .card { padding: 24px 20px !important; } .secret { font-size: 22px !important; } }
                @media (prefers-color-scheme: dark) {
                  body, .page { background: #1d1716 !important; }
                  .brand { color: #e8b4c3 !important; }
                  .card { background: #2a2220 !important; }
                  .ink { color: #f3e9e5 !important; }
                  .muted { color: #c2b2ab !important; }
                  .box { background: #3a2c2a !important; border-color: #b9798a !important; }
                  .secret { color: #f6d5de !important; }
                  .note { background: #33291f !important; color: #ecd9b8 !important; }
                }
              </style>
            </head>
            <body style="margin:0;padding:0;background:#f6f1ee">
              <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">Thông tin đăng nhập tài khoản nhân viên tại {{SpaName}}.&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
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
                              <td class="box" style="background:#fbf3f5;border:1px dashed #d8a7b4;border-radius:12px;padding:20px 16px">
                                <div class="muted" style="font-size:13px;color:#8c7a73;margin-bottom:4px">Email đăng nhập</div>
                                <div class="ink" style="font-size:16px;color:#3a2e2a;margin-bottom:16px;word-break:break-all">{{email}}</div>
                                <div class="muted" style="font-size:13px;color:#8c7a73;margin-bottom:4px">Mật khẩu tạm</div>
                                <div class="secret" style="font-family:'Courier New',Courier,monospace;font-size:26px;font-weight:bold;letter-spacing:2px;color:#8a4b5c">{{password}}</div>
                              </td>
                            </tr>
                          </table>
                          <p class="ink" style="margin:20px 0 24px;font-size:15px;line-height:1.6;color:#3a2e2a">{{reminder}}</p>
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

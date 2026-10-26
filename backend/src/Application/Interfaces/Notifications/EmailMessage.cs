namespace NhuNguyetSpa.Application.Interfaces.Notifications;

public sealed record EmailMessage(string ToEmail, string ToName, string Subject, string HtmlBody, string TextBody);

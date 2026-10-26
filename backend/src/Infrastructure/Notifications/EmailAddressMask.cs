namespace NhuNguyetSpa.Infrastructure.Notifications;

/// <summary>Hides the mailbox name in logs (BR-AUTH-13): <c>nguyenan@gmail.com</c> → <c>n***@gmail.com</c>.</summary>
public static class EmailAddressMask
{
    public static string Mask(string email)
    {
        var at = email.IndexOf('@');
        return at <= 0 ? "***" : email[0] + "***" + email[at..];
    }
}

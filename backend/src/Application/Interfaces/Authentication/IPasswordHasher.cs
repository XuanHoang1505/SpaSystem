namespace NhuNguyetSpa.Application.Interfaces.Authentication;

public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string passwordHash, string password);

    /// <summary>A valid hash of an unguessable value, verified when no account matches so response time does not reveal it.</summary>
    string DummyHash { get; }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Infrastructure.Persistence.Seeds;

/// <summary>Creates the spa owner account for local development (docs/specs/auth.md). Run with <c>npm run db:seed</c>.</summary>
public sealed class DevelopmentSeeder
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IOptions<SeedOptions> _options;
    private readonly ILogger<DevelopmentSeeder> _logger;

    public DevelopmentSeeder(AppDbContext context, IPasswordHasher passwordHasher, IOptions<SeedOptions> options, ILogger<DevelopmentSeeder> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _options = options;
        _logger = logger;
    }

    public async Task<SeedOutcome> SeedOwnerAsync(CancellationToken cancellationToken)
    {
        var seed = _options.Value;
        var email = Require(seed.OwnerEmail, "SEED_OWNER_EMAIL");
        var phone = Require(seed.OwnerPhone, "SEED_OWNER_PHONE");
        var password = Require(seed.OwnerPassword, "SEED_OWNER_PASSWORD");
        if (password.Length < SeedOptions.MinimumPasswordLength)
            throw new InvalidOperationException($"SEED_OWNER_PASSWORD must be at least {SeedOptions.MinimumPasswordLength} characters.");

        if (await _context.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            _logger.LogInformation("Owner account {Email} already exists; nothing seeded", email);
            return SeedOutcome.AlreadyExists;
        }

        var owner = new User
        {
            FullName = seed.OwnerFullName,
            Email = email,
            PhoneNumber = phone,
            PasswordHash = _passwordHasher.Hash(password),
            Role = UserRole.Owner,
            Status = UserStatus.Active,
        };
        _context.Users.Add(owner);
        _context.OwnerProfiles.Add(new OwnerProfile { Id = owner.Id });
        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Owner account {Email} created", email);
        return SeedOutcome.Created;
    }

    private static string Require(string? value, string variable) => string.IsNullOrWhiteSpace(value)
        ? throw new InvalidOperationException($"{variable} is not set in backend/src/API/.env.")
        : value.Trim();
}

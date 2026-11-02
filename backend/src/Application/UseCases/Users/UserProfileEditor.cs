using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Auth;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.UseCases.Users;

/// <summary>
/// One path for editing personal fields, used by <c>PUT /me</c> and <c>PUT /users/{id}</c> (BR-AUTH-15): trim, validate,
/// check the phone number is free, then apply. The caller saves; the unique index still catches a concurrent duplicate.
/// </summary>
public sealed class UserProfileEditor
{
    private readonly IUserRepository _users;
    private readonly IValidator<UpdateProfileRequest> _validator;

    public UserProfileEditor(IUserRepository users, IValidator<UpdateProfileRequest> validator)
    {
        _users = users;
        _validator = validator;
    }

    public async Task<UpdateProfileRequest> NormalizeAndValidateAsync(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        request = request with { FullName = request.FullName?.Trim() ?? string.Empty, PhoneNumber = request.PhoneNumber?.Trim() ?? string.Empty };
        await _validator.ValidateAndThrowAsync(request, cancellationToken);
        return request;
    }

    /// <summary><paramref name="request"/> must come from <see cref="NormalizeAndValidateAsync"/>.</summary>
    public async Task ApplyAsync(User user, UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        if (request.PhoneNumber != user.PhoneNumber && await _users.ExistsByPhoneAsync(request.PhoneNumber, cancellationToken))
            throw AccountErrors.PhoneExists();
        user.UpdateProfile(request.FullName, request.PhoneNumber, request.DateOfBirth, request.Gender);
    }
}

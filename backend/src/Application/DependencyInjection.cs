using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Interfaces.Services.Auth;
using NhuNguyetSpa.Application.UseCases.Auth;

namespace NhuNguyetSpa.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddLogging();
        services.AddAutoMapper(_ => { }, typeof(DependencyInjection).Assembly);
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAccountService, AccountService>();
        return services;
    }
}

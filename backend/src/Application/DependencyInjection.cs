using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Interfaces.Services.Auth;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;
using NhuNguyetSpa.Application.Interfaces.Services.Staff;
using NhuNguyetSpa.Application.Interfaces.Services.WorkSchedules;
using NhuNguyetSpa.Application.UseCases.Auth;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Application.UseCases.Staff;
using NhuNguyetSpa.Application.UseCases.WorkSchedules;

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
        services.AddScoped<CatalogViewer>();
        services.AddScoped<ServiceCategoryResolver>();
        services.AddScoped<IServiceCatalogService, ServiceCatalogService>();
        services.AddScoped<IPackageCatalogService, PackageCatalogService>();
        services.AddScoped<ICatalogSearchService, CatalogSearchService>();
        services.AddScoped<ICatalogImageService, CatalogImageService>();
        services.AddScoped<IStaffService, StaffService>();
        services.AddScoped<IWorkScheduleService, WorkScheduleService>();
        return services;
    }
}

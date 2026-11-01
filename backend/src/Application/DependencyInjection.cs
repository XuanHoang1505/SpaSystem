using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Interfaces.Services.Auth;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;
using NhuNguyetSpa.Application.Interfaces.Services.Care;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;
using NhuNguyetSpa.Application.Interfaces.Services.Orders;
using NhuNguyetSpa.Application.Interfaces.Services.Payments;
using NhuNguyetSpa.Application.Interfaces.Services.Purchases;
using NhuNguyetSpa.Application.Interfaces.Services.Promotions;
using NhuNguyetSpa.Application.Interfaces.Services.Staff;
using NhuNguyetSpa.Application.Interfaces.Services.Treatments;
using NhuNguyetSpa.Application.Interfaces.Services.WorkSchedules;
using NhuNguyetSpa.Application.UseCases.Auth;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Application.UseCases.Care;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Application.UseCases.Orders;
using NhuNguyetSpa.Application.UseCases.Payments;
using NhuNguyetSpa.Application.UseCases.Promotions;
using NhuNguyetSpa.Application.UseCases.Purchases;
using NhuNguyetSpa.Application.UseCases.Staff;
using NhuNguyetSpa.Application.UseCases.Treatments;
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
        services.AddScoped<IAvailabilityService, AvailabilityService>();
        services.AddScoped<IAppointmentManagementService, AppointmentManagementService>();
        services.AddScoped<IPromotionService, PromotionService>();
        services.AddScoped<PromotionApplier>();
        services.AddScoped<ICartService, CartService>();
        services.AddScoped<EntitlementIssuer>();
        services.AddScoped<BookingSlotReserver>();
        services.AddScoped<MyAppointmentReader>();
        services.AddScoped<OrderPlacement>();
        services.AddScoped<OrderCancellation>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IOrderManagementService, OrderManagementService>();
        services.AddScoped<ICustomerBookingService, CustomerBookingService>();
        services.AddScoped<IMyAppointmentService, MyAppointmentService>();
        services.AddScoped<IPurchaseService, PurchaseService>();
        services.AddScoped<IServiceHistoryService, ServiceHistoryService>();
        services.AddScoped<IMyTreatmentService, MyTreatmentService>();
        services.AddScoped<ITreatmentManagementService, TreatmentManagementService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IOrderExpiryService, OrderExpiryService>();
        services.AddScoped<IAppointmentCompletionService, AppointmentCompletionService>();
        services.AddScoped<ISkinProfileService, SkinProfileService>();
        services.AddScoped<ICustomerAllergyService, CustomerAllergyService>();
        services.AddScoped<IAssignedAppointmentService, AssignedAppointmentService>();
        return services;
    }
}

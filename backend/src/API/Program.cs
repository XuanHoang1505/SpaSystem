using NhuNguyetSpa.API.Configuration;
using NhuNguyetSpa.API.Extensions;
using NhuNguyetSpa.Application;
using NhuNguyetSpa.Infrastructure;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
EnvLoader.Load(builder);
builder.Host.UseSerilog((context, configuration) => configuration.ReadFrom.Configuration(context.Configuration));
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApiFoundation(builder.Configuration);
builder.Services.AddApiAuthentication();

var app = builder.Build();
if (args.Contains(SeedCommand.Argument))
{
    await SeedCommand.RunAsync(app);
    return;
}

app.UseSerilogRequestLogging();
app.UseApiExceptionHandling();
app.UseApiStatusCodes();
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
// HTTP-only local/emulator and container profiles do not advertise an HTTPS port.
// Profiles with an HTTPS endpoint redirect HTTP requests to HTTPS.
if (!string.IsNullOrEmpty(app.Configuration["HTTPS_PORT"]) ||
    app.Configuration["ASPNETCORE_URLS"]?.Contains("https://", StringComparison.OrdinalIgnoreCase) == true)
    app.UseHttpsRedirection();
app.UseRouting();
app.UseCors(NhuNguyetSpa.API.Extensions.ServiceCollectionExtensions.CorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapApiHealthChecks();
app.Run();

public partial class Program;

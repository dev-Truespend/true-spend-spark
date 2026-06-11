using TrueSpend.Api.Extensions;
using TrueSpend.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSupabaseJwtAuth(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddTrueSpendDb(builder.Configuration);
builder.Services.AddAuthBootstrap();
builder.Services.AddOnboardingWorkflow();
builder.Services.AddRecommendationWorkflow();
builder.Services.AddInsightsWorkflow();
builder.Services.AddPlaidProvider(builder.Configuration);
builder.Services.AddStripeProvider(builder.Configuration);
builder.Services.AddTransactionWorkflow();
builder.Services.AddNotificationsWorkflow(builder.Configuration);
builder.Services.AddGeoWorkflow(builder.Configuration);
builder.Services.AddPlaidWebhook();
builder.Services.AddProfileWorkflow(builder.Configuration);
builder.Services.AddPrivacyWorkflow(builder.Configuration);
builder.Services.Configure<TrueSpend.Domain.Models.Billing.ManualResyncOptions>(builder.Configuration.GetSection("ManualResync"));

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Unauthenticated liveness probe for the App Gateway health probe and Container App probes
// (deployment-guide §4a/§13). Kept off the api/v1 controller routes so the gateway can hit /health directly.
app.MapGet("/health", () => Results.Ok(new { status = "healthy" })).AllowAnonymous();

app.Run();

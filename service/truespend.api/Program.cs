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
builder.Services.AddGeoWorkflow();
builder.Services.AddPlaidWebhook();
builder.Services.AddProfileWorkflow(builder.Configuration);

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

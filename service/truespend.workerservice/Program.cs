using Microsoft.AspNetCore.Builder;
using TrueSpend.WorkerService.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.AddWorkerService();

var app = builder.Build();
app.MapJobTriggerEndpoints();
app.Run();

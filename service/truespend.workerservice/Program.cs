using TrueSpend.WorkerService.Extensions;

var builder = Host.CreateApplicationBuilder(args);
builder.AddWorkerService();

var host = builder.Build();
host.Run();

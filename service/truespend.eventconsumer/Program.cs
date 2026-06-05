using TrueSpend.EventConsumer.Extensions;

var builder = Host.CreateApplicationBuilder(args);
builder.AddEventConsumer();
var host = builder.Build();
host.Run();

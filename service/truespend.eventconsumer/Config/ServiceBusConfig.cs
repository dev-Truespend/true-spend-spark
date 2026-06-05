namespace TrueSpend.EventConsumer.Config;

public sealed class ServiceBusConfig
{
    public const string SectionName = "ServiceBus";

    public string ConnectionString { get; set; } = string.Empty;
    public string ConsumerName { get; set; } = "truespend-eventconsumer";
    public int MaxConcurrentMessagesPerTopic { get; set; } = 4;
    public int MaxRetries { get; set; } = 5;
    public int RetryBackoffSeconds { get; set; } = 30;
}

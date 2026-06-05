namespace TrueSpend.EventConsumer.Handlers;

public interface IEventHandler
{
    Task HandleAsync(string payloadJson, CancellationToken cancellationToken);
}

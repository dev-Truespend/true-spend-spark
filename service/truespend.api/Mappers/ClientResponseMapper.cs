using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Api.Mappers;

public interface IClientResponseMapper
{
    ClientResponseVm<T> ToClientResponse<T>(BusinessResponse<T> response);
    ClientResponseVm<TVm> ToClientResponse<TDomain, TVm>(BusinessResponse<TDomain> response, Func<TDomain, TVm> projector);
}

public sealed class ClientResponseMapper : IClientResponseMapper
{
    public ClientResponseVm<T> ToClientResponse<T>(BusinessResponse<T> response) =>
        new(response.Success, response.Data, response.Errors);

    public ClientResponseVm<TVm> ToClientResponse<TDomain, TVm>(BusinessResponse<TDomain> response, Func<TDomain, TVm> projector) =>
        new(response.Success, response.Data is null ? default : projector(response.Data), response.Errors);
}

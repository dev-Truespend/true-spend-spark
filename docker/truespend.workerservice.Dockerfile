# syntax=docker/dockerfile:1.7
#
# Build context must be the service/ folder, not the repo root.
#
# Local dev (hot reload):
#   docker build -f docker/truespend.workerservice.Dockerfile --target development -t truespend-workerservice:dev service/
#   docker run --rm -v "$PWD/service":/src -e DOTNET_ENVIRONMENT=Development truespend-workerservice:dev
#
# Production (push to ACR):
#   docker build -f docker/truespend.workerservice.Dockerfile --target production -t truespend-workerservice:prod service/

# ---- restore: shared cache layer for all stages ----
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS restore
WORKDIR /src

COPY truespend.api/truespend.api.csproj                 truespend.api/
COPY truespend.domain/truespend.domain.csproj           truespend.domain/
COPY truespend.eventconsumer/truespend.eventconsumer.csproj truespend.eventconsumer/
COPY truespend.workerservice/truespend.workerservice.csproj truespend.workerservice/
COPY truespend.unit.tests/truespend.unit.tests.csproj   truespend.unit.tests/

RUN dotnet restore truespend.workerservice/truespend.workerservice.csproj

# ---- development: dotnet watch with polling file watcher ----
FROM restore AS development
WORKDIR /src
COPY . .

ENV DOTNET_ENVIRONMENT=Development \
    DOTNET_USE_POLLING_FILE_WATCHER=1 \
    DOTNET_RUNNING_IN_CONTAINER=true

CMD ["dotnet", "watch", \
     "--project", "truespend.workerservice/truespend.workerservice.csproj", \
     "--no-launch-profile", \
     "run"]

# ---- build: publish framework-dependent output ----
FROM restore AS build
WORKDIR /src
COPY . .

RUN dotnet publish truespend.workerservice/truespend.workerservice.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ---- production: ASP.NET runtime (worker hosts /health + manual-trigger HTTP), non-root ----
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS production
WORKDIR /app

COPY --from=build /app/publish .

ENV DOTNET_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_EnableDiagnostics=0

USER app

ENTRYPOINT ["dotnet", "truespend.workerservice.dll"]

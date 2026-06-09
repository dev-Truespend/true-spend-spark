# syntax=docker/dockerfile:1.7
#
# Build context must be the service/ folder, not the repo root.
#
# Local dev (hot reload):
#   docker build -f docker/truespend.api.Dockerfile --target development -t truespend-api:dev service/
#   docker run --rm -p 8080:8080 \
#     -v "$PWD/service":/src \
#     -e ASPNETCORE_ENVIRONMENT=Development \
#     truespend-api:dev
#
# Production (push to ACR):
#   docker build -f docker/truespend.api.Dockerfile --target production -t truespend-api:prod service/

# ---- restore: shared cache layer for all stages ----
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS restore
WORKDIR /src

COPY truespend.api/truespend.api.csproj                 truespend.api/
COPY truespend.domain/truespend.domain.csproj           truespend.domain/
COPY truespend.eventconsumer/truespend.eventconsumer.csproj truespend.eventconsumer/
COPY truespend.workerservice/truespend.workerservice.csproj truespend.workerservice/
COPY truespend.unit.tests/truespend.unit.tests.csproj   truespend.unit.tests/

RUN dotnet restore truespend.api/truespend.api.csproj

# ---- development: dotnet watch with polling file watcher ----
FROM restore AS development
WORKDIR /src
COPY . .

ENV ASPNETCORE_ENVIRONMENT=Development \
    ASPNETCORE_URLS=http://+:8080 \
    DOTNET_USE_POLLING_FILE_WATCHER=1 \
    DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 8080

CMD ["dotnet", "watch", \
     "--project", "truespend.api/truespend.api.csproj", \
     "--no-launch-profile", \
     "run"]

# ---- build: publish framework-dependent output ----
FROM restore AS build
WORKDIR /src
COPY . .

RUN dotnet publish truespend.api/truespend.api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ---- production: minimal aspnet runtime, non-root ----
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS production
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_EnableDiagnostics=0

EXPOSE 8080
USER app

ENTRYPOINT ["dotnet", "truespend.api.dll"]

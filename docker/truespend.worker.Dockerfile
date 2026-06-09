# syntax=docker/dockerfile:1.7
#
# Production-only image that bundles truespend.eventconsumer +
# truespend.workerservice into a single container and runs both as child
# processes. Used for ACA deployment so scheduled jobs and Service Bus
# consumption share one container.
#
# The two projects stay independent at the .NET level (no ProjectReference);
# packaging is done here at the Docker layer.
#
# Build context must be the service/ folder, not the repo root.
#
# Build:
#   docker build -f docker/truespend.worker.Dockerfile --target production -t truespend-worker:prod service/

# ---- restore: shared cache layer ----
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS restore
WORKDIR /src

COPY truespend.api/truespend.api.csproj                 truespend.api/
COPY truespend.domain/truespend.domain.csproj           truespend.domain/
COPY truespend.eventconsumer/truespend.eventconsumer.csproj truespend.eventconsumer/
COPY truespend.workerservice/truespend.workerservice.csproj truespend.workerservice/
COPY truespend.unit.tests/truespend.unit.tests.csproj   truespend.unit.tests/

RUN dotnet restore truespend.eventconsumer/truespend.eventconsumer.csproj && \
    dotnet restore truespend.workerservice/truespend.workerservice.csproj

# ---- build: publish both projects into separate output folders ----
FROM restore AS build
WORKDIR /src
COPY . .

RUN dotnet publish truespend.eventconsumer/truespend.eventconsumer.csproj \
    -c Release \
    -o /app/eventconsumer \
    --no-restore \
    /p:UseAppHost=false

RUN dotnet publish truespend.workerservice/truespend.workerservice.csproj \
    -c Release \
    -o /app/workerservice \
    --no-restore \
    /p:UseAppHost=false

# ---- production: minimal runtime, runs both processes under a shared shell ----
FROM mcr.microsoft.com/dotnet/runtime:9.0 AS production
WORKDIR /app

COPY --from=build /app/eventconsumer  ./eventconsumer
COPY --from=build /app/workerservice  ./workerservice

# Entrypoint script: launch both .NET processes as background children, forward
# SIGTERM/SIGINT to them, and exit as soon as either child exits so the
# orchestrator restarts the whole container instead of running degraded.
RUN <<EOF cat > /app/entrypoint.sh
#!/bin/sh
set -e
trap 'kill 0' TERM INT
dotnet /app/eventconsumer/truespend.eventconsumer.dll &
dotnet /app/workerservice/truespend.workerservice.dll &
wait -n
exit $?
EOF
RUN chmod +x /app/entrypoint.sh && chown -R app:app /app

ENV DOTNET_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_EnableDiagnostics=0

USER app

ENTRYPOINT ["/app/entrypoint.sh"]

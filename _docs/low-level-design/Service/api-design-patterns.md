# API Design Patterns

Simple structure for the .NET service projects in this repo.

## Post-commit side-effects

| Topic | MVP behaviour |
|---|---|
| When | Producer business classes call the handler-target collaborator **after** `unitOfWork.CommitAsync(ct)` succeeds; never inside the transaction. |
| Failure policy | Wrap each call in `try { await collaborator.X(...); } catch (Exception ex) { logger.LogWarning(ex, "..."); }`. Never re-throw to the API caller. |
| Collaborators | Examples: `IAnalyticsComputeBusiness.RecomputeSnapshotsAsync`, `INotificationsDispatchBusiness.DispatchPushAsync`, `INotificationInboxCacheInvalidatorBusiness.InvalidateAsync`, `IEntitlementCacheInvalidatorBusiness.InvalidateAsync`, `IBillingPaymentMethodCacheInvalidatorBusiness.InvalidateAsync`, `IAIInsightsCacheInvalidatorBusiness.InvalidateForUserAsync`, `IPlaidReauthNotificationBusiness.ProduceForStatusChangeAsync`, `IPlaidNewAccountsNotificationBusiness.ProduceForNewAccountsAsync`, `ICardsCacheInvalidatorBusiness.InvalidateAsync`, `IMissedRewardNotificationBusiness.ProduceForMissedRewardEventAsync`. |
| Per-user dedupe | When a producer writes N rows for the same user in one operation (e.g. Plaid transaction sync), call `RecomputeSnapshotsAsync(userId)` **once per user** at the end of the batch — not per row. The handler is full-snapshot. |
| Two-subscriber events | Producers of `NotificationCreated` call both `INotificationsDispatchBusiness.DispatchPushAsync(notificationId)` and `INotificationInboxCacheInvalidatorBusiness.InvalidateAsync(userId)` inline, one `try/catch` per call. `INotificationsDispatchBusiness.DispatchPushAsync` handles both push and email in one call. |
| `IMessagingInsertService` ctor param | Keep as a constructor parameter on producer business classes with the inline comment `// archived: kept for future async migration`. Do not touch DI registrations. The outbox enqueue itself is moved into a `#region archive — async event-publish (disabled in MVP)` block at the end of the class. |
| Re-enable | See [_docs/Refactors/sync-execution-conversion.md § Re-enable async path later](../../Refactors/sync-execution-conversion.md#re-enable-async-path-later). |

The async event-publish path (outbox + polling consumer + handlers) is preserved in the codebase but disabled in the MVP. See the archived "Events Pattern", "`truespend.eventconsumer`", and "Event Fan-Out" sections at the end of this file for the target shape.

## Folder Structure

```text
Service/
├── truespend.api/
├── truespend.domain/
├── truespend.unit.tests/
├── truespend.eventconsumer/
└── truespend.workerservice/
```

## Projects

| Project | Type | Purpose |
|---|---|---|
| `truespend.api` | ASP.NET Core Web API | Public API endpoints |
| `truespend.domain` | Class library | Shared domain models, contracts, and business logic |
| `truespend.unit.tests` | Test project | Unit tests for business classes |
| `truespend.eventconsumer` | Worker/consumer project | Consumes async events |
| `truespend.workerservice` | Worker service project | Runs scheduled/background jobs |

## `truespend.api`

API project structure:

```text
truespend.api/
├── Controllers/
│   └── <Feature>Controller.cs
├── Middleware/
│   └── <Name>Middleware.cs
├── ViewModels/
│   └── <Name>Vm.cs
├── Mappers/
│   └── <Feature>Mapper.cs
├── Filters/
│   └── <Name>Filter.cs
├── Extensions/
│   └── <Name>Extensions.cs
└── Program.cs
```

### Content

- `Controllers/`: API endpoints
- `Middleware/`: custom request/response pipeline logic
- `ViewModels/`: request and response models
- `Mappers/`: ViewModel to domain/entity mapping and domain/entity to ViewModel mapping
- `Filters/`: API filters such as validation, exception, or authorization filters
- `Extensions/`: API setup and dependency injection extension methods

### Controller Pattern

Controllers should follow REST patterns.

Controller rules:

- Use route format `[Route("api/v1/[controller]")]`.
- Use `[Authorize]` for authenticated endpoints.
- Use role attributes such as `[RequireRole(...)]` for RBAC-protected endpoints.
- Accept only ViewModels from API requests.
- Map ViewModels to domain entities or domain inputs using `Mappers/`.
- Call `Business/` classes through interfaces.
- Do not put business logic in controllers.
- Map business responses to client response ViewModels using `Mappers/`.
- Return a common client response mapped from the business response.
- Put the response ViewModel inside the common response `data` property.
- Let controllers return the HTTP status code provided by the business response.
- Accept `CancellationToken cancellationToken` in every action method and propagate it to every business call.

Business classes return one common response model for every method:

```text
BusinessResponse<T>
```

The common response model should support:

- success or failure
- data
- errors
- exception details when needed
- validation details when needed
- HTTP status code

Controllers should not decide status-code rules. Business classes set the status code in the common response.

Dependency rules:

- Controllers depend on business interfaces.
- Controllers depend on mapper interfaces.
- Controllers do not depend on concrete business or mapper classes.

Mapper rules:

- Request ViewModel -> domain entity/domain input.
- Domain entity/domain result -> response ViewModel.
- `BusinessResponse<T>` -> common client response.
- Response ViewModel goes into common client response `data`.

### Mappers Pattern

Mappers should stay simple.

Mapper rules:

- Put mapping logic in `Mappers/`.
- Name mapper files `<Feature>Mapper.cs`.
- Use mappers for ViewModel -> entity/domain input.
- Use mappers for entity/domain result -> ViewModel.
- Each ViewModel mapping should have its own mapper class.
- Keep request ViewModel -> entity/domain input mapping separate from response mapping when they are different concerns.
- Use common mappers for `BusinessResponse<T>` -> common client response.
- Use common mappers for any shared mapping used across controllers.
- Do not put business decisions in mappers.
- Do not put database calls in mappers.

### Middleware Pattern

Middleware is only for custom middleware with real custom logic.

Middleware rules:

- Put each custom middleware concern in its own class.
- Name middleware files `<Name>Middleware.cs`.
- Register custom middleware in `Program.cs`.
- Do not put custom middleware logic directly in `Program.cs`.

Examples:

```text
AuthMiddleware.cs
CorrelationIdMiddleware.cs
ExceptionMiddleware.cs
RequestLoggingMiddleware.cs
```

### Filters Pattern

Filters are only for custom controller/action filters with real custom logic.

Filter rules:

- Put each custom filter concern in its own class.
- Name filter files `<Name>Filter.cs`.
- Register custom filters in `Program.cs`.
- Use filters for controller-level or action-level behavior.
- Do not put custom filter logic directly in controllers or `Program.cs`.

### Extensions Pattern

Extensions are for setup and registration helpers.

Extension rules:

- Use `Extensions/` to keep `Program.cs` clean.
- Name extension files `<Name>Extensions.cs`.
- Put dependency injection setup in extension methods.
- Put API setup helpers in extension methods.
- Do not put business logic, mapper logic, middleware logic, or filter logic in extensions.

External provider pattern:

- For each external provider (Plaid, Stripe, Foursquare, etc.) define one interface in `ServiceInterfaces/`, one real implementation in `Services/`, and one placeholder implementation in `Services/` that returns realistic stub data.
- The placeholder must implement the same interface and return shaped, non-empty data so flows work without credentials in development.
- The extension method registers the real implementation when provider credentials are present in config and the placeholder otherwise.
- Do not conditionally branch on provider type inside business classes. The interface hides which implementation is active.

### Config Pattern

Use separate app settings files per environment.

```text
appsettings.Development.json
appsettings.Production.json
```

Do not hardcode environment-specific settings in code.

### ViewModels Pattern

ViewModels are the API contract with clients.

ViewModel rules:

- Every API should have a request ViewModel and a response ViewModel.
- Request files are named `<Action>RequestVm.cs`.
- Response files are named `<Action>ResponseVm.cs`.
- Each ViewModel should be its own class.
- Each ViewModel should be in its own file.
- ViewModels should contain only properties the client needs.
- Do not expose internal database, domain, provider, or audit fields unless the client needs them.
- Controllers should accept request ViewModels.
- Controllers should return a common client response with the response ViewModel in `data`.

## `truespend.domain`

Domain project structure:

```text
truespend.domain/
├── Business/
│   └── <Feature>/
│       ├── <Feature>ReadBusiness.cs
│       ├── <Feature>InsertBusiness.cs
│       ├── <Feature>UpdateBusiness.cs
│       └── <Feature>DeleteBusiness.cs
├── BusinessInterfaces/
│   └── <Feature>/
│       ├── I<Feature>ReadBusiness.cs
│       ├── I<Feature>InsertBusiness.cs
│       ├── I<Feature>UpdateBusiness.cs
│       └── I<Feature>DeleteBusiness.cs
├── Entities/
│   └── EntityConfigurations/
├── Events/
├── Constants/
├── Enums/
├── Exceptions/
├── DbContext/
├── Models/
│   └── <Feature>/
│       └── <Name>.cs
├── Services/
│   └── <Feature>/
│       ├── <Feature>ReadService.cs
│       ├── <Feature>InsertService.cs
│       ├── <Feature>UpdateService.cs
│       └── <Feature>DeleteService.cs
├── ServiceInterfaces/
│   └── <Feature>/
│       ├── I<Feature>ReadService.cs
│       ├── I<Feature>InsertService.cs
│       ├── I<Feature>UpdateService.cs
│       └── I<Feature>DeleteService.cs
└── Validators/
```

### Content

- `Business/`: business logic classes, separated by feature and operation
- `BusinessInterfaces/`: business interfaces, separated by feature and operation
- `Entities/`: domain/database entities
- `Entities/EntityConfigurations/`: entity mapping/configuration classes
- `Events/`: domain events and messaging contracts
- `Constants/`: shared constant values
- `Enums/`: shared enum types
- `Exceptions/`: domain-specific exceptions
- `DbContext/`: database context classes
- `Models/`: domain model types and API contracts, one subfolder per feature
- `Services/`: database calls only, separated by feature and operation
- `ServiceInterfaces/`: service interfaces, separated by feature and operation
- `Validators/`: business and request validation

### Models Pattern

Domain model types live in `Models/`, one subfolder per feature.

Model rules:

- Place each type in `Models/<Feature>/<Name>.cs`.
- Use plain class names (`CardSummary`, `Merchant`, `RecommendationCard`). Do not use a `Vm` suffix on domain models.
- `Vm` suffix is reserved for `truespend.api/ViewModels/` only.
- Do not put business logic in model classes.
- Do not put EF entity classes in `Models/`; those belong in `Entities/`.

Use file names like:

```text
Models/Cards/CardSummary.cs
Models/Recommendations/Recommendation.cs
Models/Billing/EntitlementsResponse.cs
```

### Business Pattern

Business classes should be separated by feature and purpose.

Business classes contain orchestration logic.

Business responsibilities:

- Validate request and domain rules using `Validators/`.
- Check ownership and business permissions beyond controller RBAC.
- Check feature gates and entitlements.
- Call `Services/` to read from the database.
- Call multiple services when one operation needs multiple database reads or writes.
- Apply business decisions and rules.
- Coordinate database transactions when one operation has multiple writes using `IUnitOfWork` / `IUnitOfWorkTransaction`.
- Commit or roll back transactions explicitly; never leave them open.
- **MVP**: run handler-target side-effects inline post-commit (see § Post-commit side-effects). The outbox enqueue via `IMessagingInsertService` is archived; the constructor parameter is preserved with `// archived: kept for future async migration`.
- Handle concurrency, conflicts, idempotency, and retries.
- Call `Services/` to write database changes.
- Write audit records when needed.
- Create domain events when needed.
- Trigger cache invalidation when needed.
- Handle webhook business processing after signature verification.
- Handle expected domain exceptions.
- Decide success or failure.
- Set the HTTP status code in `BusinessResponse<T>`.
- Return `BusinessResponse<T>` with data or errors.
- Never return synthesized records that do not exist in the database. Return real data or an explicit empty state.

Async rules:

- All business methods are `async Task` / `async Task<T>`.
- All business methods accept `CancellationToken cancellationToken` as the last parameter.
- Pass `cancellationToken` to every EF Core call and every service call.

Common business logic:

- Put retry logic in its own business class.
- Put shared business/orchestration logic in its own business class.
- Put logging logic in business classes only.
- Put reusable logging logic in its own business class/helper.
- Reuse common logging logic wherever it makes sense.
- Reuse common business classes where it makes sense.
- Do not duplicate common business logic across feature business classes.

Use these file patterns:

```text
<Feature>ReadBusiness.cs
<Feature>InsertBusiness.cs
<Feature>UpdateBusiness.cs
<Feature>DeleteBusiness.cs
```

Use matching interfaces:

```text
I<Feature>ReadBusiness.cs
I<Feature>InsertBusiness.cs
I<Feature>UpdateBusiness.cs
I<Feature>DeleteBusiness.cs
```

Each business method returns:

```text
BusinessResponse<T>
```

### Events Pattern

> **Archived in MVP** — Side-effects run inline post-commit (see § Post-commit side-effects). The event contracts below describe the target shape and remain in the codebase for the future async-migration re-enable.

Events should be separated by feature and action.

Use event files like:

```text
Events/
└── <Feature>/
    ├── <Feature>InsertedEvent.cs
    ├── <Feature>UpdatedEvent.cs
    ├── <Feature>DeletedEvent.cs
    └── <Feature>EventContract.cs
```

Event rules:

- Create separate event classes for insert, update, and delete actions.
- Reuse the same event contract when the payload shape is the same.
- Create a smaller separate contract when the payload shape is meaningfully different.
- Keep event contracts focused on what consumers need.
- Do not expose full entities in event contracts unless consumers need every field.

### Constants Pattern

Constants should stay simple and flat.

Constant rules:

- Do not create subfolders under `Constants/`.
- Use one constants class per feature.
- Put app-wide shared constants in `Constants/`.
- Reuse constants from this folder instead of duplicating literal values.

Use file names like:

```text
CardsConstants.cs
BillingConstants.cs
AppConstants.cs
```

### Enums Pattern

Enums should stay simple and flat.

Enum rules:

- Do not create subfolders under `Enums/`.
- Create one enum per file.
- Name enum files `<Name>Enum.cs`.
- Do not group multiple enums into one feature enum file.

Use file names like:

```text
CardStatusEnum.cs
SubscriptionStatusEnum.cs
NotificationChannelEnum.cs
```

### Exceptions Pattern

Exceptions should share one base exception class.

Exception structure:

```text
Exceptions/
├── AppException.cs
├── ExceptionMessages.cs
├── ValidationAppException.cs
├── NotFoundAppException.cs
├── ForbiddenAppException.cs
├── ConflictAppException.cs
└── ExternalProviderAppException.cs
```

Exception rules:

- `AppException.cs` is the base exception class.
- Specific exception classes inherit from `AppException`.
- `ExceptionMessages.cs` contains reusable exception text messages.
- Use `ExceptionMessages` instead of duplicating exception strings.
- Business classes catch expected app exceptions and convert them to `BusinessResponse<T>`.

### DbContext Pattern

`DbContext/` contains only the database context class.

Use file name:

```text
TrueSpendDbContext.cs
```

### Services Pattern

Services should be separated by feature and purpose.

Service classes are strictly for database access.

Service rules:

- Use `DbContext` through dependency injection.
- Perform database reads and writes.
- Use Entity Framework database-first approach.
- Do not create or run EF code-first migrations.
- The database already exists and should not be created from code.
- Avoid N+1 queries strictly.
- Do not put business logic in services.
- Do not put validation logic in services.
- Do not call controllers from services.
- Do not call mappers from services.
- Do not build client responses in services.
- Do not open, commit, or roll back transactions in services. Transaction boundaries belong in business classes.
- Do not write outbox or event rows in services. Outbox rows are inserted by business classes using `IMessagingInsertService`.

Async rules:

- All service methods are `async Task` / `async Task<T>`.
- All service methods accept `CancellationToken cancellationToken` as the last parameter.
- Pass `cancellationToken` to every EF Core call.

Use these file patterns:

```text
<Feature>ReadService.cs
<Feature>InsertService.cs
<Feature>UpdateService.cs
<Feature>DeleteService.cs
```

Use matching interfaces:

```text
I<Feature>ReadService.cs
I<Feature>InsertService.cs
I<Feature>UpdateService.cs
I<Feature>DeleteService.cs
```

### Validators Pattern

Validators should be separated by feature.

Validator rules:

- Create one validator class per feature.
- Name validator files `<Feature>Validator.cs`.
- Put all validations for that feature in the same validator class.
- Do not create validators that span multiple features.
- Do not create separate validators per workflow or use case within the same feature.
- Include request, ViewModel, entity, and domain validations when needed.
- Validators may call other validators when validation is shared.
- Validators may call service classes when validation needs database reads.
- Business classes call validators before applying business rules or writing data.

Use file names like:

```text
CardsValidator.cs
BillingValidator.cs
TransactionsValidator.cs
```

## `truespend.unit.tests`

Unit tests cover only business classes from `truespend.domain/Business`.

```text
truespend.unit.tests/
├── Helpers/
└── Tests/
```

### Content

- `Helpers/`: shared test builders, fixtures, and setup helpers
- `Tests/`: tests for `Business/` classes only

### Unit Test Rules

- Unit tests should target business classes only.
- Name test files `<Feature><Action>BusinessTests.cs`.
- Always mock service interfaces.
- Mock validators when needed.
- Never call the database directly from unit tests.
- Never call external providers directly from unit tests.
- Never publish real messaging events from unit tests.
- Never use real file or storage access from unit tests.
- Never use real network or HTTP calls from unit tests.
- Never use real timers, delays, or background schedulers from unit tests.
- Never depend on current system time directly.
- Never depend on random or generated values directly.
- Never read real environment variables or appsettings from unit tests.
- Never use real authentication or JWT validation from unit tests.
- Never share mutable state between tests.
- Mock anything that publishes messages.
- Mock anything that reads from or writes to the database.
- Mock anything that calls external systems.
- Test success paths, validation failures, permission failures, idempotency, event/outbox decisions, and exception mapping.
- Each unit test class should have at most 3 positive test cases.
- Each unit test class should have at most 2 negative test cases.
- Those test cases should cover the business logic for that class.
- Do not unit test service classes here when they only contain database calls.
- Database/service behavior should be covered by integration tests later.

## `truespend.eventconsumer`

> **Archived in MVP** — The `OutboxPollingConsumer` hosted-service registration is archived in [EventConsumerExtensions.cs](../../../service/truespend.eventconsumer/Extensions/EventConsumerExtensions.cs); the consumer is built into the solution but not deployed. Side-effects run inline post-commit instead (see § Post-commit side-effects). The structure below describes the target shape and remains in the codebase for the future async-migration re-enable.

Event consumer project structure:

```text
truespend.eventconsumer/
├── Consumers/
├── Dispatchers/
├── Handlers/
│   └── Mappers/
├── Config/
├── Extensions/
└── Program.cs
```

### Consumers

`Consumers/` contains Azure Service Bus message listeners.

Consumer rules:

- Name consumer files `<Name>Consumer.cs`.
- Receive Service Bus messages.
- Deserialize the event envelope.
- Event envelope should include event id, event type, correlation id, occurred at, payload version, and payload.
- Pass the event to a dispatcher.
- Handle message complete, retry, and dead-letter decisions.
- Dead-letter poison messages after max retries with reason and details.
- Support dead-letter review and replay flow.
- Support graceful shutdown.
- Respect cancellation tokens.
- Put reusable consumer logic in its own class.
- Reuse common consumer logic where it makes sense.
- Do not put business logic in consumers.

### Dispatchers

`Dispatchers/` routes incoming events to the correct handler.

Dispatcher rules:

- Name dispatcher files `<Name>Dispatcher.cs`.
- Route by event type.
- Handle unsupported event types cleanly.
- Handle unsupported payload versions cleanly.
- Call the matching handler.
- Do not put business logic in dispatchers.

### Handlers

`Handlers/` contains event-specific processing classes.

Handler rules:

- Create a separate handler class for each event.
- Name handler files `<EventName>Handler.cs`.
- Reference `truespend.domain` for event contracts.
- Do not duplicate event contracts in `truespend.eventconsumer`.
- Check idempotency before processing each event.
- Use an idempotency store through domain business/service flow.
- Return a clear success/failure result for expected failures.
- Respect cancellation tokens.
- Do not put logging logic in handlers.
- Use event consumer mappers to map event contracts to business inputs.
- Do not call the database directly from handlers.
- Do not call external providers directly from handlers.
- Any business logic must live in `truespend.domain` and follow domain project rules.
- Handlers should call domain business classes for business logic.

### Handler Mappers

`Handlers/Mappers/` contains event-to-business mapping classes.

Mapper rules:

- Name mapper files `<EventName>Mapper.cs`.
- Map event contracts to business inputs.
- Keep mappers simple.
- Do not put business logic in mappers.
- Do not call the database from mappers.

### Config

`Config/` contains consumer and Service Bus configuration classes.

Config rules:

- Name config files `<Name>Config.cs`.
- Keep Service Bus topic, subscription, retry, and dead-letter settings here.
- Keep retry count, retry delay, exponential backoff, and max concurrency settings here.
- Keep topic and subscription naming settings here.

Use separate app settings files per environment:

```text
appsettings.Development.json
appsettings.Production.json
```

### Extensions

`Extensions/` contains setup and registration helpers.

Extension rules:

- Name extension files `<Name>Extensions.cs`.
- Register consumers, dispatchers, handlers, config, and domain dependencies.
- Keep `Program.cs` clean.

### Program

`Program.cs` starts the event consumer.

Program rules:

- Load config.
- Register dependencies through extension methods.
- Start the host.
- Keep `Program.cs` simple.
- Refer to other classes for any setup or runtime logic.
- Do not put consumer, dispatcher, handler, or business logic directly in `Program.cs`.

Event consumer flow:

```text
Consumer receives message
-> Dispatcher selects handler
-> Handler calls domain business/services
-> Handler completes, retries, or dead-letters message
```

Subscription naming:

```text
topic: <event_type>
subscription: <consumer_name>
```

Ordering rule:

- Assume events are not globally ordered unless a specific event flow requires ordering.
- If ordering is required, document it in that handler/consumer flow.

## `truespend.workerservice`

Worker service project structure:

```text
truespend.workerservice/
├── Jobs/
├── Schedulers/
├── Config/
├── Extensions/
└── Program.cs
```

### Jobs

`Jobs/` contains background job classes.

Job rules:

- Name job files `<Name>Job.cs`.
- Keep jobs focused on starting background work.
- Jobs should call domain business classes for business logic.
- Any business logic must live in `truespend.domain` and follow domain project rules.
- Put reusable job logic in its own class.
- Reuse common job logic where it makes sense.
- Jobs must be idempotent and safe to run more than once.
- Long-running jobs should process data in batches.
- Long-running jobs should support checkpointing or cursors.
- Jobs should respect cancellation tokens.
- Jobs should have max runtime or timeout rules.
- Jobs should handle poison items after max retries.
- Failed item/job attempts should be saved through domain/business flow.
- Do not put logging logic in jobs.
- Do not put database calls directly in jobs.
- Do not call external providers directly from jobs.

### Schedulers

`Schedulers/` contains schedules/timers that trigger jobs.

Scheduler rules:

- Name scheduler files `<Name>Scheduler.cs`.
- Keep schedulers focused on when jobs run.
- Schedulers should trigger jobs only.
- Prevent overlapping schedules for the same job.
- Use distributed locks when multiple worker instances can run.
- Use retry backoff for transient failures.
- Do not put business logic in schedulers.
- Do not put database calls in schedulers.
- Do not call external providers directly from schedulers.

### Config

`Config/` contains worker and job configuration classes.

Config rules:

- Name config files `<Name>Config.cs`.
- Keep schedule, batch size, retry, timeout, and job settings here.
- Keep lock, checkpoint, and max retry settings here when needed.

Use separate app settings files per environment:

```text
appsettings.Development.json
appsettings.Production.json
```

### Extensions

`Extensions/` contains setup and registration helpers.

Extension rules:

- Name extension files `<Name>Extensions.cs`.
- Register jobs, schedulers, config, and domain dependencies.
- Keep `Program.cs` clean.

### Health

Worker services should support health/readiness reporting when hosted in Azure.

### Program

`Program.cs` starts the worker service.

Program rules:

- Load config.
- Register dependencies through extension methods.
- Start the host.
- Keep `Program.cs` simple.
- Refer to other classes for any setup or runtime logic.
- Do not put job, scheduler, or business logic directly in `Program.cs`.

Worker service flow:

```text
Scheduler triggers job
-> Job calls domain business class
-> Domain business class performs orchestration
-> Job completes or retries based on worker config
```

## Event Fan-Out

> **Archived in MVP** — In the MVP, producers call each handler-target inline post-commit; there is no fan-out via Service Bus. The mapping below describes the target shape and remains in the codebase for the future async-migration re-enable.

Each outbox `event_type` maps to one Azure Service Bus topic.

Each `messaging.event_subscriptions` row maps to one topic subscription, so every consumer of an event receives its own copy.

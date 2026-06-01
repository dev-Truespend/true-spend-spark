# UI Design Patterns

Simple structure for the React Native + Expo mobile client in this repo.

The mobile client must support **both iOS and Android** from a single codebase. Every screen, component, hook, and library choice in this guide is required to work on both platforms.

Companion to [api-design-patterns.md](../Service/api-design-patterns.md). Layer names map 1:1 to the .NET service design so backend and mobile follow the same separation of concerns.

## Cross-Platform Rules

- Ship one codebase that runs on iOS and Android. Web is not a target.
- Default to JS/TS modules. Use Expo SDK modules (`expo-secure-store`, `expo-notifications`, `expo-constants`, etc.) instead of bare native modules.
- All third-party libraries must support both platforms. Verify before adding.
- Do not assume one platform's behavior. Test critical flows on both an iOS simulator and an Android emulator before merging.
- Use `Platform.OS` / `Platform.select` only when platform parity cannot be achieved through styles or shared components. Keep platform branches small and isolated.
- Use platform-specific file extensions (`<Name>.ios.tsx`, `<Name>.android.tsx`) only when an entire component diverges. Prefer a single file with `Platform.select` for small differences.
- Use `SafeAreaView` (from `react-native-safe-area-context`) and the shared `Screen.tsx` wrapper for safe-area handling on both notched iOS devices and Android edge-to-edge layouts.
- Do not hardcode pixel values that assume one platform. Use the spacing scale in `shared/theme/spacing.ts`.
- Do not use iOS-only or Android-only assets, icons, or fonts. Provide both `@2x`/`@3x` (iOS) and `mdpi`/`hdpi`/`xhdpi`/`xxhdpi`/`xxxhdpi` (Android) variants where required.
- Configure `app.config.ts` with both `ios.bundleIdentifier` and `android.package`, plus per-platform permissions (`ios.infoPlist`, `android.permissions`).
- Configure EAS Build profiles for both platforms in `eas.json`.
- Push notifications, deep links, secure storage, and biometrics must be wired up on both platforms.
- File names that differ only by case (e.g. `Card.tsx` vs `card.tsx`) are not allowed — iOS simulators tolerate it, Android builds will not.

## Stack

| Concern | Library | Service analogue |
|---|---|---|
| Routing | Expo Router (file-based) | ASP.NET attribute routing |
| Server state / cache | TanStack Query (React Query) | EF Core + memory cache |
| Client state | Zustand (only when needed) | In-memory singleton |
| Forms | React Hook Form + Zod resolver | Model binding + validators |
| Validation | Zod | FluentValidation |
| HTTP | Axios | `HttpClient` |
| Secure tokens | `expo-secure-store` | Keychain/DPAPI |
| Non-secure cache | `AsyncStorage` | Local file/cache |
| Errors / observability | Mobile monitoring TBD | App Insights |
| Push | `expo-notifications` | APNs/FCM SDK |
| Env config | `expo-constants` + `app.config.ts` | `appsettings.*.json` |
| i18n | `i18next` + `react-i18next` | `IStringLocalizer` |
| Testing | Jest + React Native Testing Library | xUnit + Moq |

## Layer Mapping

| Service layer | Mobile layer | Responsibility |
|---|---|---|
| `Controllers/` (routing + action) | `app/` route files (Expo Router) | URL/screen registration, mount the screen |
| Controller action body | `screens/<Feature>Screen.tsx` | Compose UI, wire hooks → components |
| `ViewModels/` | `types/` + screen models | Request types, response types, and screen/display models |
| `Mappers/` | `mappers/` | DTO ↔ domain model conversions |
| `Business/` (orchestration) | Custom hooks (`useXxx`) | Validate, call API, decide success/failure |
| `Services/` (DB calls) | `api/` per feature (HTTP calls) | Talk to TrueSpend API only — no UI, no logic |
| `Validators/` | Zod schemas | Request + form validation |
| `Entities/` + DTOs | `types/` (TypeScript) | Domain types + API contracts |
| `DbContext` | React Query cache + `SecureStore`/`AsyncStorage` | Cached server state + local persistence |
| `Exceptions/` (`AppException`) | `errors/` classes + error boundary | Typed errors mapped to UI states |
| `Middleware/` | Axios interceptors, Query middleware | Auth headers, retries, error mapping |
| `Filters/` (`[Authorize]`) | Route group `(app)` + guard layout | Protect screens behind auth/role |
| `Constants/`, `Enums/` | `constants/`, `enums/` | Identical role |
| `Program.cs` (DI) | `app/_layout.tsx` + `providers/` | Bootstrap providers (Query, Auth, Theme) |
| `appsettings.{Env}.json` | `app.config.ts` + `expo-constants` | Per-env config (dev/staging/prod) |
| `truespend.unit.tests` | `__tests__/` (Jest + RNTL) | Test hooks and meaningful component behavior, mock API layer |

## Folder Structure

```text
truespend-mobile/
├── app/                              # Expo Router — routes only (≈ Controllers + [Route])
│   ├── _layout.tsx                   # Root: providers, splash, font load (≈ Program.cs)
│   ├── (auth)/                       # Route group: unauthenticated
│   │   ├── _layout.tsx               # Redirects to (app) if already signed in
│   │   ├── login.tsx
│   │   └── verify.tsx                # Passwordless OTP/OAuth callback flow
│   ├── (app)/                        # Route group: authenticated
│   │   ├── _layout.tsx               # Auth guard (≈ [Authorize] filter)
│   │   ├── (tabs)/                   # Bottom-tab navigator
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx             # Home
│   │   │   ├── cards.tsx
│   │   │   ├── insights.tsx
│   │   │   └── profile.tsx
│   │   ├── cards/
│   │   │   ├── [id].tsx              # Card detail (dynamic route)
│   │   │   └── new.tsx
│   │   └── billing/
│   │       └── plans.tsx
│   └── +not-found.tsx
│
├── src/
│   ├── features/                     # Feature modules (mirror your domain features)
│   │   ├── cards/
│   │   │   ├── api/                  # ≈ Services — HTTP only
│   │   │   │   └── cards.api.ts
│   │   │   ├── hooks/                # ≈ Business — orchestration
│   │   │   │   ├── useCards.ts       # React Query read
│   │   │   │   ├── useAddCard.ts     # Mutation
│   │   │   │   └── useDeleteCard.ts
│   │   │   ├── components/           # Feature-only UI
│   │   │   │   ├── CardListItem.tsx
│   │   │   │   └── CardForm.tsx
│   │   │   ├── screens/              # Page composition (mounted by app/ routes)
│   │   │   │   ├── CardsScreen.tsx
│   │   │   │   └── CardDetailScreen.tsx
│   │   │   ├── schemas/              # ≈ Validators (Zod)
│   │   │   │   └── card.schema.ts
│   │   │   ├── mappers/              # ≈ Mappers — DTO ↔ domain
│   │   │   │   └── card.mapper.ts
│   │   │   └── types/                # ≈ Entities + request/response/screen models
│   │   │       └── card.types.ts
│   │   ├── transactions/
│   │   ├── billing/
│   │   └── auth/
│   │
│   ├── shared/                       # Cross-cutting (≈ truespend.domain shared)
│   │   ├── api/
│   │   │   ├── client.ts             # Axios instance (≈ HttpClient factory)
│   │   │   ├── interceptors.ts       # Auth header, refresh, error mapping
│   │   │   └── queryClient.ts        # TanStack Query config (≈ DbContext options)
│   │   ├── components/               # Design system — reusable primitives
│   │   │   ├── Button.tsx
│   │   │   ├── TextInput.tsx
│   │   │   ├── Screen.tsx            # Safe-area wrapper
│   │   │   └── Spinner.tsx
│   │   ├── hooks/                    # Reusable hooks (useDebounce, useKeyboard)
│   │   ├── storage/
│   │   │   ├── secureStorage.ts      # expo-secure-store wrapper (tokens)
│   │   │   └── cacheStorage.ts       # AsyncStorage wrapper
│   │   ├── navigation/
│   │   │   └── guards.ts             # useAuthGuard, useRoleGuard
│   │   ├── theme/                    # Colors, typography, spacing
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   └── spacing.ts
│   │   ├── constants/                # ≈ Constants (one file per concern)
│   │   ├── enums/                    # ≈ Enums (one per file)
│   │   ├── errors/                   # AppError + subclasses, error mapper
│   │   ├── utils/                    # Pure helpers (formatCurrency, parseDate)
│   │   ├── config/                   # env reader (wraps expo-constants)
│   │   └── types/                    # Global ambient types
│   │
│   └── providers/                    # App-wide DI (≈ Program.cs registrations)
│       ├── QueryProvider.tsx
│       ├── AuthProvider.tsx
│       ├── ThemeProvider.tsx
│       └── AppProviders.tsx          # Composes all of the above
│
├── assets/                           # Images, fonts, icons
├── __tests__/                        # Jest + RNTL (or co-located *.test.ts)
├── app.config.ts                     # Per-env config (≈ appsettings.*.json)
├── tsconfig.json                     # Path alias: `@/*` → `src/*`
├── package.json
└── eas.json                          # EAS Build/Submit profiles (dev/staging/prod)
```

## `app/`

Expo Router owns this folder. Files here are routes; nothing else.

Route rules:

- One file per route. File name = URL segment.
- Use route groups `(name)/` to share a layout without adding a URL segment.
- Use `_layout.tsx` for nested navigators, providers scoped to a subtree, and route guards.
- Use `[param].tsx` for dynamic segments.
- Use `+not-found.tsx` for unmatched routes.
- Route files should only render a screen component from `src/features/<feature>/screens/` and set navigator options.
- Do not put business logic, API calls, or feature components directly in route files.

Route groups:

| Group | Purpose |
|---|---|
| `(auth)/` | Unauthenticated passwordless routes (login, OTP verification, OAuth callbacks). Layout redirects to `(app)` when a session exists. |
| `(app)/` | Authenticated routes. Layout enforces auth guard and loads the authenticated shell. |
| `(tabs)/` | Bottom-tab navigator inside `(app)/`. |

## `src/features/<feature>/`

Feature modules mirror the domain features in `truespend.domain` (cards, transactions, billing, auth, …).

### `api/`

Service equivalent — HTTP only.

Rules:

- Name files `<feature>.api.ts`.
- Use the shared Axios client from `src/shared/api/client.ts`.
- Build the request, call the endpoint, return the typed common API response.
- API responses use the common client response shape from the backend.
- Response payloads live in the common response `data` property.
- Do not validate inputs.
- Do not transform DTO to domain model.
- Do not catch errors for UI presentation.
- Do not call hooks, components, or other features.

### `hooks/`

Business equivalent — orchestration.

Rules:

- One hook per operation. Name `use<Action><Feature>.ts`.
- Use React Query: `useQuery` for reads, `useMutation` for writes.
- Validate inputs with the feature Zod schema before calling `api/`.
- Hooks may call multiple `api/` modules when one screen flow needs multiple API requests.
- Call `mappers/` to convert DTO ↔ domain model.
- Unwrap common API responses and use the mapped `data` payload.
- Handle expected errors and map to typed `AppError` subclasses.
- Trigger cache invalidation on mutation success.
- Handle client-side retry/idempotency behavior when needed.
- Expose `{ data, error, isLoading, mutate }` (or equivalent).
- Do not render JSX.
- Do not call native APIs directly — wrap in `src/shared/`.

### `components/`

Feature-only presentational components.

Rules:

- Name files `PascalCase.tsx`.
- Receive data via props.
- Raise events via callback props.
- Use primitives from `src/shared/components/`.
- Do not fetch data.
- Do not hold business rules.
- Do not import from other features.

### `screens/`

Page composition mounted by `app/` route files.

Rules:

- Name files `<Feature>Screen.tsx` or `<Feature><Subject>Screen.tsx`.
- Call feature hooks for data and mutations.
- Compose `components/` to build the page.
- Handle navigation transitions.
- Do not call `api/` directly — always go through hooks.
- Do not contain business rules.

### `schemas/`

Validator equivalent — Zod schemas.

Rules:

- Name files `<feature>.schema.ts`.
- Export Zod schemas for requests, forms, and shared shapes.
- Infer TS types from schemas (`z.infer<typeof Schema>`).
- Reuse across forms (RHF) and hooks (pre-API validation).
- Do not call API.
- Do not hold business decisions.

### `mappers/`

Mapper equivalent — DTO ↔ domain only.

Rules:

- Name files `<feature>.mapper.ts`.
- DTO → domain model (response mapping).
- Domain input → DTO (request mapping).
- Keep request and response mapping separate when concerns differ.
- Do not call API.
- Do not hold business decisions.

### `types/`

Domain types, API contracts, and screen models for the feature.

Rules:

- Name files `<feature>.types.ts`.
- Export request types, response types, domain model types, and screen/display model types.
- API response types should reflect the common client response with `data`.
- Prefer types inferred from Zod schemas when shapes overlap.
- Do not export runtime values.

## `src/shared/`

Cross-cutting concerns. Nothing here may import from `features/`.

### `api/`

| File | Purpose |
|---|---|
| `client.ts` | Single Axios instance, base URL, timeouts. |
| `interceptors.ts` | Auth header injection, 401 → refresh flow, error → `AppError` mapping. |
| `queryClient.ts` | TanStack Query client config (stale time, retry, cache time). |

### `components/`

Design system primitives reused across features.

Rules:

- Name files `PascalCase.tsx`.
- Pure presentation. No data fetching, no business logic.
- Theme tokens come from `shared/theme/`.

### `hooks/`

Reusable hooks not tied to a feature (e.g. `useDebounce`, `useKeyboard`, `useAppState`).

### `storage/`

| File | Purpose |
|---|---|
| `secureStorage.ts` | `expo-secure-store` wrapper for tokens and other secrets. |
| `cacheStorage.ts` | `AsyncStorage` wrapper for non-sensitive cache. |

Rules:

- One wrapper per backing store.
- Typed `get<T>`/`set<T>`/`remove` API.
- Do not store sensitive data in `AsyncStorage`.

### `navigation/`

Route guards and navigation helpers (`useAuthGuard`, `useRoleGuard`).

### `theme/`

| File | Purpose |
|---|---|
| `colors.ts` | Color tokens (light/dark). |
| `typography.ts` | Font family, sizes, weights, line heights. |
| `spacing.ts` | Spacing scale. |

### `constants/`

App-wide constant values. Flat structure, one file per concern. Same rules as the service `Constants/` pattern.

### `enums/`

Shared enum types. Flat structure, one enum per file, named `<Name>Enum.ts`. Same rules as the service `Enums/` pattern.

### `errors/`

| File | Purpose |
|---|---|
| `AppError.ts` | Base error class. |
| `ValidationAppError.ts`, `NotFoundAppError.ts`, `ForbiddenAppError.ts`, `ConflictAppError.ts`, `NetworkAppError.ts` | Specific error classes. |
| `errorMessages.ts` | Reusable error text. |
| `errorMapper.ts` | API error response → `AppError` subclass. |

Rules:

- Mirror the service `Exceptions/` pattern.
- Hooks catch expected `AppError` subclasses and surface them through return values.
- Unexpected errors bubble to a top-level error boundary and the selected mobile monitoring tool.

### `utils/`

Pure helpers (`formatCurrency`, `parseDate`, `truncate`). No side effects.

### `config/`

Env config reader. Wraps `expo-constants.expoConfig.extra`. Single typed `config` object consumed by the rest of the app.

### `types/`

Global ambient types (module declarations, env types).

## `src/providers/`

App-wide providers — the DI equivalent.

| File | Purpose |
|---|---|
| `QueryProvider.tsx` | Wraps app in `QueryClientProvider`. |
| `AuthProvider.tsx` | Exposes session, sign-in, sign-out via context. |
| `ThemeProvider.tsx` | Exposes theme tokens and dark/light mode. |
| `AppProviders.tsx` | Composes all providers into one component. |

Rules:

- `app/_layout.tsx` renders `<AppProviders>` only.
- Providers do not hold feature logic.
- Add new providers here, not in feature code.

## Dependency Rules

Strict direction:

```text
app/  →  screens/  →  components/ + hooks/  →  api/ + mappers/ + schemas/  →  shared/
```

- Nothing in `shared/` imports from `features/`.
- Features do not import from other features. Go through `shared/` if needed.
- Route files do not import from `features/<feature>/api/` directly.
- Components do not import from `features/<feature>/api/` directly.

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component file | `PascalCase.tsx` | `CardListItem.tsx` |
| Hook file | `useCamelCase.ts` | `useCards.ts` |
| API file | `<feature>.api.ts` | `cards.api.ts` |
| Schema file | `<feature>.schema.ts` | `card.schema.ts` |
| Mapper file | `<feature>.mapper.ts` | `card.mapper.ts` |
| Types file | `<feature>.types.ts` | `card.types.ts` |
| Route file | lowercase, kebab-case if multi-word | `cards.tsx`, `[id].tsx` |
| Folder | kebab-case | `card-detail/` |
| Enum | `PascalCase` + `Enum` suffix | `CardStatusEnum` |
| Constant group | `PascalCase` object, `SCREAMING_SNAKE` keys | `CardsConstants.MAX_LIMIT` |

## Where Common Decisions Live

| Concern | Lives in |
|---|---|
| "User must be logged in to see this" | `app/(app)/_layout.tsx` guard + `AuthProvider` |
| "Refresh JWT on 401" | `shared/api/interceptors.ts` |
| "Cards list should cache for 60s" | `useCards` (React Query `staleTime`) |
| "Card limit cannot exceed $X" | `card.schema.ts` (Zod) — used by RHF + hook validation |
| "Map API `card_id` → `cardId`" | `card.mapper.ts` |
| "Toast on mutation success" | The screen/hook calling the mutation — not `api/` |
| "App-wide colors/fonts" | `shared/theme/` + `ThemeProvider` |
| "Different API URL per env" | `app.config.ts` + `shared/config/` |

## Config

Use `app.config.ts` (preferred over `app.json`) for per-env config. Expose env-specific values via `expoConfig.extra` and consume them through `src/shared/config/`.

```text
app.config.ts            # reads APP_ENV, returns ExpoConfig per env
.env.development
.env.staging
.env.production
eas.json                 # EAS Build/Submit profiles per env
```

Do not hardcode environment-specific settings in feature code.

## Testing

Tests cover hooks and meaningful component behavior only.

```text
__tests__/
├── Helpers/
└── Tests/
    ├── features/
    │   └── cards/
    │       ├── useCards.test.ts
    │       └── CardListItem.test.tsx
    └── shared/
```

Rules:

- Name test files `<Subject>.test.ts(x)`.
- Test hooks — mock the `api/` module (matches the service rule: test Business, mock Services).
- Test components with React Native Testing Library only when behavior is meaningful.
- Component tests should render, fire events, and assert visible UI or callbacks.
- Always mock the API layer.
- Always mock storage, navigation, native modules, notifications, and permissions.
- Never call the real network, real storage, real navigation, or real timers.
- Never depend on system time directly.
- Never share mutable state between tests.
- At most 3 positive and 2 negative cases per subject.
- Do not test thin `api/` modules or route files here — covered by E2E (Detox) later.
- E2E and manual smoke tests must run on both iOS and Android.

## Flow

Screen flow:

```text
Route file (app/)
  -> Screen component (features/<f>/screens/)
    -> Hook (features/<f>/hooks/) validates with schema, calls api/
      -> api/ uses shared Axios client
        -> Interceptors attach auth, map errors
      -> api/ returns common client response
      -> Mapper unwraps data and converts DTO -> domain/screen model
    -> Component (features/<f>/components/) renders domain model
```

Error flow:

```text
API error response
  -> Axios interceptor maps to AppError subclass
    -> Hook surfaces typed error in return value
      -> Screen shows error UI / toast
Unexpected error
  -> Error boundary
    -> Mobile monitoring TBD
```

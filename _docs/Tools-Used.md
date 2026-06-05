# Tools Used

## Deployments
- Vercel: used to host and deploy the web mockup.
  - Open Terminal.
  - Go to the web mockup folder:
    ```bash
    cd /Users/sravanravula/Documents/true-spend-spark/_docs/Current-Web-Mockup
    ```
  - Deploy to production:
    ```bash
    npx vercel --prod
    ```
- Netlify: used to host the mobile mockup.
  - Open Netlify.
  - Open the mobile mockup project.
  - Click browse files.
  - Upload the full `_docs/MobileApp-Mockup` folder.

## AI
- TBD

## Development Tools
- Git: used for source control and tracking project changes.
- Formspree: used to collect and store waitlist emails from the web mockup.

## Domain
- Namecheap: used for buying and managing the domain.
- Cloudflare: used for domain/DNS management.

## Email
- Gmail: used for email.
- Private Email: used for domain-based email.

## Design

## Analytics

## Payments
- Apple In-App Purchase: may be needed for iOS mobile subscriptions.
- Google Play Billing: may be needed for Android mobile subscriptions.

## Database
- Supabase Postgres: main app database.
- Supabase Storage: used for file storage.
- Azure Cache for Redis: used for short-term cache and rate limits.

## Authentication
- Supabase Auth: used for user sign-in.

## Mobile
- Expo: used to build the iOS and Android mobile app.

## Backend Infrastructure
- Azure Container Apps: hosts the backend services, including the .NET Worker Service container that runs all scheduled + queue-triggered jobs.
- Azure Service Bus: used for background events and queues.
- Hangfire (maybe): leading candidate for the in-worker job scheduler — Postgres-backed state, retries, dashboard. Not committed; alternatives (Quartz.NET, Coravel, native `IHostedService` timers, Azure Container Apps Jobs) to be evaluated before commit. See [job-architecture.md § Hosting Model](low-level-design/Service/job-architecture.md#hosting-model).

## External APIs
- Stripe: used for billing, subscriptions, free trials, checkout, and billing portal.
- Google Maps / Google Places API(maybe): used for foreground nearby merchant lookup on Home (3.x screens).
- Foursquare: used for background geofence/place detection that drives the arrival push notification flow ([10-geo-recommendations.md](Workflows/10-geo-recommendations.md)). SDK on mobile + webhook to backend.
- Plaid: tool for card/account metadata and linked transaction import.
- RewardsCC: used for credit card rewards information.

## Security
- Azure Key Vault: used to store API keys and service secrets.

## Admin
- Bitwarden: used to store and manage passwords securely.

## Monitoring
- Azure Log Analytics: used for logs.
- Application Insights: used for backend monitoring and error tracking.
- Mobile app monitoring: TBD.

## Documentation

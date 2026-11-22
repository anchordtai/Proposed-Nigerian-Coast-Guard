# Proposed Nigerian Coast Guard public information platform

A public information platform for the Provisional Committee. The proposed institution has no operational or recruitment authority on this site. The crest is a proposed design and the maritime photographs are illustrative. The project intentionally contains no vessel tracking, personnel database, patrol routes, emergency dispatch or tactical systems.

## Local setup

Use Node 22 or newer and PostgreSQL 16 or newer. Create a project-specific database and role or start a local instance with `docker run --name coast-guard-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=coast_guard -p 5432:5432 -d postgres:16`.

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and fill in the local database URL and a secret generated with `openssl rand -hex 32`.
3. Run `npm run db:migrate`, then `npm run api`.
4. In a second terminal, run `npm run dev`. Visit http://localhost:5173.
5. Run `npm test` to exercise the API against a temporary PostgreSQL-compatible engine and `npm run build` to type-check, bundle and generate page metadata.

React, TypeScript and Vite power the public site and admin interface. The admin interface and Leaflet map are loaded on demand. An Express API uses parameterized PostgreSQL queries, a relational schema and ordered SQL migrations. Store signed-in sessions, private enquiries and bounded media uploads in PostgreSQL. Vercel serves the frontend and proxies same-origin API requests to Render.

## Deployment

- Use the dedicated Render workspace and service for this repository. The included Blueprint refers to an existing project-specific preview PostgreSQL instance in Frankfurt. Apply the Blueprint or set the same variables manually. If the database name changes, update the reference before applying.
- Connect the repository to Vercel using Vite with repository root, `npm run build` and output `dist`. Confirm the API rewrite in `vercel.json` targets the actual Render service hostname. Set `FRONTEND_URL` to the exact public Vercel origin (HTTPS), and use the same site origin for `VITE_SITE_URL` if a custom domain is configured later. Keep `VITE_API_URL` unset for same-origin admin cookies and upload previews.
- Before accepting public submissions, move to a durable PostgreSQL plan/provider with tested backups, review the privacy notice and retention policy, and confirm the operator’s authorization and legal obligations. Free Render Postgres expires after 30 days. Preview database content must remain disposable.
- Confirm `/api/health` through both providers, then verify admin login and cookie behavior from the Vercel domain, document upload, email delivery (if configured), cache boundaries and a test restore. Never test with real public submissions.
- Set project secrets only in the provider dashboard. Render Free blocks common SMTP ports; the HTTPS Resend adapter is an alternative. Configure a verified sender and a project-specific key. Never print or commit credentials.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Render internal or managed PostgreSQL connection URL. Require provider-appropriate TLS for external connections. |
| `SERVER_SECRET` | Stable random secret of at least 32 characters for hashing tokens and rate-limit keys. Rotating ends existing sessions and invalidates outstanding tokens. |
| `FRONTEND_URL` | Allowed browser origin and base for email links. |
| `NODE_ENV`, `PORT` | Set production mode on Render. Let Render provide the listening port. |
| `VITE_SITE_URL` | Site origin for canonical URLs and sitemap. |
| `VITE_DEV_API_TARGET` | Local Vite proxy target. |
| `VITE_API_URL` | Optional public API base; use the same-origin default for admin sessions. |
| `ENGAGEMENT_ENABLED` | Enables storing general enquiries after review. Defaults off. |
| `NEWSLETTER_ENABLED` | Enables double opt-in signup only with working email delivery. Defaults off. |
| `CONSULTATION_AUTHORIZED`, `RECRUITMENT_AUTHORIZED` | Publish and accept submissions only after formal authorization. Default off. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional HTTPS delivery adapter and verified sender. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Optional SMTP delivery. Resend takes priority when configured. |
| `ENQUIRY_NOTIFY_TO` | Optional staff mailbox for notification references. |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | One-time super-administrator seed input. |

## Admin access and operation

On Render, set both `BOOTSTRAP_ADMIN_*` variables in the service environment and redeploy. The password must be at least 14 characters and no more than 72 UTF-8 bytes. Startup creates the first super administrator only when none exists. After signing in at `/admin`, remove the two bootstrap values from Render and redeploy. For a local or externally connected administrative environment, run `npm run db:migrate` followed by `npm run admin:create` with the seed variables. Create individual staff accounts from the dashboard and give each the least access required. The role-to-permission map is in `server/access.mjs`.

Create content as a draft, preview its formatted body and image, then publish immediately or schedule a date. Layout settings are in Settings and Content. Put public content in the appropriate collection. Documentation distinguishes built-in text from CMS entries. Built-in pages provide a public fallback while the API sleeps or is unavailable. Seeded static material is revised through the repository; CMS content, settings, news, documents, milestones, menu links and other additions are maintained in the dashboard.

Staff can review private queues, record internal enquiry notes, update statuses and export CSV. Restrict exports to authorized staff on managed devices. The newsletter handles signup, confirmation, unsubscribe and subscriber export. Send editorial campaigns separately with approved tooling and appropriate unsubscribe handling. The admin system includes password resets when email is available. MFA requires an external access gateway or a future identity provider integration.

## API and data

- Public read paths include `GET /api/config`, `/api/content`, `/api/content/:kind/:slug`, `/api/media/:id` and `/api/health`.
- Public write paths include `POST /api/enquiries`, `/api/newsletter`, `/api/newsletter/confirm`, `/api/newsletter/unsubscribe`, and gated intake under `/api/intake/:kind/:slug`.
- Auth endpoints are `POST /api/auth/login`, `reset-request` and `reset`. Administrative endpoints live under `/api/admin` and require a session plus assigned permissions.
- `server/migrations/` is authoritative for the DB. It stores roles and permissions, editorial collections, media, settings, sessions, reset tokens, queues, subscribers and the audit trail. Migrations take a transaction lock and only run once per database.
- Use an access-controlled backup location, encryption, an approved retention schedule, and periodic test restores. For a portable backup, use `pg_dump --format=custom` against an approved connection, then `pg_restore` into a separate staging database for verification. Never use real public data for development testing.
- Security controls include bcrypt with a cost of 12, hashed random tokens, strict HttpOnly HTTPS cookies, origin checks for changes, server-side per-role authorization, login lockouts, database-backed rate limiting, validation, download-only PDFs and audit events. File validation checks type and size; production acceptance of external uploads should add malware scanning and quotas. Public enquiry spam controls use a honeypot and rate limiting. No independent penetration test or legal compliance certification is implied.

## Source notes

- [National Assembly of Nigeria](https://nass.gov.ng/page/notices.html) and [Senate Bills Register (SB. 575)](https://nass.gov.ng/documents/billdownload/11207.pdf).
- [National Assembly Library Trust Fund summary of July 2026 proceedings](https://naltf.gov.ng/senate-suspends-report-on-nigeria-coast-guard-bill-over-concerns-of-role-duplication-with-nigerian-navy/). Check later official parliamentary records before editing the status notice.
- [NIMASA Maritime Safety and Security](https://nimasa.gov.ng/what-we-do/maritime-safety-security/), [Nigerian Ports Authority public information](https://nigerianports.gov.ng/faqs/) and [Nigeria Data Protection Commission](https://ndpc.gov.ng/).
- Research references for content organization included the U.S. Coast Guard's Homeport information architecture. The visual design and branding are project-specific. Map tiles and map credits are provided by OpenStreetMap contributors.

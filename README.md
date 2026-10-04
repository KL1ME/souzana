# Souzana Klimentidi Law Office Website

Professional website for Klimentidi – Tsilivaraki & Associates, a law firm based in Kalamata and Athens. The project presents practice areas, team profiles, legal insights, and media appearances in a Greek-language experience.

## Live site

- [GitHub Pages](https://kl1me.github.io/souzana/)

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Radix UI primitives
- Static export for GitHub Pages

## Content areas

- Home page with hero, practice preview, and team introduction
- Practice areas
- Team
- Insights with individual article pages
- Media appearances
- THEMIS, an API-connected assistant available throughout the site

## Project structure

- `app/`: routes, metadata, and page composition
- `components/`: layout, sections, and UI primitives
- `lib/content.ts`: centralized site copy and structured content
- `public/`: images and static assets

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages build

```bash
npm ci
GITHUB_PAGES=true npm run build
```

## THEMIS

THEMIS is inspired by [Themis](https://en.wikipedia.org/wiki/Themis), associated with justice, law, and order. The Greek-first chat panel uses a minimal white box with black text and gold borders and controls. Its first scope is the firm's published services, team, and locations; its instructions direct specific legal cases to a lawyer.

The website stays a static export. A separate Node.js service calls the [OpenAI Responses API](https://developers.openai.com/api/docs/quickstart) with the API key on the backend and stores approved knowledge in SQLite at `data/themis.sqlite`. The API creates the database and refreshes the published website records from `lib/content.ts` when it starts; restart it after content updates. Manually imported records survive this refresh.

For each question, THEMIS follows this order:

1. Search the local database for approved, unexpired passages. Ask the model whether those passages actually support an answer. A practice-area description alone is not evidence for a legal rule. A supported answer returns immediately with links to its database sources.
2. If no supported database answer is available, use OpenAI's [web search tool](https://developers.openai.com/api/docs/guides/tools-web-search). Require an actual search and valid clickable citations from the configured official domains, initially `gov.gr`, `et.gr`, and `europa.eu`.
3. If neither source provides evidence, explain that the answer could not be verified. An optional model-knowledge fallback can provide a clearly labelled general explanation; it is disabled by default and its instructions exclude current legal rules and individual deadlines.

The model's training knowledge is not a database we can search or update. The application-owned SQLite database is the local source we can inspect, approve, and maintain. Local search uses Greek-normalized full-text matching and bounded excerpts. Optional Drive knowledge uses asynchronous OpenAI managed retrieval, filtered by a separate approved-document catalogue. Answer coverage and legal boundaries depend on model behaviour and still need evaluation with a real provider.

### Manage the knowledge database

Use Node.js 22.13 or newer (Node.js 24 is used for local verification). These commands work without an API key:

```bash
npm run themis:knowledge -- seed
npm run themis:knowledge -- list
npm run themis:knowledge -- search 'νομική υποστήριξη για ακίνητα'
npm run themis:knowledge -- import approved-knowledge.json
npm run themis:knowledge -- remove faq:services
```

The initial database contains only published firm information, services, team, locations, and the absence of unpublished contact details. Legal reference documents and additional FAQs must be reviewed and imported separately. The import command accepts a JSON array of records, for example:

```json
[
  {
    "id": "faq:services",
    "title": "Νομική υποστήριξη για ακίνητα",
    "content": "Η εταιρεία παρέχει νομική υποστήριξη σε ζητήματα ακινήτων, εμπράγματων δικαιωμάτων και συναλλαγών επί ακινήτων.",
    "sourceUrl": "https://kl1me.github.io/souzana/practice-areas/#real-estate",
    "tags": ["ακίνητα", "real estate"],
    "approved": true,
    "updatedAt": "2026-10-02T00:00:00Z",
    "expiresAt": null,
    "origin": "manual"
  }
]
```

Each source URL should point to the actual approved public document. Draft records use `approved: false`; outdated records can have an `expiresAt` timestamp or be removed. IDs beginning with `website:` or `drive:` are reserved. Imports validate all records before writing and commit together. The local import command imports text; it does not extract PDF/Word content or provide an administration interface.

Set `THEMIS_DATABASE_PATH` in the private backend environment to change the database location. Keep it on a persistent disk, outside the website's `public` directory, and back it up. The database and its SQLite sidecar files are excluded from Git. It stores knowledge documents, not visitor messages. Web responses are never automatically promoted into approved knowledge.

### Approved Google Drive documents

The first Drive integration is implemented as an operator-run publishing workflow. Visitors do not log into Drive. The Node API searches approved indexed documents alongside the website database, verifies their approval versions again after generation, and keeps the same answer/citation/web-fallback flow. It does not retrieve directly from Drive for each visitor question.

This workflow supports direct children of one dedicated **Approved** folder: Google Docs exported as plain text, TXT, Markdown, PDF, and DOCX. It does not recurse into subfolders, follow shortcuts, or import native Sheets/Slides. Individual downloads are limited to 10 MiB and an inventory to 1000 files. PDF/DOCX parsing is performed by OpenAI's managed index; scanned pages, tables, and Greek extraction quality require evaluation with actual sample documents.

To connect later, provide the folder ID/link and authorize a dedicated backend identity to read it. The backend also needs a Google credential file, an OpenAI API key/model, and eventual hosting. A folder link alone does not configure these accounts. `THEMIS_GOOGLE_CREDENTIALS_FILE` points to a server-held Google credential file used by `google-auth-library`; prefer a dedicated service account shared into only the Approved folder without domain-wide delegation. User OAuth credentials can use the same file-based authentication adapter when appropriate. The configured `drive.readonly` scope is broad, so constrain identity access through sharing plus the explicit folder allowlist. See [Google Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

Keep credentials outside Git and public files. Leave `THEMIS_DRIVE_ENABLED=false` while preparing and validating the collection. Set `THEMIS_DRIVE_FOLDER_ID` and `THEMIS_GOOGLE_CREDENTIALS_FILE` in `.env.themis`, then use:

```bash
# Offline status; no provider or Drive requests.
npm run themis:drive -- status

# Read the folder and generate exact-version review metadata; does not upload documents.
npm run themis:drive -- review data/drive-review-1.json

# After reviewing original content, public citations, and expiry in that JSON:
npm run themis:drive -- approve data/drive-review-1.json

# Create one dedicated managed index and persist its ID, or record THEMIS_VECTOR_STORE_ID.
npm run themis:drive -- init

# Publish only approved versions, reconcile changes/removals, and retry pending cleanup.
npm run themis:drive -- sync

# Block one document immediately without Drive or OpenAI access.
npm run themis:drive -- withdraw DRIVE_FILE_ID
```

The review file contains a SHA-256 hash and Drive version for every supported document, along with `title`, `sourceUrl`, `reviewedAt`, `expiresAt`, and `publicCitationVerified: false`. An operator checks the exact original content, sets its actual public citation URL, confirms that URL works without signing in, sets a suitable review expiry, and changes `publicCitationVerified` to `true` for the records being approved. Unreviewed records should be omitted from the approval file. No arbitrary citation URL is fetched by the sync service. Private Drive links are not automatically used as public citations. Approval is tied to both hash and version; even a metadata edit can increment the [Drive version](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) and require another review.

`init` records the vector-store ID in `THEMIS_DRIVE_CATALOGUE_PATH` (default `data/themis-drive.json`); `THEMIS_VECTOR_STORE_ID` is optional when that catalogue already contains the ID. Creation is attempted once. If creation has an ambiguous outcome, inspect the OpenAI project and explicitly configure the existing store ID before retrying; do not blindly create duplicate stores. Use a dedicated index for this folder: cleanup removes both its attachments and the uploaded files owned by this catalogue.

After a successful sync and live evaluation, set `THEMIS_DRIVE_ENABLED=true` and restart the API. Each retrieved hit must match the catalogue's active file ID, exact hash/version, unexpired approval, and approved public citation metadata. Failed staging and withdrawn versions cannot authorize themselves through provider attributes. Index deletions are [eventually consistent](https://developers.openai.com/api/docs/guides/retrieval), so the catalogue blocks evidence before remote cleanup and retries failed cleanup on later syncs. Retrieved evidence is verified before model input and after generation; insufficient remote passages are not carried into the web-search prompt.

**Freshness:** this stage performs manual sync. Edits, moves, and removals in Drive are recognized on the next successful sync, not instantly at each visitor request. Explicit `withdraw` and approval expiry are enforced immediately by catalogue reads. During a scan, or after an incomplete/failed scan, remote knowledge is unavailable. `THEMIS_DRIVE_MAX_AGE_HOURS` defaults to 24 (maximum 168); after that interval without a verified inventory, requests fail with `knowledge_unavailable` rather than treating uncertain knowledge as an empty search. Both Drive and local retrieval must succeed when Drive mode is enabled. Manual operators must run sync within that interval; scheduled sync is a later stage.

The local catalogue uses private file permissions, atomic replacement, revision checks, and a command lock. If a crashed command leaves a lock, verify that no command is running before removing that specific lock file. Back up the catalogue together with the website database. It stores approval/current-version metadata and pending cleanup IDs; it is not a complete historical audit log. Keep the catalogue on durable local storage. **This implementation does not deploy to Cloud Run**: its disposable local filesystem requires a future durable remote catalogue adapter, such as a versioned Cloud Storage manifest with conditional writes. See [Cloud Run storage](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run) and [Cloud Storage preconditions](https://docs.cloud.google.com/storage/docs/request-preconditions).

Before production activation, evaluate Greek paraphrases, exact source support, public citation access, PDF/DOCX extraction, expired documents, changed approvals, moved/deleted files, missing answers, prompt injection, latency, and provider cost using a small approved collection. Local tests establish the workflow and API contracts; they do not establish live Drive permission, OpenAI indexing quality, model grounding, or public deployment.

### Build and review without an API key

A sample-only local preview is available for checking the interface:

```bash
npm install
npm run themis:preview
```

Open `http://localhost:3001`. This starts a local website and sample-response service on loopback only, with a temporary in-memory SQLite database. Database retrieval runs locally; model decisions and web responses are mocked. The panel visibly labels the replies as examples; no OpenAI request or API key is used. Type a question about the firm's services, team, or locations, or start a new conversation. Stop both processes with Ctrl+C. Preview labels are enabled only in development, and the production API command always uses the real provider adapter.

### Local connection when ready

Install dependencies, then copy `.env.example` to `.env.local` and `.env.themis.example` to `.env.themis`. Add your key after `OPENAI_API_KEY=` in `.env.themis`; keep this file private, with permissions `0600`. The default model is [`gpt-5.4-mini`](https://developers.openai.com/api/docs/models/gpt-5.4-mini), which supports Responses, structured outputs and web search. You can change `OPENAI_MODEL` to another compatible model enabled for your OpenAI project. Keep the private key in the backend environment, never in a `NEXT_PUBLIC_` variable. Model access and live answers require a check when credentials are available.

`THEMIS_WEB_SEARCH_ENABLED=false` disables web searches. `THEMIS_WEB_ALLOWED_DOMAINS` is a comma-separated list of allowed domain names, without schemes or paths. `THEMIS_ALLOW_GENERAL_FALLBACK=true` enables the labelled model-knowledge fallback. These settings live in the backend environment.

Greetings, thanks, and simple questions about THEMIS receive direct conversational replies in the browser, without waiting for the API, searching the database, or making an OpenAI request. The API uses the same shared matcher for direct clients. This works even when general model-knowledge fallback is disabled. A message combining a greeting with a factual or legal question continues through database retrieval and sourced web search.

Opening the production chat starts one background request to the API's public `/health` endpoint, at most once every five minutes per page session. It sends no messages, credentials, or referrer and does not block local replies. This can overlap a free server's startup with the visitor reading or typing; it is not a recurring keep-alive and does not eliminate startup delays for questions requiring the API.

Start the real API and the website together:

```bash
npm run themis:dev
```

Open `http://localhost:3000`. Saving `.env.themis` automatically restarts the API with the new configuration. The private file is loaded only by the API, and the website uses the public endpoint at `http://127.0.0.1:8787/api/themis`. The local services bind to loopback. While the key is missing, chat returns a controlled setup message and preserves the draft; it does not generate sample answers.

Alternatively, run these in separate terminals:

```bash
npm run themis:api
npm run dev
```

`NEXT_PUBLIC_THEMIS_API_URL` is set only when you copy the example environment file. Without an endpoint, the panel shows a coming-soon message. Without a backend key, requests receive `503 not_configured`.

### Hosting alongside GitHub Pages

Host the Node.js service separately behind HTTPS, with `npm ci` and `npm run themis:api`, and a persistent volume for `THEMIS_DATABASE_PATH`. GitHub Pages cannot host this service or database. SQLite is suitable for this initial single-server service; a deployment with multiple application servers would need a shared database such as PostgreSQL and a retrieval adapter. Set the private key and model through that host's secret environment. Set `THEMIS_HOST=0.0.0.0`; the API accepts the host's `PORT`, or an explicit `THEMIS_PORT` override. Set `THEMIS_ALLOWED_ORIGINS=https://kl1me.github.io` for the current site (an origin has no `/souzana` path or trailing slash).

The Pages workflow uses the current test backend at `https://themis-api-test.onrender.com/api/themis`. To switch hosts, set the GitHub repository **variable** `THEMIS_API_URL` to the new full HTTPS endpoint, for example `https://your-api-host.example/api/themis`; this overrides the workflow's default. The Pages workflow embeds only this public URL at build time. The API key belongs exclusively to the backend host. Updating the URL requires rebuilding the website.

#### Free Render test deployment

[Start the THEMIS test deployment on Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FKL1ME%2Fsouzana).

The included `render.yaml` creates one free Node.js API service in Frankfurt, with the GitHub Pages origin and official web sources configured. Create/sign into your Render account, review the free service, and enter `OPENAI_API_KEY` only in Render's secret field. The Blueprint uses [`sync: false`](https://render.com/docs/blueprint-spec#prompting-for-secret-values), so no key is stored in the repository. It leaves automatic deploys off; use Render's manual deploy when updating the backend.

After Render reports the service as live, verify its HTTPS address against the workflow's default. If it differs, append `/api/themis` and save that endpoint as the GitHub repository variable `THEMIS_API_URL` under **Settings → Secrets and variables → Actions → Variables**, then rerun **Deploy to GitHub Pages**. Verify the deployed chat with both a website question and a question requiring an official web source. Creating this Blueprint alone does not connect the published website.

This free configuration is for the initial test using website knowledge only. [Render's free service](https://render.com/docs/free) sleeps after 15 minutes of inactivity and can take about a minute to wake up. Its local SQLite data is lost on restart or redeploy; approved website content is recreated at startup. Keep Drive and manual knowledge imports disabled on this test host. Before adding those documents or publishing for regular use, move the database and catalogue to durable storage; Render requires a paid service for a [persistent disk](https://render.com/docs/disks). Model/API usage remains separate from hosting.

The API applies body/history limits, a 60-second total answer timeout, four concurrent requests, and 12 requests per minute per socket address. It does not trust forwarded IP headers. Behind a proxy, enforce visitor rate limits and spend controls at the trusted gateway; the built-in limit will otherwise apply to the proxy address. Origin checks are browser CORS protection, not authentication, and cannot prevent scripted callers from forging an Origin header.

The application does not write transcripts to disk or browser storage. The panel holds the conversation in page memory until a new chat or reload. Sources on this website use internal navigation and close the panel so the visitor can read the source; reopening THEMIS on that page restores the same conversation. External sources open in another tab while the original conversation remains in its tab. Each request sends at most the last nine exchanges and the current question, within a character budget. OpenAI requests use `store: false` to disable response storage; this does not establish zero provider retention ([OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)).

### Verification

```bash
npm run test:themis
npm run lint
GITHUB_PAGES=true npm run build
```

Tests use real local SQLite databases/catalogues, mocked Drive/index/model APIs, and local HTTP requests. They verify persistence, exact-version approvals, atomic inventory, publication/withdrawal/cleanup, revocation during generation, Greek retrieval, asynchronous database-first routing, fallback rules, citations, CORS, private-key handling, rate limits, timeout recovery, and error handling. Real Drive access, OpenAI indexing/answers, search quality, and public hosting require configured credentials and are separate acceptance checks. The assistant's legal boundaries and evidence sufficiency checks are prompt instructions, not a tested guarantee of model behaviour.

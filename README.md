# PolyFlow

PolyFlow is a calm, text-first multilingual expression engine built around language stacking. It uses a native language as the anchor and actively develops every additional language through vocabulary, structural comparison, sentence production, grammar, transformation, and review.

The initial curriculum teaches Spanish with English as the native anchor and Vietnamese as an active supporting language. Its level architecture follows CEFR from A1 through C2 while retaining PolyFlow's own pedagogy.

## Local development

```bash
npm install
npm run dev
```

PolyFlow works without a database by keeping the language profile and completed lessons in the browser. To sync progress through the API, create a Neon or Vercel Postgres database, run `drizzle/0002_vercel_postgres.sql`, and set `DATABASE_URL` from `.env.example`.

## Curriculum publishing

The app ships with an offline foundation and loads additional versioned curriculum packs from the repository's `curriculum-data` branch at runtime. Vercel deploys application code from `main`; publishing to `curriculum-data` does not rebuild the app.

1. Add a versioned JSON file under `curriculum/packs/`.
2. Add its descriptor to `curriculum/manifest.json` and increment the manifest revision.
3. Run `npm run curriculum:validate`.
4. Publish the data commit to the `curriculum-data` branch.

PolyFlow validates the manifest and every pack before merging lessons. Invalid or unreachable remote content is never shown; the bundled course remains available.

## Vercel

Import the GitHub repository into Vercel. The project uses standard Next.js defaults and needs no custom build settings. Add `DATABASE_URL` to Vercel only when hosted progress sync is desired.

## Verification

```bash
npm test
npm run lint
```

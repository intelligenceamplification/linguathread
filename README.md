# LinguaThread

**How Language Is Built**

LinguaThread is a calm, text-first multilingual expression engine built around the method of **language stacking**. It uses a native language as the anchor and actively develops every additional language through vocabulary, structural comparison, sentence production, grammar, transformation, and review.

The initial curriculum teaches Spanish with English as the native anchor and Vietnamese as an active supporting language. Its level architecture follows CEFR from A1 through C2 while retaining LinguaThread's own pedagogy.

## Local development

```bash
npm install
npm run dev
```

LinguaThread works without a database by keeping each installation's language profile and completed lessons in that browser. A fresh installation begins at onboarding.

For private hosted progress, create a Neon or Vercel Postgres database, run `drizzle/0002_vercel_postgres.sql`, `drizzle/0003_objective_mastery.sql`, and `drizzle/0004_private_learner_identity.sql` in order, then set `DATABASE_URL` from `.env.example`. The server issues an opaque HttpOnly installation session and ignores client-supplied learner IDs. See `docs/learner-identity.md` for ownership, migration, and cross-device requirements.

## Curriculum publishing

The app ships with an offline foundation and loads additional versioned curriculum packs from the repository's `curriculum-data` branch at runtime. Vercel deploys application code from `main`; publishing to `curriculum-data` does not rebuild the app.

1. Add a versioned JSON file under `curriculum/packs/`.
2. Add its descriptor to `curriculum/manifest.json` and increment the manifest revision.
3. Run `npm run curriculum:validate`.
4. Publish the data commit to the `curriculum-data` branch.

LinguaThread validates the manifest and every pack before merging lessons. Invalid or unreachable remote content is never shown; the bundled course remains available.

## Interactive sentence anatomy

Every shipped lesson now enters LinguaThread's Interactive Sentence Model at its sentence stage. The curriculum baseline is derived from the lesson's reviewed target, anchor, bridge, vocabulary, and pattern data; a lesson can supply a richer `anatomy` object when a particular construction deserves deeper editorial treatment. Author those objects in `app/interactive-sentence.ts` (or a future versioned curriculum pack) rather than embedding explanations in presentation components.

The model keeps realizations, sentence units, relationships, cross-language mappings, and related patterns separate. Units may include multiple visible segments or be marked implied or omitted; mappings can be one-to-one, reordered, structural, expanded, or implicit. The interface only shows concepts that have authored data.

To add another interactive lesson, create a reviewed `InteractiveSentenceModel`, attach it to the matching `CompactLesson`, then add coverage to `tests/rendered-html.test.mjs`. The same data drives normal reading, Expression X-Ray, the inspector, and See What Changes. Current remote-pack validation preserves optional anatomy data; a future curriculum schema revision should validate it field by field before accepting externally published anatomy lessons.

No pronunciation metadata is rendered. The type has a reserved authoring field only, so audio can be reviewed as a separate product decision later.

Editorial note: the existing Vietnamese course wording `Gia đình tôi sống gần đây.` is preserved in the first vertical slice. Its location phrasing should receive native-editor review before it is used as a broadly reusable Vietnamese pattern.

## Vercel

Import the GitHub repository into Vercel. The project uses standard Next.js defaults and needs no custom build settings. Apply the identity migration before adding `DATABASE_URL`. Cross-device recovery must remain off until a verified identity provider is selected and configured server-side.

## Verification

```bash
npm test
npm run lint
```

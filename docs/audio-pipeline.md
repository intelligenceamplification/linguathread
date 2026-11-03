# Bounded audio pipeline

## Operating rule

Keep approved recordings. Generate missing or rejected main-lesson audio only,
in a one- or two-unit window. A normal app release or signing refresh runs no TTS.
The app downloads permanent, hash-addressed recordings; it never receives an API
key, waits for live synthesis, or loads a speech model. Existing Normal/Slow
playback and the native 24 MiB cache remain unchanged.

`scripts/audio_pipeline.py` uses Python's standard library and SQLite. The
generation worker runs on the developer Mac (or another Unix host), not the phone.
There is no scheduler, additional service, dependency installation, or bulk job.

## What the states mean

1. **Existing:** exact recording bytes were found and match their manifest hash.
2. **Eligible:** metadata satisfies the installed voice policy and defect blocklist.
3. **Candidate:** a new file passed basic WAV duration, truncation, silence and
   clipping checks. This does **not** establish transcript accuracy, native
   pronunciation, appropriate pace, or human approval.
4. **Approved:** the specific voice/recipe and required quality checks were accepted.
   Existing utterance review metadata is preserved; voice acceptance cannot create
   a human review timestamp on thousands of recordings.
5. **Published:** an eligible catalog and its actual files have been delivered.

Candidates are never automatically promoted. A held or uncertain request is never
automatically regenerated. Inspect it first. Do not clear its registry record to
get around a budget or failure. Change a rejected recipe deliberately and keep the
old content key for traceability. Keep a backup of the registry and candidate files
together; a clean checkout does not contain these private generated outputs.

## Offline preparation (safe without an account)

Run from the repository root:

```sh
python3 scripts/audio_pipeline.py reconcile
python3 scripts/audio_pipeline.py reconcile --apply
python3 scripts/audio_pipeline.py audit
python3 scripts/audio_pipeline.py plan --provider gemini --benchmark
python3 scripts/audio_pipeline.py plan --provider gemini --lesson a2-u19-2-describing-improvement-lesson
python3 tests/audio-pipeline.test.py
```

Reconciliation copies matching originals into private staging; it synthesizes and
publishes nothing. The audit writes `outputs/audio-readiness.json`, listing missing
texts per authored lesson. `audit --require-ready` exits nonzero when any main
lesson lacks published playback. Availability requires at least one permitted
recording per requested Spanish/Vietnamese text, not both Spanish genders, and
does not certify pronunciation or the English audio path.

Plans live under `audio/generated/cloud-pipeline/plans/`. Each plan defaults to at
most 18 new requests; `--limit` permits 1–64. If `nextOffset` is returned, prepare
the next batch with `--offset N`. Existing approved audio is reused, including an
available alternate approved gender rather than synthesizing a second rendition
merely to fill a matrix. A new missing Spanish text has male/female candidates;
Vietnamese has one female candidate. The initial benchmark is 18 requests total.

The key includes provider, model, voice, locale, spoken text, normalizer version,
and delivery settings. UI edits do not affect it. Slashes in displayed alternatives
become comma pauses in the spoken request; diacritics and displayed text remain.
Model changes or deliberate recipe changes receive a new key. Hosted files use
the checksum of their actual bytes, independently of the request key.

## Cloud candidates and cost boundary

### One-time private key setup

The normal setup path is `python3 scripts/audio_setup_page.py`, a temporary
loopback-only browser form with a large password field, a Free-tier confirmation
checkbox, and a Save button. Open the one-use URL printed by the process. The server
accepts only its token path, local Host and same-origin POST, logs no requests,
uses no external assets, sends no Google requests, and stops after saving. It uses
a threaded HTTP server so Chrome's idle connections cannot block submission. The
same-origin referrer policy preserves the Origin on legitimate form submissions.
The save flow was exercised with a fake key in Chrome and a temporary folder.
The Terminal helper below remains available as an alternative.

In [AI Studio](https://aistudio.google.com/apikey), sign in and create a key in a
Free-tier project with billing disabled. Accept Google's terms yourself. New users
may already have a default project/key; use it only after checking its tier. Do
not enable billing for this benchmark.

Run `python3 scripts/audio_pipeline.py setup` in Terminal. The prepared Mac shortcut
is `outputs/Configure Free Audio.command`. Confirm the free project by typing
`FREE`, then paste the key at the hidden prompt and press Return. Setup creates
`.env.audio.local.json` with owner-only permissions. That file is ignored by Git,
is never evaluated as shell code, and is read only by the developer worker.
Setup does not contact Google. `check-setup` reports booleans only, not the key;
it cannot independently verify billing. Never paste the key into chat.

This helper is not a secret vault: other programs running as the same macOS user
can access the file. It is an appropriate local-only credential file, not a
credential embedded in the app. Keep the key out of screenshots and backups you
share. You can revoke it in AI Studio after the audition if desired.

Once setup is complete, Codex can use the saved audition plan and inspect candidate
files. Learner voices remain unchanged until listening acceptance and a separate
verified release.

`audio/cloud-audio-candidates.json` records the three Gemini profiles accepted on
2026-10-21 and the still-unapproved Google Cloud Chirp comparison profiles. These
are different products even when voice names match. The original approved voice
registry is preserved. Three exact Gemini recordings have separate human review
records in `audio/cloud-listening-approvals.json`; other generated candidates do
not inherit that acceptance.

`scripts/publish-cloud-auditions.py` stages only those exact accepted recordings,
checks bytes and recipe identity, and adds their pinned policies alongside the
preserved profiles. Build 12 selects native policies by language, gender **and**
reference fingerprint, preventing a new family from silently failing an old
same-gender policy. The player prefers a newly accepted recording only where an
exact matching text exists. All other checked recordings remain usable.
This one-time wrapper update enables additive profile delivery; it does not
rebuild the library. Later utterances under an already pinned profile need no
wrapper rebuild. A genuinely new profile still requires explicit policy approval.

- **Default audition adapter:** Gemini `gemini-3.8-flash-tts`, using the documented
  Interactions REST API. A project with billing disabled and a local
  `GEMINI_API_KEY` are required. The operator must also set
  `AUDIO_FREE_PROJECT_CONFIRMED=true`. This is an operator confirmation, **not**
  programmatic verification of the project's billing state. Verify it in AI Studio
  first; never paste a key in chat or commit it.
- **Optional comparison adapter:** Google Cloud Chirp 3 HD. Cloud TTS requires
  billing and can charge beyond its allowance. It stays blocked unless the operator
  explicitly sets `AUDIO_ALLOW_METERED_PROJECT=YES` and `GOOGLE_TTS_API_KEY`.
  This does not meet a strict no-billing requirement and is not the default path.

Current primary references: [Gemini TTS request format](https://ai.google.dev/gemini-api/docs/speech-generation),
[Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing),
[Gemini terms](https://ai.google.dev/gemini-api/terms),
[Cloud TTS synthesis](https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize),
[Chirp 3 HD controls](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd),
[Cloud pricing](https://cloud.google.com/text-to-speech/pricing).
Provider allowances and terms must be checked again before enabling a project.
No adapter promises unlimited free synthesis, guaranteed pronunciation, or immunity
from provider changes. Local quotas cannot enforce a cloud account's billing policy.

After account setup and the audition decision, run the exact saved plan:

```sh
python3 scripts/audio_pipeline.py run /absolute/path/to/plan.json
```

Default limits: 18 requests, 4,000 input/style characters per job, 100,000 per
provider per UTC month in this registry, ten reserved requests per provider per
Pacific calendar day, and five minutes per invocation. Real provider requests
are paced at least 22 seconds apart, matching this project's verified 3 RPM quota.
Failed requests conservatively consume local daily capacity. These are local
guardrails, not a promise of provider availability. On 2026-10-21 the Free-tier
project allowed only 10 TTS requests per day, so the 18-clip stress set spans days;
prioritize three representative voices before spending quota on more fragments.
A request
already in flight can take up to its 45-second network timeout. Limits survive
process restarts. Explicit `--max-requests` (maximum 64) and `--characters` (maximum
20,000) can raise a small job's limits. No parallel workers, automatic retries,
paid fallback, or provider switching. A failed request may already have consumed
quota, so its reservation is retained. Rate-limit responses stop the job.

The SQLite registry records requests **before** network calls. Repeating a plan
reuses checksum-valid files. Corrupt, held, or uncertain entries require inspection.
New output stays in the ignored `audio/generated/cloud-pipeline/` folder, with a
receipt containing `published: false` and `reviewedAt: null`. No network benchmark
has been completed merely because these adapters pass mocked contract tests.

## Approval and delivery

First compare the small stress set: short words (`de`, `eres`), slash alternatives,
ordinary phrases, and complex sentences. Sample the production distribution after
that; prioritize failures, changed recipes, short fragments and long sentences.
Automatic file checks reduce mechanical work but cannot replace native-language
quality review. Transcript alignment or other non-learner QA can be evaluated later
as a separate stage; no additional recognition model runs in this implementation.

After voice acceptance, candidate verification and admission-policy updates are a
separate, explicit release step. This worker intentionally cannot publish its own
output. Reuse existing approved material through the established publisher:

```sh
python3 scripts/publish-prepared-audio-window.py --lesson a2-u19-2-describing-improvement-lesson --units 2
```

That publisher runs the actual Swift admission rules before `--apply` can stage
files/catalog. It reports gaps; partial staging does not make a complete audio
lesson. Deployment and live asset verification are additional steps. Never infer
on-device playback proof from a file check or a successful build. If audio fails,
preserve text continuation without awarding listening evidence.

No branding, curriculum expansion, microphone access, speech recognition feature,
pronunciation scoring, or learner progress migration is included here.


## Whole-sentence voice upgrades (2026-10-22)

`python3 scripts/audio_pipeline.py plan --provider gemini --lesson <authored-lesson-id> --main-sentences --limit 10`

This explicit upgrade mode selects only complete Spanish/Vietnamese sentences from the two-unit lesson window and only accepted cloud voice profiles. Legacy recordings do not satisfy this voice migration; other ordinary coverage plans still reuse working checked recordings. The registry skips exact successful cloud requests on reruns. Offset applies to the stable plan queue; the worker's independent ten-request Pacific-day cap still applies. Generated files remain candidates until their own content/pace checks and acceptance. No other launch languages are generated now.

## Northern Vietnamese approval — 2026-10-25

The user accepted all ten October 25 recordings. The explicitly Northern Vietnamese (Hanoi) recipe now has its own listening reference and native admission policy. Keep the earlier accepted Vietnamese recordings and their exact recipe intact; disable that unlabelled recipe for future whole-sentence generation. New whole-sentence Vietnamese plans use the accepted Northern recipe. Spanish recipes are unchanged. Build 14 carries the additional native policy; routine audio delivery still does not require regenerating files.

## Vocabulary context coverage — 2026-10-25

A whole-sentence pack does not imply isolated vocabulary coverage. Vocabulary controls now receive their explicit parent lesson sentence: use an exact admitted clip when available, otherwise use a human-accepted recording of that sentence, display its complete text under Listen in context, and withhold independent listening credit. Never substitute an arbitrary sentence or a system voice. Current Unit 20 Vietnamese coverage is 14 exact vocabulary models plus 2 contextual models for 16 items. Whole-sentence assessments retain exact matching. No synthesis or native policy change is needed for this repair.

## Reusable listening-batch preparation

After a bounded generation job, run the same helper for any date and saved plan:

```sh
python3 scripts/prepare-cloud-listening-batch.py --plan audio/generated/cloud-pipeline/plans/daily-20261027.json --date 2026-10-27
```

It verifies exact receipt/file identities, writes Spanish/Vietnamese metadata for the existing cached transcript/pace auditors, and joins their results into `outputs/audio-batch-YYYYMMDD.html` and its JSON receipt. Rerun after screening finishes. It generates no audio, grants no approval, and publishes nothing. Individual generated recordings still require listening acceptance. Keep the connected phone unchanged until the accepted batch is included in the newest published baseline.

## Vietnamese voice balance — 2026-11-02

The user requests equal Northern and Southern Vietnamese representation in future additions, with male and female voices in each accent. Target a 1:1 Northern/Southern ratio and balanced male/female allocation across recordings over each complete four-slot cycle. Carry any imbalance across odd-sized batches. This replaces the Northern-only generation preference; Central accents are outside the requested scope.

The approved Northern female profile remains valid. Southern female, Northern male, and Southern male profiles require representative listening approval and pinned native admission policies before production use. Do not relabel an existing voice, claim accent validation from automated transcription, or silently enable unapproved profiles. Today's ten approved November 2 recordings remain accepted unchanged. Fill missing lesson coverage first; this balance does not require four renditions of every sentence or regeneration of working audio. Generation remains bounded by the free ten-request daily cap until the user authorizes paid usage.

## Sampling and review policy — 2026-11-02

The user approved a scalable listening-review method for future audio batches, superseding earlier instructions that require the user to listen to every exact generated recording. The publisher supports the separately recorded batch-review ledger. The ledger is initially empty: previous exact-file approvals remain authoritative. Each released member must match its receipt and screening identity; failed or uncertain members must be explicitly held. Unsampled members retain automated evidence and batch review metadata without an individual listening date.

1. The user first listens to and approves each voice and accent using representative short phrases, difficult sounds, and longer sentences. A new or changed provider, model, voice, accent or material recipe requires a new audition. Existing explicit file approvals and defect blocks remain valid.
2. Screen every generated file for text mismatch, extra or missing speech, silence, clipping and unusual pace, to the extent supported by the available checks. Mark any unimplemented or inconclusive check as unverified. Automatic screening cannot certify pronunciation, accent, authenticity or exact spoken content.
3. The user listens to a representative sample from every batch and to flagged clips. Prioritize short words and known problem sounds, including Spanish “de” and “eres.” Hold failed or inconclusive clips pending review or a replacement; a batch sample never overrides a file-specific rejection.
4. Record the voice/recipe, exact file identities, screening results, sampled clips, review outcome and any held or replaced clips. When the user accepts the sampled batch and the implemented screening gates pass, unsampled passing clips may be designated batch-reviewed rather than individually listened-to. Keep those labels distinct and retain a way to report and replace a defective clip.
5. Investigate similar clips when a defect is found; quarantine the affected files as appropriate. Preserve verified working recordings and do not regenerate them for routine app updates. Deliver only after the applicable review and release checks; the connected iPhone is refreshed after the approved batch is live.

This review policy does not authorize paid generation or imply full-course coverage. Any actual publication mechanism must enforce these distinctions and remain compatible with previously accepted recordings.

## Offline launch planning tools

Export current three-language audio candidates without changing the ES/VI release inventory:

```
node scripts/export-native-audio-inventory.mjs audio/generated/ios-approved-v1/curriculum.json en,es,vi outputs/launch-audio-inventory.json
python3 scripts/prepare-launch-audio.py --planning-allowance 40
```

The resulting `outputs/launch-audio-readiness.json` lists missing exact texts, voice-audition prerequisites, and an illustrative output-price estimate. The allowance is not a spend authorization or a billing cap. This command performs no generation, API calls, publication, or billing changes. English candidates include anchor and foundation material, not a complete target-language course. Existing English voices remain unapproved for the planned new pack.

For sampled releases, `audio/cloud-batch-reviews.json` contains batch identity, `reviewedAt`, `approvalEvidence`, exact `clips` (`requestKey`, `sha256`), `sampledRequestKeys`, `heldRequestKeys`, and `screeningFiles` (`path`, `sha256`). Minimum sampling is three clips or 10 percent of batch members (whichever is greater, bounded by batch size), plus every non-held phrase of two words or fewer and each represented voice/recipe. These are operational sampling defaults, not a statistical guarantee. Every non-held member requires an exact matching version-2 automated pass with no flags. `python3 scripts/publish-cloud-auditions.py` validates without mutation; `--apply` stages accepted files but does not deploy. No batch has yet been approved through this new mechanism.

## Preserve useful audio across providers — 2026-11-03

The user clarified that some earlier recordings still sound good in actual use and should be eligible for reuse alongside Gemini to reduce unnecessary generation. This supersedes an assumption that every non-Gemini recording must be replaced. It does not grant blanket approval to old staged files or override a known defect block. Preserve currently working recordings; triage reported defects and sample older voice/recipe cohorts before accepting additional staged files. Keep the same text, pace, clarity, playback-speed and provenance requirements across providers. A free local model is not a free hosted API; verify quota, billing and application-use terms before connecting a new API. No new provider or paid generation is authorized by this clarification.

The November 3 free daily batch targets ten missing main-sentence models over five lessons ahead of the latest synced lesson, reusing existing published coverage regardless of provider. Only the currently accepted Spanish male/female and Northern Vietnamese female recipes are available for this batch; the planned additional Vietnamese voices still require auditions.

The user further clarified that both the previous voices and Gemini are good enough for teaching; maximum fidelity is not a requirement when a clip is already clear, authentic and complete. Do not impose a Gemini-only replacement campaign. New generation planning should check usable staged files as well as published coverage; move eligible staged clips through sampling and publication instead of generating duplicates. This is voice-source acceptance, not permission to clear individual defect blocks or claim unheard files were personally listened to.

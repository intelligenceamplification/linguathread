# LinguaThread curriculum system

LinguaThread is one continuous Spanish and Vietnamese course. The learner moves from A1 through C2, then remains in adaptive maintenance review. The interface does not need to be rebuilt as the course grows.

## Two different kinds of completeness

- `app/course-map.ts` is the permanent A1-C2 scope: 48 ordered units and 576 lesson positions.
- `curriculum/packs/*.json` contains authored, reviewed lessons that can enter the learner's sequence.

A mapped lesson position is not a published lesson. A lesson becomes publishable only when its Spanish, English, and Vietnamese expressions, exercise answers, grammatical explanation, prerequisites, and X-Ray behavior pass validation and editorial review.

## Publishing another pack

1. Author a versioned JSON pack in `curriculum/packs` without changing existing lesson or objective IDs.
2. Add its descriptor to `curriculum/manifest.json`.
3. Run `npm run curriculum:validate`, lint, tests, and the production build.
4. Publish the pack to the curriculum-data branch. The app checks that manifest independently of an interface deployment.

The runtime merges new packs into the existing course and uses prerequisites plus the learner model to unlock the next suitable lesson. Completed skills continue to return through spaced maintenance review.

## Editorial standard

Each lesson must teach one manageable communicative objective through the complete language stack. It must provide natural Spanish, English, and Vietnamese; multidirectional active production; explicit structural comparison; and meaningful X-Ray analysis at word, phrase, and sentence scope. Bulk-generated filler is not publishable content.

CEFR alignment describes communicative capability. Because this release is intentionally text-first, LinguaThread can gather evidence for reading, writing, grammatical control, mediation, and translation. Listening and spontaneous speaking require separate practice and assessment before claiming complete four-skill CEFR certification.


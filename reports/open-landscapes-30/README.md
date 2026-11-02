# Open landscapes: 30-hole playtest — 2 November 2026

Appended **#322–#351**, all Par 5 mandatory doglegs. All **350 prior archived definitions**, stable IDs and saved-state rules are unchanged. Internally dated 5 October–3 November 2027; the app displays hole numbers and allows future preview. No retirements or changes to gameplay, scoring, vectors, automatic finishing, attempts or UI layout.

## Selection

The three latest play exports show both first-leg access bottlenecks and difficult onward continuations. This batch rebalances the previous emphasis on second-leg distance. Several natural starting ideas and credible onward options matter more than making a named dogleg/flag pair very distant.

One hundred word-only combinations were nominated before running the checks. Thirty were selected after reviewing the words, opening hits, reached landings, onward moves and complete diagnostic examples. No intended solution or verification route is stored with live holes. Words mix physical objects/actions, experiences, social situations and abstract ideas; familiarity takes priority over unused-word quotas. The final 90 word slots contain 84 distinct spellings. Most words appear once; five appear again elsewhere in the batch.

Examples of combinations passed over:

- FLAT → PROMISE → BREEZE: limited initial access and an unnecessarily long descriptive completion witness.
- CRADLE → CHANCE → DUST: only three reached landing words in the deeper check; less evidence of room to explore than preferred here.
- PITCH → MYSTERY → WARM: a quick witness relies on a generic SWEET/KIND/WARM chain; preferred other combinations for this batch.
- CHILL → STAGE → WISH: many sampled arrivals finish immediately; passed over for the current mix, not a universal rejection rule.
- Other candidates fail the existing direct-leg check or lack a supported completion in the bounded check. Neither lack of coverage nor vector distance proves a hole is bad or impossible.

There is no numeric enjoyment score, desired stroke length or maximum exploration count. SCRATCH → COURAGE → REST deliberately retains some easier landing possibilities rather than turning every hole into a difficult second leg. The checks are diagnostic and imperfect: they can miss natural senses and accept generic associations. Human play decides quality.

## Recorded checks

- All 30 have an independently replayed complete route, with authoritative automatic finishing strokes.
- Sampled successful advancing openings range from **2 to 10**; these are context suggestions, not all possible words.
- **842** reached landing words across the checks, ranging from 8 to 57 per hole. Each recorded landing was tested against the same per-hole union of onward suggestions, retaining its actual approach prefix and baseline.
- Context-supported onward-option sets differ within every hole; conceptual variety still needs human inspection and is not established by those counts alone.
- The new regression test replays **149,330** shared-pool shot probes, all 30 completions, retained progress and archive availability. No browser simulations run.

The checking graph reuses the shared independent word notes and adds ordinary associations for HUMOUR, KINDNESS, FEAR, CHOIR, SHADE and FEATHER. Notes describe each word generally, not solutions for particular triples. The limited graph is not added to browser assets. Its edges express editorial context suggestions, not dictionary facts or semantic-quality labels.

## New holes

| Hole | Tee | Dogleg | Flag |
| --- | --- | --- | --- |
| #322 | STAMP | MUSIC | PATIENCE |
| #323 | LEAK | TRUST | BRAVE |
| #324 | EMPTY | DANCE | WIRE |
| #325 | SWEAR | MIRROR | SPRING |
| #326 | APPLAUSE | DEBT | RIVER |
| #327 | GARDEN | SPLIT | MEMORY |
| #328 | WISH | CHARGE | FROST |
| #329 | RIDDLE | FAMILY | BRUSH |
| #330 | CLAIM | CURTAIN | FRESH |
| #331 | RATTLE | PATIENCE | CLOUD |
| #332 | CRASH | KINDNESS | SILK |
| #333 | RALLY | SECRET | GARDEN |
| #334 | GRIN | FREEDOM | SILVER |
| #335 | CREASE | RESCUE | VOICE |
| #336 | SPRING | WITNESS | BREATH |
| #337 | PILLOW | JUSTICE | NOTE |
| #338 | BREEZE | DUTY | PAINT |
| #339 | GUEST | PRESSURE | BLOOM |
| #340 | PRETEND | BANK | THREAD |
| #341 | SOUND | BRAVE | PATCH |
| #342 | CORK | SHADOW | SWEET |
| #343 | BARREL | ROMANCE | SHINE |
| #344 | SCRATCH | COURAGE | REST |
| #345 | DEFY | SEASON | COLOUR |
| #346 | HANDLE | DREAM | CHOIR |
| #347 | FUSS | SPRING | SHELTER |
| #348 | NEAT | MYSTERY | FLAME |
| #349 | LAUGHTER | LETTER | SHADE |
| #350 | NOBLE | SCREEN | RAIN |
| #351 | CELEBRATE | POCKET | FROST |

## Reproduce and inspect

- `candidates.json` contains the 100 fixed triples; `candidate-review.json` records dispositions.
- `proposals.json` contains the selected words and independent word notes. No intended routes.
- `safety.json` retains diagnostic route spoilers, actual approach prefixes, opening checks, shared candidate pools and per-landing outcomes. It is offline research data only.
- Reproduce deeper checks with `node scripts/check_dogleg_choices.mjs reports/open-landscapes-30/review-candidates.json reports/open-landscapes-30/directions.json /tmp/open-landscapes-checks.json`. The raw output is large; the retained audit stores compact outcome sets for the final selections. `review-candidates.json` includes all 30 final proposals and other reviewed triples.
- `node tests/test_open_landscapes_30.mjs` independently replays every published outcome set and checks preserved progress and stable IDs.
- `scripts/append_open_landscapes_30.mjs` publishes the fixed selection only once; it refuses duplicate batches and duplicate word triples.

Tests also cover personal daily play, retirement, earlier dogleg choices, simulation pilot, Cleverness and relaxed leg factors. No player storage was read or written during testing.

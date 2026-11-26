# Live contact allowances: implementation and verification

The app implementation now applies the reviewed additive recipe to standard browser dogleg play:

- Rare-word allowance: `0.038 * clip((4 - Zipf) / 1.5, 0, 1)`.
- Common-word surcharge: `0.005 * clip(Zipf - 5, 0, 1)`.
- Exact incoming phrase allowance: **0.130**.
- Exact outgoing phrase allowance: `0.040 * clip((actual ball/played cosine - 0.10) / 0.15, 0, 1)`.
- Retain the existing hub surcharge; add all terms to submitted contact only, with a zero required-contact floor. There is no extra phrase exemption, suffix penalty or change to semantic destination, safety, dogleg/flag thresholds or automatic finishing.

## Data and the additional-source request

The compact local table contains 36,063 spelling-normalised vocabulary identities and 30,858 phrase pairs. It is 658,561 bytes uncompressed / 284,534 bytes gzipped, replacing the need to import the roughly 3 MB diagnostic WordNet table for live contact checks. No runtime dictionary API, LLM or scoring server is used.

Uniform Princeton WordNet 3.0 extraction supplies 29,554 canonical pairs. Open English Wordnet 2025 adds 1,198 pairs; the complete English Wiktionary/Kaikki phrase-POS subset adds another 106, giving **1,304 additional pairs** beyond Princeton. These are exact dictionary entries throughout the current game vocabulary, not selected from player routes. Wiktionary noun/verb compounds outside the phrase-POS subset are not claimed as covered. No old targeted Wiktionary validation snapshot is used. Source licenses, filtering and attribution are in `static/CONTACT-SOURCES.md`; source titles and input hashes are frozen in `lexicon-sources.json`.

Rebuild the generated packed table with `node scripts/build-contact-data.mjs`. It uses only frozen source and frequency snapshots and performs no network calls. `data-manifest.json` records sizes, hashes and source counts. Freeze this version’s table: later source changes must introduce a preserved new rule/data version rather than silently changing saved replays.

## Saved-history boundary

`Game` accepts explicit `contact_adjustment: {version: 'frequency-phrases-v1', after: N}`. It never implicitly enables the feature on an old/offline state. Fresh eligible browser games set `after: 0`. An existing live state adopts on its next valid committed submission, at its current history length, preserving every earlier shot. Invalid input leaves the game untouched. Retry prefixes retain the earlier boundary or activate at the chosen prefix length when revisiting an older lie. Pure restores/result views do not adopt or rewrite the state.

Eligibility is standard `golf-distance-v3` dogleg play with the current vectors, without semantic bunkers or headwind. Legacy, alternate-vector and experimental bunker modes retain existing mechanics. Rule metadata is serialized in game states and included in semantic, playtest and skill cache identities; old keys and scorer identity remain unchanged. IndexedDB schemas and personal best records are not reset or migrated away.

The engine first determines the ordinary semantic representation and destination, then tries adjusted contact. Contact rescue may only use that destination. A branch choosing another destination falls back to direct contact where the original destination matches; otherwise it preserves the original event. This reproduces the reviewed geometry-preserving experiment, including HOOD → STREET becoming a miss rather than moving its lie through STREETS.

## Verification

The offline production-engine replay audit covered **6,690 eligible deduplicated recorded shot contexts**. Production `Game` using only Princeton phrase evidence exactly matches all **56 reviewed changes: 48 misses become hits and 8 hits become misses**. Unioning the two additional sources produces **zero further outcome changes** in this sample. SPARE → TIME remains successful. Every tested semantic destination is unchanged, retained hits keep their arrival/finish outcomes, and changed saves restore exactly under their saved activation boundaries. `replay.json` records the actual events.

The contact regression covers packed-source lookup, spelling equivalence, historical/offline construction, new browser games, invalid-input atomicity, live adoption, prefix retries, mixed old/new states, zero contact floors, unchanged automatic finishing, assessment parity and completed-route Cleverness replay. Relevant existing engine, persistence, scoring, worker, progressive-loading and mobile/result regressions were also run; `verification.json` lists the 46 Node regression files.

The affected browser/worker import graph uses `contact-allowances-v1` cache tokens. The scorer remains `band-free-harmonic-v9-finishing-role82`; there is no scoring-formula change or global invalidation of historical achievements. Deployment workflow includes the new contact regression.

The release is prepared on current main in a separate checkout, preserving unrelated local work. No real browser storage is accessed or reset by the tests. GitHub Pages runs the deployment checks before publishing.

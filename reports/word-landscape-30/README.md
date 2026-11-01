# Word-first combinations: 30-hole playtest — 1 November 2026

FAME → SCATTER → RIBBON is retired as requested. SPARE → DREAM → TENSION, PROMISE → SHADOW → LUCK, CHARM → SPLIT → DUTY and DRIFT → HONOUR → CLEAR remain unchanged. FAME itself is not banned.

## Selection changes

Choose accessible, evocative words first, then consider the whole landscape: are there several ordinary ways into the dogleg, and do plausible landing choices open useful directions towards the flag? Vary physical, social and abstract contexts without noun-only templates, novelty quotas, minimum stroke counts or an intended solution. Intuitive openings and quick eagles are welcome. Do not use vector distance or mechanical validity as a proxy for enjoyment.

The local diagnostic now checks outgoing shots from **actually reached dogleg lies**, with their real baseline and route state, rather than just from the named dogleg. General everyday association notes are written per word independently of each proposed triple. Those notes are shared across all proposals, with spelling-normalised undirected context edges. They are editorial evidence, not a dictionary or exhaustive semantic classifier. A completion check also inspects the last association to the flag, including automatic finishes; a legal but unconvincing automatic finish is not sufficient evidence of a good hole.

The words were selected without routes, checked afterwards, and never rewritten to support a witness. Of 80 fixed candidate triples, 30 were retained after editorial and bounded safety checks. Every selected triple has at least two advancing natural opening probes, one or more reached dogleg words, and an independently replayed complete route. **21/30** have at least two reached dogleg words each with two or more supported onward options in these checks. The remainder have thinner measured coverage; that is an uncertainty to playtest, not a reason to outlaw a short, natural route. Diagnostics are not hints and do not determine Cleverness.

Limits: up to five approach inputs, six subsequent inputs, beam 128, 24 landing words; most checks used four/four, beam 64 and 12 landings. This is a small, non-exhaustive context graph (966 supported words); repeated words, route-dependent availability and pruning can hide alternatives. Metadata misses MARK and SEEDS; neither is a hole word and the vocabulary is unchanged. The full game vocabulary remains available to players.

### Calibration cautions

The four player-approved holes and rejected FAME combination were checked without altering their definitions or association notes to reproduce the feedback. The bounded check missed completions on three liked holes; it found several openings and dogleg handoffs on FAME too. It therefore **does not predict enjoyment**. Player reports override these counts. FAME's 34-journey frustration motivates stronger combination review, not a threshold or a harder-word policy. No promise is made that this batch takes fewer attempts.

## New holes

Added to the end of the archive, 1–30 August 2027. The app displays hole numbers; these become **#263–#292** after FAME retires. Every new hole is Par 5. Reusing familiar words in fresh combinations is deliberate; there is no unused-word quota.

| Hole | Tee | Dogleg | Flag |
| --- | --- | --- | --- |
| 263 | DANCE | BORROW | STITCH |
| 264 | CLOUD | COURAGE | WHISPER |
| 265 | TICKET | MERCY | ORBIT |
| 266 | MEND | SHADOW | RISK |
| 267 | SLEEP | BRIGHT | MASK |
| 268 | FOLD | PASSION | WILD |
| 269 | TEMPER | MIRROR | CREDIT |
| 270 | SIGNAL | COMFORT | SILK |
| 271 | DICE | SHELTER | MOMENT |
| 272 | ROOT | WONDER | FIELD |
| 273 | TRAIL | FAVOUR | SHINE |
| 274 | BORDER | FAITH | DRIFT |
| 275 | FRESH | DUTY | SHELL |
| 276 | LANTERN | AMBITION | FOLD |
| 277 | PAUSE | GRAVITY | RIBBON |
| 278 | CIRCLE | RESCUE | WARM |
| 279 | SILENT | SHIFT | WORTH |
| 280 | ROAM | JUSTICE | POCKET |
| 281 | TIDE | LUCK | CLEAR |
| 282 | FLASH | HONOUR | SOFT |
| 283 | NOTICE | TRUST | RIBBON |
| 284 | WARM | QUESTION | SCALE |
| 285 | SPIN | SHADOW | GENTLE |
| 286 | MARCH | CURIOSITY | MASK |
| 287 | WANDER | VALUE | CROWN |
| 288 | FLAME | BELIEF | CLOAK |
| 289 | SILVER | SECRET | TANGLE |
| 290 | THREAD | DANGER | WONDER |
| 291 | STAGE | BORROW | DRIFT |
| 292 | CATCH | PEACE | HOLLOW |

## Further removal candidates — no changes applied

These are **new concerns from the pilot**, without adverse play data yet. Their words may be good in different combinations. Please review before any retirement.

| Combination | Concern / recommendation |
| --- | --- |
| GLOW → BORROW → FENCE | The words are accessible, but BORROW channels the middle towards loans/possession; the combination risks two unrelated searches instead of a useful handoff. Replace if playtesting confirms the handoff feels arbitrary. |
| SCREEN → LOYAL → SWING | LOYAL suggests a relatively narrow set of person/pet/trust links. The SCREEN approach and SWING departure may feel disconnected despite the versatile endpoints. Prioritise a playtest; replace rather than make thresholds easier if frustrating. |
| LIFT → HONEST → SEASON | HONEST is a broad personal assessment with fewer concrete onward contexts. LIFT and SEASON are individually rich, but their combination may reward generic middle links. Consider replacing the combination, retaining the individual words. |
| DARE → COMFORT → SIGNAL | The first leg looks inviting, but the change from COMFORT to SIGNAL may be a separate chore rather than a satisfying consequence of a landing choice. Watch the second leg; replacement candidate, not a proven bad hole. |

The [previous full-bank shortlist](../hole-word-review-2026-10-31/README.md) remains relevant, especially these stronger vocabulary/category risks:

- CUSHION → MONARCHY → APIARY: APIARY is specialised; a generic monarchy category may dominate. Recommend replacement.
- COIN → HERBACEOUS → STOIC: HERBACEOUS is technical and the combination risks forced bridges. Recommend removal.
- MANGO → JARS → DIRIGIBLE: narrow ingredient/container associations followed by an uncommon endpoint. Recommend replacement.
- STOOL → FURNITURE → ARITHMETIC: immediate parent-category dogleg is likely unremarkable; the second leg is a separate semantic jump. Recommend replacement.
- ANVIL → METALLURGY → PORTRAIT: a near-automatic discipline opening followed by unrelated exploration. Recommend replacement.
- TAPIR → GRIP → SQUEEGEE: specialised endpoints create vocabulary burden and narrow natural openings. Recommend replacement.

All 24 earlier priority recommendations and 90 watch items remain available. The [review inventory](review.json) accounts for all 285 prior definitions, including 23 retired records and the four positively assessed controls. No additional recommendation was applied.

## Reproduce / inspect (contains spoilers)

- [Word-only proposals](proposals.json), [80 fixed candidates](candidates.json), [independent context notes](directions.json).
- [Safety diagnostics](safety.json), [published settings and replay evidence](validation.json), [feedback controls](controls-audit.json).
- Run `node scripts/check_word_landscapes.mjs reports/word-landscape-30/candidates.json reports/word-landscape-30/directions.json /tmp/landscape-checks.json` for the default bounded check. The expanded limits recorded per selected check can be passed to the exported `inspectWordLandscape` function. Replays are examples, never solutions players are expected to discover.
- Run `node tests/test_word_landscape_30.mjs` for independent replay, actual handoff, stable-ID, retirement and settings checks.

## Scope

No gameplay, scoring, vector, vocabulary, limits, UI layout or saved-state logic changed. All 285 previous definitions, dates and stable IDs are byte-equivalent as JSON. FAME history remains archived; only its playable listing is retired. The new diagnostic code and reports are local research files, never imported by the game. Browser changes only refresh manifest/retirement module cache versions.

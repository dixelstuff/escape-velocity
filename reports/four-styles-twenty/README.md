# Four selection styles — 9 November 2026

Twenty new holes prepend at public/admin #1–20, preserving all previous public holes at #21–220 and all archive IDs/progress. The exaggerated playful vocabulary direction is withdrawn as a future selection preference; no old definition is rewritten.

| Holes | Style | Editorial emphasis |
|---|---|---|
| 1–5 | Grounded objects | Ordinary tangible objects, places and materials across all three positions. |
| 6–10 | Versatile everyday words | Familiar multi-use anchors (CRANE, JAM, PUPIL, PARK, POUND), with grounded or ordinary companions. |
| 11–15 | Everyday situations and choices | Plain actions and familiar social/practical contexts, without expressive effect words. |
| 16–20 | Qualities and scenes | Common descriptive words with several literal or figurative uses, framed by ordinary contexts. |

These are editorial styles, not controlled difficulty treatments, intended solutions or claims about scores. Five holes per style is a small within-player trial. The groups differ deliberately in selection emphasis; no score or result distribution was optimised. Use explicit ratings and subsequent feedback to compare them rather than treating strokes or exploration counts as enjoyment. Group labels are recorded in definition metadata rather than added to the play screen.

Validation remains light: vocabulary/input policy, duplicate triples, direct literal legs, and six independently nominated familiar opening ideas per tee. Final probes: 88/120 legal forward moves, at least three per hole. Sixty distinct words avoid the prior public collection plus the latest 100 archive definitions, including withdrawn batches (freshness.json). Restricted initial pairings were replaced. No continuation search, route enumeration, simulation or Cleverness analysis.

| # | Tee | Dogleg | Flag | Style |
|---|---|---|---|---|
| 1 | BENCH | MUSEUM | FLOUR | 1 |
| 2 | FUNNEL | SCHOOL | PLATE | 1 |
| 3 | BISCUIT | STATION | STONE | 1 |
| 4 | SPADE | VILLAGE | PAPER | 1 |
| 5 | CUPBOARD | FACTORY | CARD | 1 |
| 6 | CRANE | RESERVE | LESSON | 2 |
| 7 | JAM | UNION | SHELF | 2 |
| 8 | PUPIL | PROFIT | DISH | 2 |
| 9 | PARK | REASON | WHEAT | 2 |
| 10 | POUND | PRACTICE | JAR | 2 |
| 11 | SHARE | EXCUSE | DROP | 3 |
| 12 | OFFICE | COURAGE | RENT | 3 |
| 13 | SERVE | LOSS | DIVIDE | 3 |
| 14 | LEND | DISTANCE | MEET | 3 |
| 15 | WAIT | SAFETY | JOIN | 3 |
| 16 | PALE | STORY | CLOSE | 4 |
| 17 | DRY | RANK | STILL | 4 |
| 18 | THICK | DUTY | CLEAN | 4 |
| 19 | FLAT | HONEST | WIDE | 4 |
| 20 | DULL | CHURCH | FAINT | 4 |

## Optional player ratings

A collapsed “Rate this hole” section appears in completed-hole results, including reopened results. All answers start unrated: enjoyment 1–5; opening too obvious/about right/too hard; concept transitions forced/ordinary/satisfying; optional note up to 500 characters. Choices save on change; notes use an explicit Save note button. Saved status waits for the device write to complete. Ratings are independent of Cleverness and never alter game state, bests or attempts.

The current research batch stores the latest response per permanent hole ID in `play.holeFeedback`, with the exact rated route/strokes, endpoint words, timestamps and editorial-style metadata. `holeStyles` also identifies trial groups for played holes even without ratings. Latest-response merge protects feedback from older snapshots and retains other holes. Resetting the research batch clears feedback; personal bests and routes remain. Explicitly restoring research history restores its ratings. No real player storage is used in tests.

Tests: test_four_styles_twenty.mjs (freshness, group/order/identity/opening replay, saved progress), test_hole_feedback.mjs (validation, reload/export, stale merges, clearing/restoration and bests), plus existing persistence/reset/result/mobile regression checks. Gameplay and scorer identities are unchanged; affected browser import graphs are cache-invalidated.

Isolated Chrome verification: played the existing POND/SINK/LEVEL/ENDING/TWIST route in a temporary profile, set all three ratings and a literal-text note, saved the note, refreshed, downloaded and inspected the JSON, retried, focused/blurred the input and changed holes. No page errors; real browser storage untouched. Mobile (390px) and desktop (1120px) result layouts were visually inspected; desktop focus/blur remained anchored.

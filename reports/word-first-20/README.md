# Twenty word-first playtest holes

These are **20 new Par 5 test holes, #244–#263**, appended as their own batch. The previous 265 archived definitions, stable IDs, dates and saved progress are unchanged. No additional shortlisted holes were retired. There are now 263 playable holes.

## Selection

The starting material was familiar words with independent everyday associations. The candidate triples were written as words, not as chains of intermediates. The association notes in `directions.json` describe each word independently; they do not link tee to dogleg to flag.

The final set mixes social, emotional, action and physical contexts, with familiar words such as FAME, DRIFT, SPARE, BLUFF, STILL, SCREEN and SHELTER. It includes concrete words without returning to a species/food/parent-category template. There is no required grammatical pattern and no unused-word quota.

Candidates were screened for existing direct-leg rejection, supported vocabulary and plausible opening guesses. Candidates with very limited success among the natural opening probes were set aside. The selected triples were then fixed before the bounded completion check; a SHA-256 of the proposals records the exact word choices used for that check. No word in a selected triple was changed to make a diagnostic route work.

## Validation, not intended solutions

Each published triple has several pre-written, natural tee guesses that hit and advance under the existing engine. The literal dogleg's independent associations were also probed against the flag, as a limited second-leg check. This does not assume the literal dogleg must be played.

After word selection, a bounded engine search used the shared pool of independently brainstormed words to find a legal completion witness. Every witness was separately replayed from the tee with the authoritative engine. The search was limited to a beam of 36 positions and nine player inputs; it was not exhaustive and makes no shortest-route or strategic-diversity claims. Safety witnesses are not authored solutions, featured routes, hints or recommendations for play.

Some mechanically valid witnesses use broad words such as EVEN or JUST. Their existence is not evidence of an interesting human route. The tests establish mechanical playability, not enjoyment, semantic credibility or how the player should solve the hole. This small batch is intended for human comparison with the earlier selection method.

No Cleverness score, route narrative, word-sense trick, minimum stroke count or two-shot-dogleg requirement was used as a selection target. Live settings contain no solution or golden-path override. Gameplay, automatic finishing, spelling equivalence, plural rescue, scoring and attempt rules are unchanged.

## Words only — no route spoilers

| Hole | Tee | Dogleg | Flag |
|---:|---|---|---|
| 244 | FAME | SCATTER | RIBBON |
| 245 | PROMISE | SHADOW | LUCK |
| 246 | DRIFT | HONOUR | CLEAR |
| 247 | CHARM | SPLIT | DUTY |
| 248 | SPARE | DREAM | TENSION |
| 249 | HIDE | RHYTHM | POCKET |
| 250 | COLD | TRUST | PARADE |
| 251 | BLUFF | ROMANCE | SHIFT |
| 252 | STILL | REVENGE | SMOOTH |
| 253 | RUSH | WISDOM | FOLD |
| 254 | LIFT | HONEST | SEASON |
| 255 | GLOW | BORROW | FENCE |
| 256 | HABIT | STITCH | CROWN |
| 257 | TENSION | GIFT | TRACK |
| 258 | SCREEN | LOYAL | SWING |
| 259 | SHELTER | TEMPT | PAINT |
| 260 | SPOIL | GRAVITY | RING |
| 261 | THRILL | FRAME | ROOT |
| 262 | PLAIN | AMBITION | ECHO |
| 263 | DARE | COMFORT | SIGNAL |

The first hole is **FAME → SCATTER → RIBBON**. Select #244 in Browse holes, then use the carts to move through the batch.

Editorial source files: [candidate triples](candidates.json), [independent word directions](directions.json), and [published proposals](proposals.json). The latter two contain association prompts if you prefer to play without hints first. [Validation](validation.json) and [safety witnesses](safety.json) contain diagnostic route spoilers.

## Verification

All 91 applicable CI commands passed locally; the unrelated, locally modified Solution Landscape research test was left to clean CI. An isolated mobile Chrome profile confirmed 263 selectable holes, the #243/#244 boundary, correct final-hole navigation at #263 and a natural opening shot on FAME. No player browser storage was touched. All earlier definitions and the retirement list are unchanged.

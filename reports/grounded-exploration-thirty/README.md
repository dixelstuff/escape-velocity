# Grounded exploration thirty — 7 November 2026

## Small change to the successful baseline

Keeps the current simple word-first, freestyle approach. Multiple meanings remain welcome, but are no longer sought throughout every triple. This batch includes more vivid everyday objects, clear actions and specific qualities. No POS/polysemy quota, quirky vocabulary goal, intended route, Cleverness target or stroke-distribution target was introduced. The player discovers the connections.

The wording at the top of `LEVEL_DESIGN.md` records this subtle rebalance. Its previous instruction to prefer multiple meanings throughout every triple is softened accordingly; the opening/playability checks and game rules remain the same.

## Lightweight validation

All 30 use the unchanged normal Par 5 dogleg rules, including the current 0.32 dogleg-arrival finish rule. No bunker configuration is added. Vocabulary, blocked-word, duplicate-triple and direct literal-leg checks pass. Ten independently nominated ordinary associations per tee were submitted separately: 199 of 300 probes were legal forward opening moves, with at least three on each final hole. A few initial pairings were replaced when this warning check found restricted opening access or a direct leg. This is not a complete-route search or a guarantee that every opening completes.

All 90 word slots are distinct within this batch and do not repeat any tee/dogleg/flag word from the preceding public eighty, after normal UK/US equivalence. Some words occur in the much older archive; they are not claimed to be globally unused.

## Ordering and preservation

The new thirty are prepended to the public view, and the existing admin ordering places that identical public view first. New holes are #1–30; the retained public eighty are #31–110. All prior permanent IDs/settings remain identical. Older saved bests and unfinished lies remain attached to their existing IDs, regardless of their display numbers. No player data is reset or migrated. Existing bunker experiments remain separate and unchanged.

The permanent archive is appended rather than reordered; its internal date IDs remain implementation identifiers, while players see hole numbers. A cache-version update loads the new collection.

## New holes

| # | Tee | Dogleg | Flag | Forward opening probes / 10 |
|---|---|---|---|---|
| 1 | SOAP | REPUTATION | GLOW | 6 |
| 2 | PIANO | GOSSIP | BLOSSOM | 7 |
| 3 | BREAD | TRAVEL | JEWEL | 3 |
| 4 | UMBRELLA | ATTENTION | CRASH | 3 |
| 5 | CAMERA | PROMISE | SWEET | 7 |
| 6 | RUST | HISTORY | RELAX | 7 |
| 7 | CUSHION | BUSINESS | THUNDER | 6 |
| 8 | SCISSORS | AGREEMENT | ORCHARD | 7 |
| 9 | STAIRS | SUCCESS | GLASS | 6 |
| 10 | SAND | INFLUENCE | MELODY | 5 |
| 11 | LEMON | ENERGY | HINGE | 10 |
| 12 | ROPE | FORGET | POLITE | 8 |
| 13 | KETTLE | FRIENDSHIP | VEIL | 8 |
| 14 | CHIMNEY | CULTURE | SLIP | 9 |
| 15 | PAINT | EVIDENCE | ENJOY | 3 |
| 16 | SWIM | CONTROL | FRUIT | 9 |
| 17 | MEND | TRUST | BLUSH | 5 |
| 18 | GROW | CURIOSITY | BOAT | 4 |
| 19 | LISTEN | STRENGTH | VINE | 8 |
| 20 | CARRY | MIRACLE | SMOOTH | 9 |
| 21 | CLAP | CONFIDENCE | PICNIC | 5 |
| 22 | CHEW | PRIVACY | SALUTE | 7 |
| 23 | WANDER | RESPECT | KNIFE | 8 |
| 24 | GENTLE | EXCHANGE | TEETH | 9 |
| 25 | HEAVY | HOPE | DRAIN | 8 |
| 26 | PROUD | MOTION | SUGAR | 9 |
| 27 | CROOKED | REPAIR | SUNSHINE | 4 |
| 28 | YELLOW | BEHAVIOUR | HURRY | 6 |
| 29 | WET | ARGUE | TRUMPET | 6 |
| 30 | EXPLORE | AUTHORITY | TOAST | 7 |

## Reproducibility

The existing scripts were reused:

```sh
node scripts/check_rich_openings.mjs reports/grounded-exploration-thirty
node scripts/append_rich_associations_thirty.mjs reports/grounded-exploration-thirty grounded-exploration-thirty-2026-11-07 grounded-exploration-thirty-v1
node tests/test_grounded_exploration_thirty.mjs
```

The append command is intentionally one-time and refuses to add an already published batch. The regression test independently replays each opening probe and checks original archive integrity, public/admin order, and preservation of an older saved result. No route enumeration or scoring optimisation was used.

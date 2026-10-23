# Scorecards 16 review

Compared journey IDs and update timestamps against export 15, excluding unchanged records. 141 new or updated journeys cover nine played holes. Five have a completion in this new material; four do not.

| Hole | Highest attempt counter | Best completed strokes | Failed tee shots | Failed shots total |
|---|---:|---:|---:|---:|
| cigar → harbour → necklace | 18 | — | 13 | 18 |
| octopus → office → riverbank | 8 | 4 | 0 | 4 |
| broom → airport → microscope | 18 | — | 6 | 18 |
| fountain → newsroom → camera | 12 | 4 | 3 | 8 |
| beetle → armour → castle | 18 | 4 | 8 | 13 |
| snail → jewellery → clock | 9 | 5 | 0 | 7 |
| magnet → hospital → orchestra | 8 | 4 | 3 | 7 |
| peacock → stationery → theatre | 18 | — | 18 | 18 |
| ferry → classroom → beehive | 12 | — | 3 | 8 |

The strongest evidence of unsatisfying starts is CIGAR → HARBOUR → NECKLACE (18 attempts, 13 failed tee guesses), PEACOCK → STATIONERY → THEATRE (18 attempts, all 18 failed at the tee), and BROOM → AIRPORT → MICROSCOPE (18 attempts, six failed tee guesses before/among later exploration). FERRY → CLASSROOM → BEEHIVE also has no completion at its 12-attempt cap, but its failures are less concentrated at the tee.

These are level-selection failures, not evidence that all global contact thresholds should be relaxed. A model-found completing route is insufficient as a quality gate: before adding a hole, require several plausible human-readable openings and verify intended concrete associations against actual scoring. Assess first-shot success separately from eventual route length. Raising the attempt cap would not repair an opening that feels arbitrary. No thresholds or existing hole selections changed in this patch.

Positive counterexamples: OCTOPUS → OFFICE → RIVERBANK improved from six to four strokes; BEETLE → ARMOUR → CASTLE improved from five to four; FOUNTAIN → NEWSROOM → CAMERA completed with pen → write → story. MAGNET → HOSPITAL → ORCHESTRA completed with science → medicine → art, though three plausible healing/health tee guesses missed.

BEETLE's horse → knight → armour → knight route reproduces the label bug: the game allows KNIGHT on both legs but the map deduplicated by spelling. Render and hit-test keys must distinguish the leg, while displaying the original word unchanged.

Specific misses show two different problems: CIGARETTE strongly connects to CIGAR (0.586) but moves away from HARBOUR; FEATHER strongly connects to PEACOCK (0.450) but moves away from STATIONERY. SAILOR aims toward HARBOUR but barely connects to CIGAR (-0.048). EXOSKELETON and SHELL from BEETLE move forward yet miss contact by roughly 0.027 and 0.047. This is a narrow overlap between natural tee associations and target-facing options, rather than uniformly weak semantic contact.

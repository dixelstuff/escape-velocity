# Relaxed leg factors

Scorer: band-free-harmonic-v4-relaxed-legs. Only the final leg-factor schedule changed. Q, I, S, E, opportunity rate .08, one-stroke coefficient 2 and the 100 × L ceiling are unchanged.

| Route | Legs | Before | After |
|---|---|---:|---:|
| FEATHER → QUILL → PEN → FOUNTAIN → OCEAN | 2+2 | 80 | 80 |
| FEATHER → QUILL → PEN → INK → SQUID → OCEAN | 2+3 | 72 | 75 |
| KANGAROO → POUCH → PANTS → SUIT → COURT | 2+2 | 92 | 92 |
| KANGAROO → FUR → SEAL → COURT | 1+2 | 91 | 91 |
| CROCODILE → BAG → RUNWAY → SPACE | 2+1 | 88 | 88 |
| CROCODILE → HANDBAG → CLOSET → SPACE | 1+2 | 87 | 87 |
| CROCODILE → LEATHER → SUIT → SPACE | 1+2 | 81 | 81 |
| CROCODILE → BOOTS → SUIT → SPACE | 1+2 | 77 | 77 |
| CROCODILE → HAT → FASHION → RUNWAY → SPACE | 2+2 | 75 | 75 |
| CROCODILE → NECKLACE → JEWELRY → BOX → SPACE | 2+2 | 75 | 75 |
| CIGAR → IMPORTED → SHIP → BOW → NECKLACE | 2+2 | 82 | 82 |
| CIGAR → BOX → CONTAINER → BAG → NECKLACE | 2+2 | 79 | 79 |
| HAMSTER → WHEEL → POWER → ELECTRICITY | 2+1 | 96 | 96 |
| SQUID → INK → DOCUMENT → ESPIONAGE | 1+2 | 84 | 84 |
| SNOWFLAKE → BEAUTIFUL → DIAMOND → QUALITY → PRECISION → TECHNIQUE → SURGERY | 2+4 | 44 | 54 |
| PENGUIN → FISH → MARKET → VOLATILE → VOLCANO | 2+2 | 76 | 76 |
| PENGUIN → BOOKS → CASH → RISE → VOLCANO | 2+2 | 81 | 81 |
| PENGUIN → BOOK → NOTE → MESSAGE → DANGER → VOLCANO | 2+3 | 73 | 76 |
| VELVET → RED → TELEVISION → DRAMA → JEALOUSY | 2+2 | 80 | 80 |
| VELVET → SMOOTH → ORBIT → SPHERE → RELATIONSHIP → JEALOUSY | 2+3 | 70 | 73 |
| VELVET → CURTAIN → SLIDE → DRIFT → ORBIT → EYE → TEARS → JEALOUSY | 4+3 | 41 | 52 |
| PRAWN → KING → RULER → HEAD → SALESMAN | 2+2 | 70 | 70 |
| ROBOT → ACTIVITY → DISORDER → CHAOTIC → SPIRAL → STAIRS | 2+3 | 66 | 69 |
| FLUTE → PIPE → WATER → PLANT → BOTANY | 1+3 | 70 | 73 |
| APRICOT → SMELL → PERFUME → CHEMICAL → CHEMISTRY | 2+2 | 62 | 62 |
| HONEYCOMB → LATTICE → PATTERN → DESIGN → NOTES → MUSIC → ORCHESTRA | 3+3 | 41 | 45 |
| RABBIT → BUNNY → MAT → PAD → MOUSE → COMPUTER → ELECTRIC → COOK → OVEN → BAKERY | 5+4 | 19 | 31 |
| RABBIT → MOUSE → COMPUTER → ENGINEER → BAKER → BAKERY | 2+3 | 75 | 79 |
| RABBIT → MOUSE → CHIPS → PIE → BAKERY | 2+2 | 84 | 84 |
| ALMOND → SUGAR → HARD → STONE → STATUE | 1+3 | 69 | 72 |
| TORTOISE → SEA → BEACH → WEDDING | 1+2 | 90 | 90 |
| MATE → FRIEND → DINNER → DATE → FATE | 2+2 | 77 | 77 |
| ANCHOR → SEA → NATURAL → BEAUTIFUL → BUTTERFLY | 2+2 | 73 | 73 |
| ANCHOR → SEA → SICK → FLY → BUTTERFLY | 2+2 | 74 | 74 |
| ANCHOR → NEWS → DRUGS → HIGH → FLY → BUTTERFLY | 2+3 | 68 | 71 |
| ANCHOR → NEWS → DRUGS → HERBAL → FLOWERS → BUTTERFLY | 2+3 | 68 | 71 |
| HAMMOCK → ROPES → TRAPEZE → CIRCUS → CARNIVAL | 2+2 | 70 | 70 |
| HAMMOCK → ROPES → CIRCUS → CARNIVAL | 2+1 | 81 | 81 |

Saved rows reuse fixed upstream evidence. HAMMOCK rows were independently replayed and fully analysed. No result-label bonuses or morphology adjustments were added.

Longer legs: 5 = .60, 6 = .39, 7 = .2535; subsequent factors decay by .65. The old schedule had a separate six-plus formula with a large drop from .45 to .21125. The new tail retains the decay rate and anchors it at the relaxed five-stroke factor.

The user-supplied HAMMOCK comparison reproduces exactly: 70 versus 81, unchanged. TRAPEZE remains verified removable and ineligible for positive originality. Strategic effectiveness remains 0.6184375 for the long route and 0.9771875 for the short route. No morphology rules were added.

Saved v2/v3 completed reports with raw opportunity evidence and actual leg counts migrate to the new version from unrounded values on load. The report key, displayed score and saved bests are refreshed together. Histories already cleared for research retain their player summaries; without underlying evidence those summaries cannot be recalculated reliably.

Validation: exact factors/product, smooth .65 tail, fixed-quality monotonicity, unchanged one/two-stroke legs, unchanged .08 opportunity and coefficient-2 bonus, old/new factor-ratio equality, 15 full authoritative calibration analyses plus eight original playtests, and current-v3 migration/idempotence.

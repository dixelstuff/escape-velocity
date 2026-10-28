# Live opportunity 0.08 / bonus 2

Scorer: `band-free-harmonic-v3-opportunity08-bonus2`.

Exactly two substantive scoring controls changed: live semantic ingenuity is `raw_I / (1 + 0.08 × max(0,N−1))`; the eligible one-stroke bonus is `2QL`, once, capped with the existing `100L` ceiling. The 50/50 harmonic operator, quality mapping, strategic/direct-stage evidence, elegance, leg factors and game thresholds are unchanged.

The live adapter applies the opportunity revision after unchanged evidence extraction. This preserves historical V6 comparison calculations and the raw strongest-manoeuvre evidence, while the live report exposes the new I, opportunity factor/rate, quality and final score. It does not layer the new correction on top of the old one.

## Files

- `static/cleverness-score-config.mjs`: shared score identity and 0.08/2 constants.
- `static/cleverness-live-score.mjs`: raw-evidence opportunity adapter, reused by live analysis and saved-report conversion.
- `static/vector-cleverness/band-free.mjs`: coefficient 2 and formula text; leg table/mapping/ceiling retained.
- `static/vector-cleverness/index.mjs`: invokes the adapter before returning the live report.
- `static/cleverness-playtest-data.mjs`: new report/cache identity.
- `static/flight-log.mjs`: idempotent conversion of saved v2 vector reports using their raw evidence; play state remains untouched. Incomplete old evidence is freshly analysed when reopened.
- `static/daily-game.mjs`: current-version acceptance and independent cleverness-best re-ranking. Stroke bests, current journey and recency are preserved.
- `static/daily-cleverness-panel.mjs`: accepts the shared current scorer identifier.
- `static/app.js`, `static/assessment-worker.mjs`, `static/engine.mjs`, `static/cleverness-playtest-panel.mjs`, `static/daily-ui.mjs`, `static/index.html`: cache URL updates and startup conversion wiring; no keyboard, shot or animation changes.
- `tests/test_live_opportunity08.mjs`, `tests/opportunity08-bonus2-fixtures.json`: 15 authoritative routes with full-precision expected results frozen from the earlier experiment, plus persistence/re-ranking checks.
- `tests/test_one_stroke_bonus.mjs`, `tests/test_band_free.mjs`, `tests/test_personal_daily.mjs`, `tests/test_personal_daily_panel.mjs`: new expectations and score identity, retaining bonus-once, ceiling, rounding, component and persistence assertions.
- `.github/workflows/pages.yml`: runs the new live regression and schedule regression.
- `DAILY_GAME.md`: current scorer and separately requested schedule additions documented.

Historical offline research references retain their old coefficients in `scripts/research-band-free-v2.mjs`; the corresponding local experiment scripts/tests use that explicit frozen reference. Their original datasets and expected scores were not rewritten to make the new scorer pass.

## Verification

All 66 deployment checks passed locally after the scorer change; the subsequently added future-schedule regression also passed. The 15-route live test agrees with the frozen `opp08-b2` experiment in unrounded score, quality, I, opportunity factor, bonus and leg product. S and E are exactly unchanged.

| Route | New live score |
|---|---:|
| KANGAROO → POUCH → PANTS → SUIT → COURT | 92 |
| KANGAROO → FUR → SEAL → COURT | 91 |
| CROCODILE → BAG → RUNWAY → SPACE | 88 |
| CROCODILE → HANDBAG → CLOSET → SPACE | 87 |
| CROCODILE → HAT → FASHION → RUNWAY → SPACE | 75 |
| CIGAR → IMPORTED → SHIP → BOW → NECKLACE | 82 |
| HAMSTER → WHEEL → POWER → ELECTRICITY | 96 |

A browser refresh converted the existing PENCIL → STICK → FIRE → PIT → ORCHESTRA result to 81 consistently in the result, recent-nine card and aggregate cleverness statistic, retaining the 4-stroke birdie and route.

## Separate user request during implementation

29 of the 30 supplied hole proposals passed the existing vocabulary/direct-leg checks. The original 106 definitions were preserved byte-for-byte as serialized objects; new daily entries append from 3 February through 3 March 2027. COMPASS → CARNIVAL → JELLYBEAN was excluded because JELLYBEAN is not in the vocabulary. The future picker exposes the entire scheduled queue for immediate testing.

Content files: `static/daily-manifest.mjs`, future-access logic/copy in `static/daily-game.mjs` and `static/index.html`, `tests/test_future_daily_proposals.mjs`, and validation snapshots in `reports/user-daily-proposals/`. No replacement words or vocabulary changes were introduced.

## Separate reset request

Added Export → Reset play data in the personal interface, with an explicit HTML confirmation dialog, fresh engine state prepared before reset, storage rollback, and recovery of both daily bests and route history. Custom definitions and selection are preserved. New code: `static/reset-personal-play.mjs`; wiring/styles in `static/app.js`, `static/index.html`, `static/style.css`; regression `tests/test_personal_reset.mjs`. The deployment suite now contains 68 checks.

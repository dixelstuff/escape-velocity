# Simplified personal interface and earlier analysis

- One Word golf #… header, retaining Space Grotesk. Previous/next carts remain. The separate main title is hidden only in personal mode.
- Current strokes replace the dots. Tapping opens How to play, including chip-range visibility. A separate personal-best link provides both best routes for a completed hole, without requiring another finish.
- Recent finishes contain completed holes only, ordered by actual completion time rather than last inspection. Existing completion timestamps are backfilled from saved journeys.
- Best-three cards switch between ingenuity and strokes and expose the corresponding routes. Result distribution buttons filter recent finishes; the current filter is indicated and can be cleared by tapping it again.
- Ingenuity replaces Cleverness in the personal UI only. The live band-free-harmonic-v3-opportunity08-bonus2 scorer is unchanged.

## Reset diagnosis and isolation

Both old and new tabs previously retained their own in-memory copies of the shared log. A later stale write could overwrite reset history. The original reset also shared legacy storage keys with previous app versions.

PersonalPlayStorage reads existing keys without migration until reset. A reset prepares a new namespace, writes the new log and daily records, and publishes its generation marker only after those writes succeed. Failed commits restore in-memory data and remove the incomplete namespace. Tabs on a prior generation reject reads/writes and reload on the marker's storage event. Older releases can still write their legacy keys, but the current app no longer reads those keys after reset. Exports use the active namespace and reject stale-generation export requests. Normal exports never include the recovery copy. Custom definitions stay saved; only custom definitions referenced by current-batch play are included in exports.

## Earlier semantic preparation

The assessment worker downloads verified semantic profile shards and prepares nearest-neighbour/local-neighbourhood caches for fixed words and landed route words before completion. It yields between words and uses a separate worker from shot processing. There is no route search, partial score, or altered formula. A complete route starts its real analysis as soon as the final shot result is known, while the existing animation is still running; the results card reuses that pending/cached task.

## Validation

New tests cover stale tabs from current and legacy releases, reset commit failure, unchanged persisted data before explicit confirmation, completion-only recency, both top-three rankings, interactive filters, partial-route cache preparation without scoring, shard reuse and exact warm/cold score parity. Existing 15-route scorer regression, personal history/panel/reset, flight log and keyboard-layout regressions pass. Deployment runs 72 checks.

Mobile inspection at 390 px confirmed one-line navigation, no horizontal overflow, a working stroke-counter help panel and personal-best routes. No play data was reset during this task. Real iPhone keyboard transitions were not simulated; their code was not changed.

## Follow-up interface repairs

The header is now borderless and uses automatic horizontal margins, matching the map on desktop. Personal styling is present in the initial HTML, before module loading; legacy header text is no longer written during personal-mode updates. The mobile keyboard header has zero vertical padding and top margin, restoring the original compact height budget. The counter is 26×27 px with 16 px text. Best-route access is in completed-hole cards and inside How to play, with no extra input-area link.

Quota tests reproduced the reset implementation's unnecessary source-plus-recovery duplication. Reset now holds the previous source in memory while writing its replacement, restoring the source on failure. Ordinary writes can release recovery copies and superseded legacy play records on QuotaExceededError, never the active log or saved custom definitions. Non-quota failures are not treated as space pressure. Specific save errors are retained in the warning's title; no warning was reproduced in the local browser during inspection.

Per-hole artwork now varies tree cluster positions/counts/radii, path control points, shoreline coves and bunker shape/size/angle. A deterministic ±1.4° display rotation affects the complete course, markers and hit paths together. Word-label animation converts through SVG matrices to avoid rotation-induced drift. Scoring and saved routes stay in their original coordinates. Tests check 36 terrain combinations, determinism, tree/path clearance and sand/green separation.

## Header spacing and terminology follow-up

Mobile now uses the same 10 px main top padding and 0/8 px header top/bottom margins in both input states. This keeps the compact keyboard height budget; it brings the resting view into alignment rather than adding height above the keyboard. The within-hole scroll anchor retains that same 10 px top gutter through CSS scroll-margin. Desktop header top margin grows from 32 to 52 px with viewport width. The personal display name is Cleverness again, including results, rankings, stats and help; formulas and internal ranking keys are unchanged.

## Best routes and result filters

The primary best route minimises strokes, then maximises unrounded Cleverness within that stroke count. Saved bests are rebuilt from completed reports, including late-arriving analysis. Route panels show that route once. A second route is shown only if it uses more strokes, has a higher displayed Cleverness score, and is a different word sequence. Independent stroke/Cleverness headline records remain intact.

The result distribution now uses horizontal bar rows. Selecting a result toggles it; an explicit All holes control always clears the filter. Mobile hover feedback no longer resembles a retained selection. Deployment includes 73 checks.

Stats now label the summary Overall Cleverness, with a mean beside each result bar. Result means use the selected lowest-stroke routes, so a longer high-Cleverness route cannot inflate an eagle/birdie row. Missing analysis is excluded from the mean.

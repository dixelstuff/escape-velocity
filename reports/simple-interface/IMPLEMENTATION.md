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

New tests cover stale tabs from current and legacy releases, reset commit failure, unchanged persisted data before explicit confirmation, completion-only recency, both top-three rankings, interactive filters, partial-route cache preparation without scoring, shard reuse and exact warm/cold score parity. Existing 15-route scorer regression, personal history/panel/reset, flight log and keyboard-layout regressions pass. Deployment runs 71 checks.

Mobile inspection at 390 px confirmed one-line navigation, no horizontal overflow, a working stroke-counter help panel and personal-best routes. No play data was reset during this task. Real iPhone keyboard transitions were not simulated; their code was not changed.

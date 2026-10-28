# Personal daily Word Golf

The default app is one daily waypoint hole, always Par 5, with an archive navigated by previous/next. New holes publish at 00:00 UTC; the complete future queue is also available for advance playtesting. Previous/next navigation and the “Choose or create a hole” picker include these previews. There is no submission, league, score lock, practice distinction, scoring-attempt budget or stroke ceiling.

The existing distance/contact/waypoint rules, misses ending attempts, tap-to-retry behaviour, mobile keyboard handling and animations are retained. `continuous_play` permits long successful paths; the explicit `challenge.unlimited` marker survives engine construction, restoration and prefix retries. Automatic finishing strokes still count.

## Personal records

`word-golf.personal-daily.v1` stores selected date, visits and per-hole bests. Full attempts remain in the existing flight log, which is not reset or migrated destructively. Older course/Tour data is retained. New personal records are kept separately from those old competitions.

- Fewest strokes and highest cleverness are independent records with their own route and journey ID.
- Cleverness uses `band-free-harmonic-v3-opportunity08-bonus2` (opportunity rate 0.08; one-stroke coefficient 2). Comparison scores and historical analysis panels are absent from normal play.
- Compare cleverness using the unrounded score; round only for display. Delayed analysis cannot switch the active hole or overwrite a newer live journey.
- The recent-nine view contains distinct holes ordered by most recent visit/play. Returning to a hole updates that row. Older records are retained for lifetime stats.
- Count each completed hole once in the stroke-result distribution, using its best result. Unfinished holes have no score. Best-stroke improvements update the distribution. Average best cleverness excludes pending/unavailable analysis.
- Export play data includes the personal records and full device-local flight log. Unlimited-play exports record actual strokes, not a seven-stroke cap or invented default.

## Content and maintenance

`static/daily-manifest.mjs` fixes 135 distinct waypoint layouts, one per date from 20 October 2026 through 3 March 2027, including 29 user-proposed additions (JELLYBEAN was excluded because it is outside the vocabulary). All are Par 5 and curated golden shortcuts are disabled. Dates and IDs must remain immutable; append new curated holes before the queue ends. When a queue ends the most recent published puzzle remains playable, rather than repeating a hole under a new date.

Historical experimental UI and course modes are retained behind `?lab` (e.g. `?lab&mode=tour`) for development and old-data inspection. They have no normal-page links. Old analysis panels are imported only in that developer view. The three-dot menu is hidden on the results screen. During play it contains: Return to tee, Personal best routes, How to play and the chip-in range toggle (off after every refresh).

## Verification

`node tests/test_personal_daily.mjs` checks publication dates/future-preview access, independent records, unrounded comparisons, delayed reports, persistence, recent-nine retention, unlimited prefix retries and strokes, exact exports and once-per-hole stats. Existing band-free/one-stroke scoring, waypoint, tap, animation, log and typing-layout regression tests remain applicable. Desktop and 390px browser checks cover completing a hole, scoring, reload, archive navigation, reopening from the recent-nine card, personal routes, menu and help. Actual iPhone keyboard behaviour requires device testing; its existing handlers are unchanged.

## Custom holes

“Choose or create a hole” below the playing area contains the scheduled-hole picker and a three-word hole form. Direct-leg validation is retained. Custom holes are always Par 5 with unlimited play and no golden shortcuts. Definitions and independent personal bests persist in the same local daily history; repeated creation of the same three words reopens the existing record. They appear in the picker and recent-nine card as “Your hole”. Custom holes use the same live scorer as daily holes.

The current live scorer is `band-free-harmonic-v3-opportunity08-bonus2`: opportunity rate 0.08, one-stroke coefficient 2. Historical V6 comparison diagnostics retain their original calibration. Saved v2 vector reports with raw evidence are rescaled locally and personal cleverness bests are reranked; stroke records and routes are untouched.

### Starting a fresh export batch

Use **Export play data**, then **Reset play data**. Reset requires confirmation, clears personal bests, statistics and attempt history, and tees up the selected hole. Saved custom hole definitions and downloaded word files stay intact. A recovery copy is available through **Restore previous play data** while storage has room; recovery preserves any new play too. Normal exports contain only the current batch.

### Simplified course interface

The personal app has one `Word golf #…` heading, framed by previous/next carts. Its map control shows the current stroke count and opens How to play; the chip-range toggle is in that panel. A completed hole's personal-best routes remain available through `Your bests on this hole` while playing and the result card on completion.

The recent card includes only the nine most recently completed holes. It also shows up to three best holes, ranked by ingenuity or strokes, with expandable best routes. The result distribution filters recent finishes. `Ingenuity` is the display name for the existing live cleverness calculation; neither the stored scorer identity nor its formula changed.

Resets now use isolated storage batches. Existing data is read from the legacy keys until the first reset, then the app uses a fresh namespace. Stale tabs cannot write into that namespace, and even older releases writing legacy history cannot contaminate its exports. Tabs on the current release reload when another tab resets. A single previous batch remains recoverable.

Semantic profile downloads and local neighbourhood caches are prepared for known route words during play in the assessment worker. Complete-route scoring starts during the final shot animation. Partial routes are never assigned or saved a score. Final reports reuse exactly the same scorer and evidence.

The header is borderless and centred with the map. Its keyboard layout uses compact spacing. Per-hole scenery is deterministically varied and displayed with a subtle rotation; all shot rules and scoring coordinates are unchanged. Recovery copies and superseded reset batches may be released under browser storage pressure to prioritise saving current play.

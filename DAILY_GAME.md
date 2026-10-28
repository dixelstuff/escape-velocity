# Personal daily Word Golf

The default app is one daily waypoint hole, always Par 5, with an archive navigated by previous/next. New holes publish at 00:00 UTC; future dates are unavailable. There is no submission, league, score lock, practice distinction, scoring-attempt budget or stroke ceiling.

The existing distance/contact/waypoint rules, misses ending attempts, tap-to-retry behaviour, mobile keyboard handling and animations are retained. `continuous_play` permits long successful paths; the explicit `challenge.unlimited` marker survives engine construction, restoration and prefix retries. Automatic finishing strokes still count.

## Personal records

`word-golf.personal-daily.v1` stores selected date, visits and per-hole bests. Full attempts remain in the existing flight log, which is not reset or migrated destructively. Older course/Tour data is retained. New personal records are kept separately from those old competitions.

- Fewest strokes and highest cleverness are independent records with their own route and journey ID.
- Cleverness remains exactly `band-free-harmonic-v2-one-stroke`, including its existing one-stroke bonus. Comparison scores and historical analysis panels are absent from normal play.
- Compare cleverness using the unrounded score; round only for display. Delayed analysis cannot switch the active hole or overwrite a newer live journey.
- The recent-nine view contains distinct holes ordered by most recent visit/play. Returning to a hole updates that row. Older records are retained for lifetime stats.
- Count each completed hole once in the stroke-result distribution, using its best result. Unfinished holes have no score. Best-stroke improvements update the distribution. Average best cleverness excludes pending/unavailable analysis.
- Export play data includes the personal records and full device-local flight log. Unlimited-play exports record actual strokes, not a seven-stroke cap or invented default.

## Content and maintenance

`static/daily-manifest.mjs` fixes 106 distinct existing curated waypoint layouts, one per date from 20 October 2026 through 2 February 2027. All are Par 5 and curated golden shortcuts are disabled. Dates and IDs must remain immutable; append new curated holes before the queue ends. When a queue ends the most recent published puzzle remains playable, rather than repeating a hole under a new date.

Historical experimental UI and course modes are retained behind `?lab` (e.g. `?lab&mode=tour`) for development and old-data inspection. They have no normal-page links. Old analysis panels are imported only in that developer view. The three-dot menu is hidden on the results screen. During play it contains: Return to tee, Personal best routes, How to play and the chip-in range toggle (off after every refresh).

## Verification

`node tests/test_personal_daily.mjs` checks publication dates/future gating, independent records, unrounded comparisons, delayed reports, persistence, recent-nine retention, unlimited prefix retries and strokes, exact exports and once-per-hole stats. Existing band-free/one-stroke scoring, waypoint, tap, animation, log and typing-layout regression tests remain applicable. Desktop and 390px browser checks cover completing a hole, scoring, reload, archive navigation, reopening from the recent-nine card, personal routes, menu and help. Actual iPhone keyboard behaviour requires device testing; its existing handlers are unchanged.

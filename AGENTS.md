# Word Golf — development reference

Current context: 7 November 2026. Prefer the executable live paths below over historical reports or old mode names. Update this reference when a deliberate product decision changes; it is not a development diary.

## Product and architecture

- Standard Word Golf is a collection of numbered, three-word **Par 5 dogleg holes**, with unlimited strokes and attempts. Players explore and improve independently recorded fewest strokes and highest Cleverness. There are no standard-mode course submissions, attempt locks, golf-result score caps or leaderboards.
- Public players get the curated collection and a choose-hole selector. `?admin=1` adds the archive, custom-hole creation and experimental controls. Normal public/admin play shares persistence. Legacy modes behind admin `lab` parameters are not the current product.
- The deployed application is static: `static/index.html`, `static/app.js`, `static/style.css`. GitHub Pages publishes `static/` at <https://dixelstuff.github.io/escape-velocity/> through `.github/workflows/pages.yml`.
- **`static/engine.mjs` is the authoritative game engine**, including `Game` and the browser client. Python/offline research implementations are not the authority for live mechanics.
- `static/progressive-model.mjs` loads the existing GloVe vocabulary/vectors progressively from `static/model/`. Render the hole before word data finishes loading; fetch missing chunks and reuse caches. Keep gameplay and Cleverness standalone in the browser, without dictionary, LLM or scoring-server dependencies.

## Gameplay invariants

- The played word's connection to the **ball word** determines contact; its connection to the **target word** determines advancement. Longer shots require stronger contact. Useful small setup shots are intentional, not inherently inefficient mistakes.
- Initially target the dogleg. Any legal word landing within its shaded region can satisfy it; the literal dogleg word is optional. Then target the flag, anchoring the second leg to the **actual landing word**. Choosing a landing should affect onward possibilities.
- The flag word may be played as a first-leg setup, but cannot bypass the dogleg. Existing rules allow reuse across legs; preserve their distinction from same-leg repeat restrictions. Separate occurrences of a word need separate lie/label identities.
- Tapping an earlier landed word or tee selects a retry prefix. Selecting/changing that prefix is free; committing the next shot starts the new attempt. Returning to the current lie must not inflate attempts. A miss ends that attempt and resumes exploration from the last lie. Typing a previous word is not a special backward-shot mechanic.
- Focusing and leaving an empty input must preserve the route and previous labels. Returning to an existing dogleg lie must not replay its shot or announce a new dogleg arrival.
- Automatic completion adds a finishing stroke. Current engine constants are `DOGLEG_FINISH_RULE='strong-arrival-v1'`, arrival threshold **0.32**, and `SECOND_LEG_FINISH_SPAN=0.12`. The span adjustment applies only after a subsequent second-leg shot, not on dogleg arrival. Preserve the scoped deferred-finish/contact/direction rules rather than broadly relaxing them.
- First-leg rescue geometry is `fixed-destination-v1`: a word's semantic destination and dogleg inclusion must be consistent regardless of its preceding lie or contact outcome. Contact rescue must not move a word into/out of the dogleg.
- Preserve saved rule versions and activation boundaries when replaying older histories. Do not reinterpret old shots under new rules without an explicit migration design.
- `static/spelling-equivalence.mjs` gives curated UK/US variants a shared semantic representation, including endpoint words, while preserving entered spelling for display and preventing repeat exploits. Existing plural/word-family rescue is deliberately limited to boundary cases; do not replace it with universal stemming or broaden it casually.

## Live Cleverness

The final live identity is **`band-free-harmonic-v7-dogleg-continuation`**, defined in `static/cleverness-score-config.mjs`. The underlying relaxed-leg operator retains its v4 name. Entry points are `static/vector-cleverness/index.mjs`, `band-free.mjs`, `static/score-stretch.mjs` and the dogleg evidence modules.

- Entirely vector-based. Preserve semantic ingenuity **I**, strategic effectiveness **S**, route elegance **E**, legal skippability and strongest meaningful sequence selection. A useful setup or outstanding pivot can matter without every word being exceptional. No morphology penalty, golf-result bands or player-percentile interpretation.
- Opportunity factor: `1 / (1 + 0.08 * max(0, N - 1))`, using the existing opportunity count. Foundation: `H = 2IS/(I+S)` with the implementation's zero guard; `Q = clip(0.5 + 1.3*(H-0.5) + 0.4*(E-0.5), 0, 1)`.
- Actual leg factors: **1–2 strokes: 1.00; 3: 0.92; 4: 0.80; 5: 0.60; longer: `0.60 * 0.65**(strokes-5)`**. Multiply the two factors to obtain `L`; respect authoritative automatic-stroke counts.
- Base raw score: `min(100 * Q**(2/3) * L + bonus, 100 * L)`. One-stroke bonus is **`2 * Q * L` once per route** if either actual leg took one stroke, never twice for 1+1. Use unrounded values through final calculation.
- The final monotone cubic stretch has anchors 0/70/100 and slope 2 at 70. Transform the ceiling consistently; use the existing operator rather than an approximate linear stretch.
- The live pipeline also includes bounded dogleg strategic-access credit and continuation correction. Counterfactuals replay the observed route with the authoritative engine, not a search for all alternatives. Merely replacing a landing with a later word is not proof of redundancy: check actual strokes saved and whether the finish remains possible. Avoid stacking relevance, geometry and elegance deductions for the same removable landing.
- Exact adjustment definitions and controls: `reports/dogleg-strategy-bonus/README.md` and `reports/dogleg-continuation/README.md`. The latter supersedes the earlier report's live-version label. Keep UI, saved summaries, comparisons and exports on the same final scorer/version; insufficient old evidence requires reanalysis, not relabelling.
- Never tune scoring to guarantee a particular golf-result distribution. A clever par can outscore an ordinary birdie. Preserve skippability based on legal shots, not word resemblance.

## Hole selection and generation

Read the **newest guidance at the top of `LEVEL_DESIGN.md`**. It supersedes older heavy search/audit instructions further down that file.

- Aim for **easy to start, interesting to explore, challenging to perfect**. Use lightweight editorial selection, not predetermined clever routes or exhaustive solution optimisation.
- Prefer familiar, clear, evocative words with natural associations. Mix vivid objects, actions and specific qualities. Multiple meanings are welcome, not mandatory in every slot; one versatile anchor with grounded companions can work well.
- Latest play feedback: hard/clever transitions were welcome and the last ten were not too tight. Gently favour slightly narrower everyday words, especially dogleg and flag, while preserving several natural associations and the same very light checks. Keep scoring concerns separate from generation.
- Judge the combination, not just three individually interesting words. Offer several intuitive opening directions and interesting onward choices from actual dogleg landings. Reject restrictive openings and inexplicable vector-only jumps.
- Avoid repetitive vocabulary, narrow category shortcuts, obvious words solving both legs, and forced quirkiness/obscurity. These are preferences, not bans on animals, foods, nouns or abstract words. Freshness relative to the recent public collection matters more than never reusing an archive word.
- Keep exploration very light: one editorial selection pass, local vocabulary/blocked-word/duplicate/direct-leg checks and six independently nominated familiar openings per tee. `scripts/check_rich_openings.mjs` supports the opening checks. Replace clear problems; do not routinely probe continuations, search routes, simulate play or analyse Cleverness. Small successful setup shots count; a numerical check is not proof of enjoyable human play. Vary all three word positions rather than repeating concrete tees with broad abstract doglegs; player feedback guides later batches.
- Do not optimise for high Cleverness, target eagle/birdie proportions, minimal journeys or maximal semantic distance. The player deliberately keeps exploring; many journeys or a final birdie do not establish frustration or ease. Use actual feedback to revise selection.
- New batches normally appear first in both public and admin order while retaining previous enjoyable holes, unless explicitly asked to replace/remove them. `static/public-manifest.mjs` is the curated view, `static/daily-manifest.mjs` the archive and `static/admin-hole-order.mjs` the admin ordering.

## Identity, persistence and exports

- **A hole ID is permanent identity, not its displayed number. Never reuse an existing ID for a different triple.** Reordering can change numbers without losing progress. Give replacements new IDs and preserve prior archive records unless explicitly authorised otherwise.
- Durable bests, retained route geometry and play records use IndexedDB through `static/play-archive.mjs`; batch metadata remains in localStorage. Related modules: `personal-play-storage.mjs`, `play-record-merge.mjs`, `daily-game.mjs`, `flight-log.mjs`, `reset-personal-play.mjs`.
- Preserve atomic writes, cross-tab merge/batch protections and fallback migration guarantees. An older snapshot must not overwrite better scores or newer journeys. Do not split public/admin storage again or introduce large duplicate localStorage backups.
- Exportable research history and durable player statistics serve different purposes. Clearing play history starts a fresh export batch **while retaining personal bests, result routes, stats and custom definitions**. Old batches must not leak into later exports. Export omission of durable best summaries does not mean local results are absent.
- Fewest-strokes route ties use highest Cleverness within that stroke count. Highest Cleverness is also retained separately. Show an additional route only when it adds genuinely different information, not the same route twice.
- **Never reset or mutate the user's real browser storage to test a feature.** Use isolated browser profiles, test stores or copied fixtures. Treat reported missing progress as a data-integrity bug, not automatically as a second-tab issue.

## Vocabulary policy

- `static/playable-vocabulary.mjs` is the fresh-input boundary; see `PLAYABLE_VOCABULARY.md`. Currently blocked exact words: YES, YEAH, BUT, ACTUALLY, INDEED, REALLY, HOWEVER, PERHAPS, VERY, ALSO, MAYBE, SOMEONE, USE, USED, USES, USING, LIKE, SAME, THING, THINGS.
- **STUFF stays allowed.** Do not infer extra derivatives or semantic-neighbour bans. Reject with **“Word not allowed. Try another.”** before fetching packs or mutating play state.
- Keep raw vectors and historical engine replay intact so old routes containing subsequently blocked words remain reproducible. Fresh-input policy and archived replay tests are deliberately separate.

## Interface safeguards

- Keep the calm golf aesthetic and concise feedback. Standard UI uses the Word golf # header with cart navigation; trophy opens recorded results; How to play is a page modal. Do not reintroduce removed stroke menus, verbose diagnostics or attempt-limit messaging into normal play.
- Preserve reliable result reopening and in-progress retry state. The trophy reviews results; tapping the map from results returns to play. Best-route labels must survive history clearing. Chip-in-range code remains available internally but has no normal player toggle and must not turn itself on after a miss/refresh.
- Mobile input/keyboard/scroll behaviour is especially regression-prone on iPhone Chrome. Keep active/inactive map size, header margins and input positioning stable. Preserve the distinction between navigation/results returning to page top and within-hole transitions anchoring at the hole header. Desktop input/shots must not move the viewport. Test focus, blur, retry selection, hole changes and result transitions together when touching this code.
- Keep word labels upright despite map rotation, consistent between replay states, and individually keyed across legs. Natural scene variation is welcome; stripes belong only on fairway, and scenery/controls must not interfere with labels or play.

## Optional experiments and development workflow

- The **semantic bunker prototype is implemented but opt-in/admin-only**, not automatic level generation. It labels an existing bunker and catches only otherwise successful shots. Configurations support exact-only or adjustable similarity; saved first-leg-only and current both-leg versions must replay correctly. Keep prototype IDs separate from ordinary hole progress. See `reports/semantic-bunker/README.md`.
- Solution landscapes, simulations, WordNet/grammar/LLM investigations and older scoring proposals are research, not live requirements. Do not import targeted lexical evidence or reinstate experimental penalties merely because a report exists.
- Run relevant Node regression tests; `.github/workflows/pages.yml` lists deployment checks. Key areas include scoring, dogleg continuation/finish/geometry, spelling/input policy, persistence/reset, public ordering and mobile UI. For documentation-only changes, inspect references and diffs rather than running expensive research searches.
- A simple preview is `python3 -m http.server 8767 --directory static` (use a free port if already running). Module imports use explicit `?v=` cache tokens: invalidate affected entry/worker import graphs when changing browser modules; do not rename scorer identities merely for asset caching.
- Preserve unrelated working-tree changes and research files. Stage only intended files; never sweep the repository into a commit or reset unrelated work. Do not alter gameplay, thresholds, scoring or saved identities as incidental cleanup.

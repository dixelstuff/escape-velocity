# WORD GOLF ⛳

A browser word-golf game using actual Stanford GloVe 6B 300-dimensional vectors. Connect your next word to the ball word and aim closer to the hole. Reach the putting green for an automatic one-shot finish, or play the target word to hole out directly. Every supported guess counts as one shot, including misses and water balls; unknown words and your current lie cost nothing. Originally prototyped as Escape Velocity; the existing Pages URL and saved scorecards are preserved.

## Play online

[Play Word Golf on GitHub Pages](https://dixelstuff.github.io/escape-velocity/). The public version calculates cosine similarities entirely in your browser. It downloads about 13.8 MB of gzip-compressed half-precision vectors for 24,995 words. Hashed filenames, integrity checking and Cache Storage reuse the model after a successful first load; HTTP caching remains a fallback when persistent storage is unavailable. No account, API key, or running Python server is needed. The original 822 MiB GloVe archive is never sent to players.

## Run

Python 3.11+ recommended. From the repository directory:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/prepare.py
python scripts/expand_vocabulary.py
python scripts/analyze_forward.py
python scripts/build_pages.py
python scripts/browser_fixtures.py
python server.py
```

Open **http://localhost:8000**. If this workspace has already been prepared, just run `.venv/bin/python server.py`. Use `--port 8001` if necessary. The server binds to localhost. No API keys, cloud model, Node build, or GPU are required.

First preparation downloads the official 822 MiB GloVe archive and the roughly 10 MiB WordNet corpus. Allow about 1.5 GiB of free disk space including Python packages and intermediate graph calculations. Preparation streams `glove.6B.300d.txt` directly from the archive rather than writing an additional ~1 GiB text copy. The original archive is retained for offline use. Generated data and the virtual environment are ignored by Git; repeat preparation on another machine.

## Play

Choose a hole, enter a word, and press **Hit shot** or Enter. **Make your own hole** previews angular word separation and a provisional difficulty estimate, using playable openings and a limited two-step search in a background worker. It rejects pairs where directly typing the target can score a hole in one. One-shot bridges through another word remain allowed. Difficulty estimates are structural, not human-calibrated guarantees. The literal hole word is a normal, scored shot: too weak a connection misses; a strong enough connection finishes. Entering the green with another word automatically adds one finishing shot. All strokes count as shots; a direct target hit needs no extra finish.

The current ball is a shaded, dimpled SVG golf ball on a mown fairway. Previous lies are small markers, and compact measured labels sit close to their markers, with leader lines and collision avoidance. A pond shows the destination of out-of-bounds backward shots. Misses leave the ball still; water shots animate into the pond, splash, and return to the same lie. A dismissible completion card below the map shows the played route and brings the course into view without covering any word lies. Semantic horizontal position stays fixed; height is only for readability. Resizing never changes scoring.

Default green similarity is **0.27**. Base contact requirements range from **0.10 to 0.22**, with the existing hub surcharge for broad-word travel. Trip fraction is the absolute change in target similarity, clipping both positions at the green edge, divided by the original tee-to-green gap and capped at 1. Base required contact is `0.10 + 0.12 * trip_fraction`. Finishing gets easier as you approach, without extra cost for landing deeper inside the green. All comparisons include `1e-7` tolerance.

A consistent small retreat of `0.01` is allowed. The lower safe boundary is anchored to the **best target similarity reached**, not the latest lie, so repeated tiny retreats cannot produce unlimited backward drift. A sufficiently connected shot back to any previously reached word bypasses water and resets this boundary to the revisited lie, enabling a new branch. Failed proposals do not qualify as previous lies. Outcomes are:

- **Miss:** contact below the required strength; ball stays still.
- **Water:** enough contact, but destination below the safe boundary; ball splashes into the pond and returns.
- **Recovery:** enough contact and within the safe boundary, but slightly behind the current lie; ball lands there.
- **Landed:** enough contact and safe forward or level movement.
- **Backtrack:** connected return to a previously reached word, without water.
- **Green:** safe successful shot at or beyond the green threshold; automatically finishes in one extra shot unless the word is the target itself.

Each supported guess counts as exactly one shot. Water adds no extra penalty. New states keep user shots in `history`, automatic finishes in `automatic_shots`, and their combined count in `attempts`. Scorecard entries include both user shots and the automatic finish. Scorecards retain every supported shot and every unscored rejected word. Normal play uses plain golf feedback; exact similarities, including negative target similarities, remain available in **Course settings** and exported scorecards.

New holes use `golf-distance-v3`, or `golf-fixed-v3` in fixed mode; exact threshold and launch settings are saved with each round. Existing fixed/distance rule versions remain supported for exact historical replay. On first load of this release, older active rounds are archived unchanged and the same endpoints tee off with the golf rules. All earlier scorecards remain selectable. The unchanged `escape-velocity.flight-log.v1` storage key preserves prior playtests; JSON exports retain their original field names for compatibility.

COFFEE → SCIENCE opens the course. On mobile, 16px inputs avoid focus zoom, and a compact map-and-input view follows `visualViewport` above the keyboard. Hitting a shot dismisses the keyboard. Pinch zoom and reduced-motion preferences remain supported. Real iOS/Android keyboards still need device playtesting.

## Data and vocabulary

- [Stanford GloVe](https://nlp.stanford.edu/projects/glove/): Wikipedia 2014 + Gigaword 5, 6B tokens, 400,000 uncased entries. We use the original **300d** model, not newer 2024 models. Pretrained data is offered under the [PDDL](https://opendatacommons.org/licenses/pddl/1-0/).
- [wordfreq 3.1.1](https://github.com/rspeer/wordfreq): English frequency rank and Zipf scores, combining multiple text sources. Code is Apache 2.0; included frequency data is CC BY-SA 4.0, as described upstream. It ranks candidates rather than contributing similarity scores.
- [Princeton WordNet](https://wordnet.princeton.edu/), downloaded from the [NLTK data mirror](https://github.com/nltk/nltk_data): lowercase single-word dictionary lemmas help filter punctuation, phrases, names, and inflections. See the `wordnet/LICENSE` member of the retained archive for terms.

`prepare.py` intersects the top 150,000 English frequency tokens with lowercase WordNet lemmas of 3–18 ASCII letters, requires a Zipf score of at least 2.5, removes an explicit common-name/unsuitable-token list, and removes simple regular plurals and participles only if a more frequent base is available. It then keeps up to 20,000 candidates and drops entries absent from GloVe. This is a reproducible heuristic, not a perfect dictionary or content filter; editorial review remains useful before public release. `expand_vocabulary.py` appends common dictionary forms and inflections with their own real GloVe vectors, including ordinary words rejected in playtests. The original 19,989 vector rows stay unchanged and in the same order. The actual retained count and sources are in `data/metadata.json`.

Every retained 300d vector is normalized to unit length and stored as float32 in a NumPy array. Python tools memory-map it for offline experiments. `scripts/build_pages.py` exports little-endian float16 data, with an explicit gzip download and uncompressed fallback for older browsers. No dimensions are removed. The browser decodes to float32 for computation. All 902 shots in the supplied historical scorecards retained the same outcomes in half-precision regression (maximum measured cosine difference 0.000106). Exact original float32 rows remain available on demand for legacy restoration. Current rules and numerical outcomes are checked in both Python and JavaScript, including the compressed model.

The vector-quality experiment is offline, not a player skill rating:

```sh
OPENBLAS_NUM_THREADS=1 .venv/bin/python scripts/analyze_quality.py /path/to/scorecards.json --output /tmp/vector-analysis.json
```

It compares each historical choice with playable alternatives on contact/progress trade-offs, respects direct chip-in finishing costs, and counts green connections opened by setup shots. It uses the historical vocabulary and settings. A lack of dominated alternatives does not establish human skill, and one-step opportunities do not provide a universal route rating. No arbitrary /1000 score is displayed.

## Experiments and verification

```sh
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python scripts/analyze.py --samples 120 --thresholds 0.4 0.45 0.5 0.55
.venv/bin/python scripts/analyze_distance.py
```

The original analysis tool builds exact all-vocabulary threshold graphs in memory-bounded matrix batches. Breadth-first search permits backward movement but respects each puzzle's start boundary, and stops at an arrival-zone planet. It counts submitted words, excluding the free final hop. Seed 42 makes the random endpoint sample reproducible. The output includes one-, two-, three-, four-, five-plus-attempt and unreachable categories, graph connectivity, and optimal routes for offline inspection.

See [reports/distance-calibration.md](reports/distance-calibration.md) for the earlier distance experiment, exact requirements, and verified routes; the original fixed-threshold analysis remains in [reports/calibration.md](reports/calibration.md). **Both reports contain spoilers.** Machine-readable outputs are `reports/distance-analysis.json` and `reports/analysis.json`. That historical analysis uses a candidate graph at cosine 0.25 and checks each edge against the target-dependent requirement and starting boundary during BFS. The original 128 endpoint pairs are reused for comparison. Those earlier settings yielded 97 two-attempt, 24 three-attempt, six four-attempt, and one unreachable pair, with no single-attempt solutions in this sample. These are mathematical optima, not human playtest statistics.

The current menu is stored in `data/puzzles.json`. Historical analysis scripts describe earlier rules; `analyze.py` overwrites the menu if run, so restore the current tracked puzzle file before publishing. `analyze_forward.py` verifies examples of successful forward routes under the golf rules; it does not claim optimality for routes involving recovery shots.

To evaluate a specific route without the UI (last word is the target; intermediate words are submissions):

```sh
.venv/bin/python scripts/analyze.py --mode distance --threshold 0.45 --route coffee food medical science
```

Current menu routes are verified with `.venv/bin/python scripts/analyze_forward.py`; results are in `reports/forward-analysis.json` (spoilers). Earlier calibration reports describe historical settings.

Tests cover normalization, cosine symmetry, meaningful real-vector comparisons, misses, water shots, recovery tolerance, cumulative-drift prevention, historical backward travel, retry scoring, current-word/unknown rejection, legacy rule restoration, variable launch requirements, inclusive thresholds, attempt counting, automatic victory, and every selected hole's verified route.

## Files and prototype limits

- `engine.py`: semantic scoring and game rules.
- `server.py`: static files and `/api/config`, `/api/new`, `/api/submit`; independent in-memory browser sessions.
- `static/`: responsive plain HTML/CSS/JavaScript, browser scoring, curated vectors, SVG fairway, ball and water animations, reduced-motion support, and debug controls.
- `scripts/prepare.py`: download and normalize real embeddings.
- `scripts/analyze.py`: original fixed-threshold graph search and calibration.
- `scripts/analyze_distance.py`: historical target-dependent graph search.

Rounds and every submission are saved in local storage; reloads resume the active hole. Switching holes or restarting archives previous rounds. Copy a scorecard as readable text or download all as JSON, including raw cosines, requirements, outcomes, timestamps and exact rule versions. If browser storage fails, a visible message asks you to download before leaving. Browser data stays on the same device; clearing site data removes it. Earlier plays before logging was added cannot be recovered. The config revalidates on load while unchanged model data uses browser caching. Python API sessions reset with the server. The interface uses system-font fallbacks if optional Google Fonts cannot load.

## GitHub Pages publishing

`.github/workflows/pages.yml` tests browser scoring and deploys only `static/` whenever `main` changes. The repository must have Pages enabled with GitHub Actions as its publishing source. All asset URLs are relative, so the game works under `/escape-velocity/`.

After changing embeddings or puzzle selection, rebuild the browser data and parity fixtures before committing:

```sh
.venv/bin/python scripts/build_pages.py
.venv/bin/python scripts/browser_fixtures.py
node tests/test_browser.mjs
node tests/test_log.mjs
node tests/test_map.mjs
node tests/test_startup.mjs
node tests/test_course.mjs
```

To preview the standalone public version locally without the Python API:

```sh
python3 -m http.server 8001 --bind 127.0.0.1 --directory static
```

The original Python API remains available for experiments. The UI uses the browser engine on both local and published sites. No word submissions leave the browser.

## Compact play and fresh scorecard batches (course v12)

The main play view uses a single input placeholder and HIT SHOT button. Completion appears once below the course; the duplicate result panel, finished input controls, opening-hole shortcut and tee/flag caption are removed. The separate input label remains available to screen readers.

Reset scorecards asks once in the page, then restarts the active hole and begins a new export batch containing only new rounds. The prior batch is saved under a separate local backup key and is excluded from normal downloads. Restore previous scorecards merges it back without discarding play since the reset. Recovery is available until the next reset; download any permanent backup before resetting. Storage failures abort the reset and preserve the current scorecards. The model cache and course settings are retained.

Scoring and the 300-dimensional model are unchanged in this UI release. The new playtest batch's 96 typed shots reproduced exactly with the published half-precision data, and full precision produced the same outcomes; the maximum observed cosine difference was about 0.000141. No difficulty adjustment is made from this small, repeated-hole sample.

## Course feedback and bridge inspection (course v13)

Miss and water messages sit below the SVG drawing and can be dismissed. A completed hole shows its word route beneath the map, including the automatic finish when present; the × button hides this card and Show result restores it. The visual route includes the automatic finishing link as well as user shot links. Resizing does not reopen dismissed feedback or change any shot outcome.

Opening bridges (spoilers), below the play controls, lists every counted one-shot green bridge for the active tee, target and settings. The custom-hole preview has a matching collapsed list. Each row shows the tee → bridge → target route, actual tee contact, required contact, target similarity and green threshold. A literal target finish is labelled as a direct hole in one rather than an automatic finish. Lists are ordered by tee contact strength and include all model results, even surprising generic words; no hand-picked substitutes or artificial similarity bonuses are applied. Custom lists render only after the player opens them. Calculations run in the existing worker and recent assessments are reused in memory.

Bridge list tests exhaustively compare all supported words against real Game submissions for distance mode, fixed mode and a direct-target case. The model, course settings and stored scoring rules are unchanged.

## Wider, quieter course (course v14)

The header and decorative fairway, green, water and direction captions are removed. The course uses the freed space for a taller fairway, a little more separation between shot lanes, and two blue tee markers spaced around the starting ball. Title spacing is tighter and Course settings stays open. Labels avoid the tee markers as well as balls, the flag and water.

The latest fresh scorecard batch contains 25 typed shots across nine played rounds (six completed). All outcomes reproduce with the deployed model; full precision yields the same outcomes, with maximum cosine difference below 0.000057. MORPH → EVOLVE → GENERATION → LINEAGE takes three shots; MORPH → EVOLVED reaches the green and finishes automatically in two. EVOLVE and EVOLVED use their own source vectors, without a tense bonus. Scoring, model assets and stored scorecards are unchanged in this layout release.

Course v15 spaces the tee markers 50% farther apart again, reduces their radius from 7 to 4.5 course units and uses muted sage grey. The tee word gets first choice of label space so it sits beneath the ball and above the lower marker. Scoring is unchanged.

## Experimental vector skill (course v16)

Completed current-rule rounds show a skill score out of 1000, with a collapsed per-shot breakdown under Scorecards. Completed historical rounds using those rules are assessed when selected. Results run in the assessment worker, are cached with a model fingerprint and history key, and are included in JSON downloads and copied scorecards. Reset and recovery retain their existing batch behavior. Automatic finishes and unscored submissions are excluded. Gameplay, vectors and difficulty are unchanged.

The score measures the quality of decisions available at each actual lie, not a stroke-count benchmark or player percentile. Every onward opportunity scan considers the full vocabulary under the real contact, water and backtracking rules. Nonterminal lie value is normalized tee-to-green position plus 0.75 times the average of the eight strongest legal forward gains (zero-padded), weighted by contact surplus capped at twice the shot requirement. A terminal lie has value 1. This rewards both strong future options and breadth, with diminishing returns. A return to a previous lie resets the water boundary in the hypothetical scan just as it does in the game.

Choice regret compares the intended landing's value with a bounded shortlist: 12 progress leaders, eight strength-weighted progress leaders, the strongest contact in eight progress bands, and reachable previous lies. Each shortlisted landing is evaluated one shot ahead across all words. The chosen landing is always included in the benchmark. This is an estimate, not an exhaustive two-step optimization or a shortest-path proof; deeper setups and obscure model associations remain limitations.

Per-shot loss is relative contact shortfall + relative water-boundary shortfall + choice regret + half any actual setup-value decline + 0.05 for a repeated lie that does not improve value. Contact deficit is divided by required contact; water deficit by the original tee-to-green cosine gap (minimum 0.01); each loss component is clamped to [0,1]. Backtracks incur no water deficit. A miss grades the intended choice but leaves actual setup unchanged. Overall skill is round(1000 × exp(−sum of shot losses)). No averaging allows padding a round with extra shots to improve its score. Weights and the absolute scale are provisional and versioned as vector-skill-v1.

Verification covers controlled near/big misses, beneficial/harmful backtracks, repeated-loop resistance, automatic-finish exclusion, deterministic replay and caches, persistence and sharing, and real-engine exhaustive onward-count checks. The real MORPH → EVOLVE → GENERATION → LINEAGE route scores 756; MORPH → EVOLVED → automatic finish scores 1000. This expresses model-relative choice efficiency and is not a claim that one short round establishes perfect human skill. All 25 typed shots in the latest playtest batch were analysed without changing their game outcomes.

Course v17 grounds the tee illustration: the white ball is lifted 16 course units so its bottom aligns with the dotted guide and its shadow stays around the middle of the tee markers. Launch and return animations use the same raised position. The tee word stays above the lower marker with a slightly larger shadow-to-label gap; other active-ball labels also clear the shadow. Tee markers use the pale outer-green colour. These are display changes only.

Course v18 lifts the occupied tee label another four course units. Once the ball leaves, the tee uses the same six-unit word-marker radius and five-unit label gap as other unoccupied lies; returning the ball restores the occupied spacing.

## Opening bridge feedback (course v19)

Opening bridge rows in both the active hole and custom preview have a one-click Flag poor bridge toggle. The flag saves the tee, target, proposed word, exact settings/rules, model fingerprint, baseline, opening-bridge count, source, timestamp and raw strengths. Optional notes can be saved with the button or Enter; flagging a preview does not start the hole. Flags can be undone beside the word or in Scorecards → Bridge feedback. The bridge list preserves its scroll position when flags change.

JSON downloads include bridgeFeedback plus a bridge_comparison dataset containing flagged poor bridges and actual first-shot greens. Reaching the green with the first manual swing qualifies even though the automatic finish makes the golf score two; direct finishes qualify too. Later successful tee shots after earlier charged attempts do not qualify. Played samples are observations, not implicit endorsements. Contact surplus is contact minus required shot strength; green surplus is target similarity minus the green threshold; bottleneck surplus is the smaller of the two. Exact settings and model identifiers permit matched comparisons of an opening contact cutoff, green cutoff or combined rule, without changing play now.

Opening-list exposure is recorded only when the spoiler list is shown. Exports distinguish earlier spoiler exposure, no earlier view recorded in the exported batch, and unknown exposure in older rounds. Absence of a recorded view is not proof of unaided play: prior batches, other devices and outside knowledge are not observed. Preview exposure carries forward to the same tee/target played later in the batch, even if settings or the model change. Viewing spoilers after a shot does not retroactively mark it as assisted. No word data or flags leave the device until the user shares an export.

Flags and notes persist locally, appear in copied scorecards, and follow the existing reset/recovery flow: reset starts an empty batch, the prior flags are in the recovery backup, and restore merges both batches while retaining newer notes for duplicate flags. Storage failure leaves flags available in memory for download and shows the existing save warning. Flagging does not alter outcomes, skill ratings or thresholds. New tests cover exact metrics, previews, notes, duplicate flags, undo, model/settings separation, spoiler chronology, first-shot classification, reset/recovery and storage failures.

## Skill recalibration and player feedback (course v20)

Skill v2 replaces exponential compounding with `round(1000 / (1 + total_regret))`. Each swing's main regret is the largest of its contact deficit, water/direction deficit, choice gap and actual setup decline, rather than their sum. The existing 0.05 cost for revisiting an unchanged/worse lie is added separately. Related consequences of a single mistake are therefore not charged multiple times. There is no score floor, score padding or stroke-count-only benchmark; more unhelpful decisions continue to lower the score, while good decisions can retain high scores on longer routes.

A nonterminal lie's opportunity value is normalized green progress plus 0.75 times a blend of its best legal onward gain (80%) and the zero-padded mean of its best eight onward gains (20%). Contact requirements still determine which moves are legal, but contact surplus no longer discounts a deterministic legal future shot. One excellent finishing opportunity now earns meaningful setup credit; breadth remains secondary. The bounded comparison shortlist and one-shot horizon remain estimates. Scoring rules, vector model and green/launch thresholds are unchanged.

The reported SCOLD → MIME sequence EMOTION, COMMUNICATE, EXPRESS, EXPRESSIVE reproduces five counted shots and now rates 396/1000 (previously 34). COMMUNICATE's Choice is 74/100 and EXPRESS's is 35/100; EXPRESS remains a water hit under the actual vectors. In controlled retries on the same hole, adding misses to make 20 and 30 counted shots rates 84 and 55 respectively. These are synthetic stress cases, not claims about the user's historical long rounds. All 25 completed rounds in the supplied exports using current rules were compared: strong two-shot rounds remain around 895–1000, and the 10–11-shot rounds rate 142–195. Older 20–35-shot exports use earlier rules and were not presented as directly comparable current-rule rounds.

Too harsh / Too generous controls appear with the completed result and in Scorecards. Tap again to clear, change sides to change the rating, and optionally save a note. Feedback records the exact assessment snapshot, score, skill version, model fingerprint and history key alongside timestamps. Recalculation under a future version preserves the earlier feedback rather than silently attaching it to the new score. It is included in JSON downloads and copied scorecards, with normal local persistence, storage warnings, reset and recovery. No feedback changes the score automatically.

Cached v1 assessments are invalidated by vector-skill-v2 and recalculated when their completed round is displayed. Tests cover the SCOLD reproduction, one-charge-per-shot policy, strong setup credit, controlled long retries, no floor, loop resistance, feedback persistence/changes/clearing, version snapshots, exports and reset/recovery.

## Modest hub adjustment (course v21)

New rounds use `golf-distance-v3` / `golf-fixed-v3`. A word's breadth is its number of other vocabulary words with published-model cosine at least 0.21. Its vocabulary percentile maps smoothly from zero at the 90th percentile to one at the top, quantized to one byte. `scripts/build_hubs.py` computes this offline; `build_pages.py` regenerates it automatically when vector/vocabulary fingerprints change. The hashed, integrity-checked payload is 24,995 bytes. Embeddings and ordinary launch/green defaults are unchanged.

The additional contact requirement is `0.035 * max(hub(current), hub(proposal)) * forward_fraction²`. Forward fraction is positive progress towards the green, capped there and divided by the original tee-to-green gap, capped at one. Lateral/backward shots have no surcharge. Either endpoint can trigger it, so stepping onto a hub does not enable a free long onward shot. Fixed mode retains its base threshold and adds the same modest surcharge. Shot exports include `hub_surcharge`. Gameplay, custom-hole validation, bridge listings, the limited route search and skill counterfactuals share the adjusted requirements. Earlier v2 rounds retain their original scoring and half-precision model; older legacy rounds retain their original full-precision restoration. Active earlier rounds are archived before a fresh tee-off, without losing scorecards or feedback. Skill v2's formula is unchanged and assesses each round under its own rules.

Typing the literal hole word remains allowed. Chip-in eligibility depends on current target similarity, original tee-to-green gap, shot settings and the stronger hub score of current/hole words. It does not depend on shots taken, misses or route length. Before the hub adjustment there was a single chip-in boundary per puzzle; now there is a narrow word-dependent band. With default settings, COFFEE → SCIENCE's boundary spans roughly 43.5–46.7% of the tee-to-green distance, and MOON → KITCHEN's spans 49.1–51.4%. These percentages refer to reaching the green edge, not the flag centre. Vertical map placement is decorative and does not alter eligibility. No chip-in guide line is drawn.

Tests include known weak hub openings, preserved real opening greens, historical replay, exact bridge and skill requirement parity, squared distance scaling, no extra lateral/backward penalty, and identical chip-in outcomes after one, two or three moves or repeated misses. The static menu remains available; this release changes shot requirements rather than replacing its endpoints. Any later hub calibration must receive a new rule version so saved rounds remain reproducible.

## Custom endpoint advice and saved course library (course v22)

Each custom-hole input now shows an advisory warning independently, as soon as a supported broad word is entered—even while the other field is blank. The same hub score used for shots labels nonzero top-decile words Broad and the upper half of that range Very broad (approximately the broadest 5%). Advice names the tee/hole word, explains that long forward shots need stronger connections and suggests a more specific endpoint. It does not reject the word or modify scoring. Blank, unsupported and ordinary replacement words clear their warning; stale asynchronous previews cannot show warnings for previous input. Existing gameplay, thresholds, rules and active rounds are unchanged.

The dropdown retains its eight existing holes and adds 64 distinct completed holes from the shared scorecards, giving 72. Import screening excludes top-decile hub endpoints, rounds longer than seven counted shots and rounds where more than half the manual attempts failed. This is an explicit editorial heuristic, not a new skill rating; older harsh skill scores do not disqualify short successful play. New additions must reject a direct hole in one and have a verified current-rule forward route. Earlier rounds from easier settings may qualify if the endpoints remain playable at current defaults. Only endpoints and standard settings are published, not personal scorecards or feedback.

For each future supplied batch, run `.venv/bin/python scripts/import_scorecard_holes.py /path/to/scorecards.json`, then rebuild Pages, verified menu routes and browser fixtures. Import appends eligible pairs, keeps existing entries, and skips duplicates; rerunning the shared batches adds zero further holes. Existing menu entries are retained even if their endpoints now attract a warning. The importer is a local maintenance command; scorecards remain on the player's device until explicitly shared.

Course labels are also shot shortcuts: clicking/tapping any visible word copies it into Play your next word without taking a shot. Enter/Space activate focused labels too. The hole word and prior lies use the same interaction, so the existing direct-finish and backtracking rules remain unchanged. Touch selection leaves the keyboard closed; desktop selection focuses the field without scrolling. Labels are unavailable during animation or after completion.

## Route-first completion and percentage skill (course v23)

The completion card leads with the successful word chain, including backtracking and any automatic finish, with the full counted-shot result underneath. Misses and water remain in total shots, logs and skill calculations. Overall skill in the completion card and Scorecards is displayed as a rounded percentage (381/1000 becomes 38%), without an Experimental badge. Shot quality, contact and choice in the breakdown use percentages too. The detailed method retains its explanation of the model's limitations. Stored scores, feedback snapshots, exports and skill/rule versions retain their original numerical representation; this is a presentation change only.

## Directional specificity in skill (course v24)

Skill v3 adds a small, directional specificity cost to successful long forward shots. Let `f` be the shot's positive change in target cosine, clipping positions at the green edge, divided by the original tee-to-green gap and clamped to [0,1]. Let `H` be the existing quantized top-decile hub score. Added regret is `0.10 * clamp((f - 0.5) / 0.5, 0, 1)^2 * max(0, H(destination) - H(origin))`. Travel up to half the original gap is exempt. Lateral/backward movement, equal/narrower destinations, misses, water, the literal hole word and automatic finishes receive no specificity cost. The strongest full-distance broadening adds 0.10 regret, taking an otherwise perfect single-decision round to 909/1000 (displayed as 91%). Repeated qualifying moves accumulate normally; this is not a score floor or a cap on an entire round.

Specificity is an independent addition to the existing largest-per-shot mistake and loop costs. Comparison alternatives use their potential value minus the same immediate specificity cost, preventing a generic green shortcut from being a cost-free benchmark against a precise approach. Onward opportunity scans, stroke rules, green/contact settings and the model are unchanged. Narrow words receive no separate bonus. The top-decile measure detects extreme breadth rather than subtle specificity differences across all words.

The per-shot breakdown explains any specificity deduction; JSON assessments include forward fraction, origin/destination hub scores and specificity loss. Alternative rows retain raw setup value, specificity loss and adjusted comparison value. The tiny new calculation reuses stored hub scores and target similarities; it adds no vector search or model payload. Cached v2 reports are recalculated when viewed, while earlier feedback retains its full v2 assessment snapshot and does not silently attach to a new v3 rating. Existing game histories remain unchanged.

Controlled tests verify a two-shot precise approach/chip-in at 1000 versus a two-shot broad green/automatic finish at 909, free setup moves, smooth distance weighting, directionality, finishing-word exemption, unsuccessful-shot exemption, unchanged game state and preserved v2 feedback. Actual scorecard comparisons are run locally rather than publishing player logs.

## Post-hole route shortcuts (course v25)

Completed current-course rounds annotate individually removable intermediate words with `*` in the successful chain. The explanation appears on the completion card and in the selected Scorecard, where See shortcuts lists the direct replacement links. When no single omission works, the review says so. The tee and final hole word are never marked. Multiple marks are independent checks; removing all marked steps together may not work.

For every candidate omission, `route-review.mjs` starts from the same tee and settings and replays the entire remaining successful chain through the real Game engine. This respects hub-adjusted launch strength, the best-progress water boundary, earlier visited words/backtracking and automatic green finishes. It checks the literal hole word normally if omitting the last green bridge would require a chip-in. The candidate must finish with exactly the remaining route; an earlier finish, failed later move or changed revisit history does not qualify. Repeated words are identified by route occurrence rather than by spelling. The original round is also replayed to verify its saved outcomes and route first.

Misses remain in the actual scorecard and stroke/skill calculations. The review removes them only from the successful chain it checks, because they did not change the lie. Route feedback does not alter strokes, skill or saved play. It is not an optimal-route search and does not grade the semantic quality of a shortcut. Completed golf v2/v3 rounds can be reviewed; older unsupported rule versions are left unannotated.

The browser caches reviews by full history/settings for the session and recomputes them after reload. It checks only the player's chain (one full replay per candidate omission), with no vocabulary search, model download or external call. Stale results do not annotate another round or reopen a dismissed result. The tests cover independent adjacent omissions, repeated occurrences and lost later backtracks, retained misses, automatic-finishing chip-ins, hub-aware historical rules, full suffix legality, real vectors, API parity and state immutability.


## Wider green and new-course defaults (course v26)

New holes use short 0.10 / long 0.22 / green 0.27. The higher long-shot requirement follows the latest scorecard comparison; the lower green edge is a small trial of more frequent automatic finishing, not a new stroke rule. The green threshold also normalizes trip length and launch strength, including the chip-in boundary. It is therefore not purely cosmetic. The drawing has separate controls: horizontal radii increase from 44 to 54 on phones and 72 to 86 on desktop, retaining equal width to each side of the flag. The green starts farther down the course (outer top 60, inner top 67), while its lower edge stays unchanged, giving more air above and a less thin, vertically asymmetric shape. Semantic positions still map to the actual green edge for each round's threshold.

Existing v3 rounds resume with their original settings. Restarting a round that used the previous standard distance settings (0.10 / 0.21 / 0.28) adopts the new defaults at the same endpoints; intentionally different custom settings are preserved. New dropdown/custom holes use the new settings immediately. Historical rules and explicit saved parameters retain their old values. The utility launch-function defaults remain historical; the current Game passes its saved/new settings explicitly.

The latest shared batch contributes 13 more completed, eligible holes under the existing endpoint/play screening, bringing the retained menu to 85. Every menu route is verified under the new settings, and browser fixtures use the matching published model. No vector assets change. Historical scorecards, feedback, skill-version definitions and the new shortcut review remain intact.

## Green proportions refined (course v27)

The green is now exactly 10% wider than the original drawing (radii 48.4 on phones and 79.2 on desktop). Its top sits halfway between the original and v26 positions: outer y=41 and inner y=48, with both lower edges preserved. The flag remains horizontally centred. Gameplay thresholds, launch normalization and saved rounds are unchanged.

## Clearer results and quick chip-ins (course v28)

The completion card keeps the successful route and total counted shots, with failed words listed separately as Miss hits and Penalty hits (water). Repeated attempts remain listed; water still costs its existing one counted shot, with no additional penalty. The same failure breakdown appears in completed Scorecard route reviews and copied scorecards. Copied skill uses the same percentage display as the page.

Clicking or keyboard-activating the hole-word label while away from the tee submits that shot immediately through the normal scoring, logging and animation flow. At the tee it only fills the field, including after returning to the tee. Other labels still fill the field. Busy/completed rounds and held-key repeats cannot launch another shot. Mobile activation does not summon the keyboard. Shot rules, model, thresholds, hub adjustment and chip-in variability are unchanged.

## Leaner result card (course v29)

The completion card no longer repeats that the score includes one automatic finishing shot. Total shots, route, misses, water shots, skill, automatic finishing and detailed scorecard records are unchanged. Four eligible holes from the next shared scorecard batch are retained in the menu: temple → netball, double → mast, window → bunt and genie → cinema, bringing the menu to 89. The existing screening excludes unfinished POPCORN → PETAL attempts. No threshold or chip-in display changes are included in this release.

## Chip-range trial and clearer results (course v30)

An optional Chip-in range (trial) toggle sits below the map, enabled initially and remembered on this browser. A faint horizontal approach wash leads into the green. Its transition spans the actual chip-in boundaries across possible current-word hub scores (0–1), preserving the target's hub score, with soft edges of 3.5% of the original playable gap. The display uses the Game requirement method through a detached probe and binary search; it does not duplicate the shot formula, modify a game, search the vocabulary or add success probabilities. It remains stable within a hole, varies with course settings and endpoint relationships, and hides for unsupported historical rules/degenerate gaps. The note makes clear that it is an approximate guide. No shot, green, hub or skill thresholds change.

The result card leads with a prominent Holed in… heading, then the bold successful route, miss/water words and a larger SKILL percentage. Completed shortcut reviews stay silent when no omission works; useful asterisks and their explanation remain. The hole-word label is disabled at the tee, including after backtracking there, and neither fills the input nor plays a shot. Away from the tee it still plays immediately. Other labels remain input shortcuts. Accessible action names remain accurate through animation/unlocking.

Custom-hole previews show factual word separation and opening bridge counts, with a reminder that counts do not measure human difficulty. They no longer display Gentle/Moderate/Challenging estimates. The underlying historical assessment fields and scorecards remain intact. Tests cover actual shot legality around the range envelope across breadths and levels, stable display, fixed/historical settings, game immutability, real POPCORN → HUSK → PETAL, disabled tee actions and quiet shortcut results. Mobile checks verify saved shading preferences, preserved input on tee taps, normal one-tap miss scoring and completion-card hierarchy.

## Curved distance map and narrow chip arc (course v31)

The map now spreads word lies around hole-centred distance contours. A word's centre-line semantic position still determines its displayed radius to the flag; a decorative sideways offset moves it along that radius, preserving its apparent distance rather than leaving it in a vertical column. Very close lies reduce their sideways spread so they remain near the hole and inside the green; lies still short of the green also limit their sideways spread to stay visibly outside the putting surface. Tee and flag anchors, centre-line progress scale, exact shot outcomes, shot counts and skill are unchanged. The grass stripes remain unchanged. This is a display metaphor, not a reconstruction of the full vector space or a second scoring dimension.

The chip indicator is now a narrow red arc, like a court range line. Twelve small concentric strips fade from almost transparent on the outside to solid red on the inside and then stop: the area nearer the hole is left unpainted. Its approximate location uses the midpoint of the existing breadth-adjusted chip boundary envelope. The ribbon is 12 drawing units wide on desktop and 10 on phones, with clipped ends above the water and below the top margin. The toggle and remembered preference remain. No probability, threshold, model or gameplay changes are introduced. Geometry tests verify constant radius despite lateral placement, fixed anchors, bounded close lies and paint confined to the arc.

## Actual hub envelope in the arc (course v32)

The red arc now spans the two actual calculated chip-in boundaries instead of a fixed-width ribbon around their midpoint. Its faint outer edge is the earliest legal chip with zero origin hubness (still respecting the target's own hubness); its strongest inner edge is the boundary that passes even at origin hubness 1. The fade is a visual ordering of this deterministic interval, not a probability of success. There is no minimum/maximum painted width or extra cosine padding. If both boundaries coincide, one thin stroked contour marks the boundary without inventing a band. Very narrow true intervals remain narrow. The band stops at its inner edge.

The grass stripes, curved-contour geometry, saved settings and all shot/skill calculations remain unchanged. The optional trial toggle and preference persist. Tests compare the rendered radii against the real boundary values for both screen layouts and different starting similarities/target hubness, including zero-width envelopes and historical fixed/old rules. The same release applies one square-root curve to nonnegative tee-to-green progress for all holes: 25% semantic progress occupies 50% of the displayed journey. Both hub-band edges and all word lies use this mapping; the tee, green edge and flag remain anchored. Positions before the tee retain their finite linear continuation, and the existing green-to-flag segment remains unchanged. Band width therefore shows the true hub interval on the new display scale, not raw cosine units.

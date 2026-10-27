# WORD GOLF ⛳

A browser word-golf game using actual Stanford GloVe 6B 300-dimensional vectors. Connect your next word to the ball word and aim closer to the hole. Reach the putting green for an automatic one-shot finish, or play the target word to hole out directly. Every supported guess counts as one shot, including misses and water balls; unknown words and your current lie cost nothing. Originally prototyped as Escape Velocity; the existing Pages URL and saved scorecards are preserved.

## Play online

[Play Word Golf on GitHub Pages](https://dixelstuff.github.io/escape-velocity/). The public version calculates cosine similarities entirely in your browser. The full model contains 36,306 words (about 20.1 MB of gzip-compressed half-precision vectors). Initial play loads only the hole-word seed pack; the first 5,000 common words and then the remaining packs load in the background, with individual words fetched on demand. Hashed filenames, integrity checking and Cache Storage reuse the model after a successful first load; HTTP caching remains a fallback when persistent storage is unavailable. No account, API key, or running Python server is needed. The original 822 MiB GloVe archive is never sent to players.

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

Default green similarity is **0.27**. Base contact requirements range from **0.095 to 0.215**, with the existing hub surcharge for broad-word travel. Trip fraction is the absolute change in target similarity, clipping both positions at the green edge, divided by the original tee-to-green gap and capped at 1. Base required contact is `0.095 + 0.12 * trip_fraction`. Finishing gets easier as you approach, without extra cost for landing deeper inside the green. All comparisons include `1e-7` tolerance.

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

`prepare.py` intersects the top 150,000 English frequency tokens with lowercase WordNet lemmas of 3–18 ASCII letters, requires a Zipf score of at least 2.5, removes an explicit common-name/unsuitable-token list, and removes simple regular plurals and participles only if a more frequent base is available. It then keeps up to 20,000 candidates and drops entries absent from GloVe. This is a reproducible heuristic, not a perfect dictionary or content filter; editorial review remains useful before public release. `expand_vocabulary.py` appends common dictionary forms and inflections with their own real GloVe vectors, including ordinary words rejected in playtests. The original 19,989 vector rows stay unchanged and in the same order. The actual retained count and sources are in `data/metadata.json`. `extend_dictionary_vocabulary.py` additionally admits source-backed lowercase WordNet lemmas with Zipf frequency at least 2.0, plus a small explicit outdoor/inflection list including ABSEIL below that floor. It preserves every pre-extension vector and hub score, the ABTT fit and old transformed rows, and old local-scaling radii. New hub scores and trial radii use the frozen pre-extension reference. The initial seed and first 5,000-word download are unchanged by this extension. `data/vocabulary-extension.json` records the preserved prefix hashes and added words.

Fresh games also use a dictionary-confirmed noun/adjective boundary rescue. `build_word_families.py` compiles explicit WordNet derivational/pertainym pairs whose model cosine exceeds 0.65; no suffix guessing or transitive families are used. After ordinary plural rescue, a word at most 0.025 short of contact or a dogleg/finish boundary can use its related form only if the full shot remains legal. Existing finishes, plural rescues, unsafe original shots, literal targets and current lies are left alone; the player's spelling remains displayed. Family variants are fetched alongside the entered word before scoring. The `family_rescue` setting is saved explicitly; older unversioned scorecards retain their recorded scoring when restored.


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

## Slightly softer display and golf motion (course v33)

The shared display exponent moves from 0.50 to 0.55, reducing the early-progress expansion slightly. Word lies and both exact hub-band edges still use one mapping; anchors, backward continuation, grass stripes, gameplay settings and saved rounds are unchanged.

The tee-label background/text slides from its current visible position to the new packed position over 360 ms, with its connector following the transition. Capturing the visible position also avoids a fresh jump if a redraw interrupts a transition. Different tee words or viewport widths start cleanly. Reduced-motion preferences skip the transition.

Automatic green finishes roll along a straight ground segment with deceleration and rotating dimples. Their saved trail is straight too. Direct successful hole-word shots have a low initial flight, two diminishing bounces and a final roll. A separate ground shadow becomes smaller/fainter under airborne balls; regular shots retain their previous flight curve. Putts and chip-ins shrink into the cup at the end, and the completed map leaves the flag/cup visible without a ball popping back out. Misses, water, scoring, timing-independent engine state and skill remain intact. Reduced-motion preferences continue to skip shot animation.

Motion tests check ground-only putting, chip ground contacts and decreasing hop heights, exact endpoints, no ground overshoot, final sinking and immutable inputs. Mobile browser checks cover the tee label mid-transition, a real MORPH → EVOLVED automatic putt with zero lift, and a GENIE → MAGIC → CINEMA chip-in with the same two counted shots and a settled cup.


## Varied cups, softer green and clearer misses (course v34)

The green is 5% wider with a smooth, subtly organic outline and rounded ends. Each new round seeds its cup position from its saved round ID: 50–70% across the green from the tee-facing edge and 30–70% down its height. It stays fixed during play and after refreshing. The tee-to-cup axis, word distance contours and exact hub-envelope arc rotate together around the actual cup. The display scale meets the actual green boundary along that axis. These are appearance changes; word vectors, shot legality, thresholds, skill and original grass stripes are unchanged.

Long tee shots receive extra airborne height proportional to their displayed travel, while short shots, rolling putts and chip bounces retain their motion. Nearby failed-shot labels prefer outward placement: above the upper marker and below the lower marker, with the existing collision and boundary checks still applied.

Geometry tests cover both screen widths, extreme cup placements, stable seeded positions, green membership, radial distance preservation and immutable layouts. Label tests check outward placement in both attempt orders. Motion tests check the taller long tee flight without lifting putts or short tee shots. The full JavaScript suite passes; desktop/mobile browser checks verify the new green, stable cup after reload, real automatic completion and nearby missed-word labels.


## Mobile label clusters and course variety (course v35)

Outward label preferences now apply to successful lies as well as misses, so a higher CAMERA marker does not take the lower label space needed by nearby INSPIRE. Packing considers obstacle edges and side positions rather than coarse rows alone, and scores the actual connector distance so a blocked preferred spot does not force an unnecessarily long descent. Word coordinates and semantic radii remain fixed. Regression tests cover the reported MARS → INSPIRE (miss) → ROVER → CAMERA route at phone/desktop widths, high/low pins and tees, both before and after holing.

The saved round ID also seeds a modest ±24-unit vertical tee shift (ball, markers, labels and course axis together), one or two organically shaped bunkers with varied position/size/rotation, and a varied shoreline. Water starts higher and extends past the bottom and left boundaries, reading as an off-map lake. Fairway word lies and labels avoid the shoreline. These visual choices stay stable across refreshes and viewport changes. The original straight grass stripes, vectors, thresholds, shot outcomes and skill are unchanged.

Tests verify stable terrain variation, legal green membership and lake clearance, local labels under extreme pin/tee placements, and the full existing scoring suite. Mobile browser verification replays the exact reported route and completes it in the same four counted shots.


## Scorecard-style course illustration (course v36)

Scenery uses a restrained plan-view scorecard style: softly contoured rough surrounds, small overhead tree stands with subtle canopy detail, three hand-shaped kidney/crescent bunker profiles with a sand lip and fine texture, and a muted lake with a broad bay rather than repeating waves. The lake has smooth tangent-matched banks, narrow shoreline contours and extends beyond the bottom edge. Terrain remains lightweight inline SVG, with no image downloads or added libraries. The original straight mowing stripe pattern is unchanged.

Words and their labels render above the artwork. The updated shoreline is shared by rendering, fairway-word clearance and label obstacles; it never changes shot outcomes or skill. Seeded cup/tee placement and scenery remain fixed through a round and refresh. Geometry/label tests and the full existing scoring suite pass. Phone and desktop previews verify the active MARS route stays readable against the scenery.


## Balanced course composition (course v37)

The green is about 10% shorter (318 drawing units) and its centre varies vertically by up to 20 units each round. The tee now gently counters the actual cup height: a higher cup tends to put the tee lower, and vice versa, with a small seeded variation and the same safe tee bounds. All anchors, labels, radial contours and the chip indicator follow the shared layout; geometry tests cover the extreme green, pin and tee placements at both viewport widths.

The lake starts its exit farther from the green and smoothly continues below the view; its final path closure is entirely offscreen. Water-ball splash positions remain inside the visible lake. The rough along the top and right edges is one continuous filled outline, removing the overlap seam in the corner. The straight mowing stripe pattern, semantic model, thresholds and skill are unchanged. Phone preview and the full JavaScript suite pass.


## A larger course around the result card (course v38)

A seeded approach feature sometimes occupies the space between the receding lake and the green: a small planted patch of rough or a bunker set into its own cut of grass. These remain scenery, without changing shot legality or word positions. The existing rough perimeter continues around the bottom of the playing area as one outline.

Feedback panels now sit over a continuation of the scorecard landscape at the same horizontal scale: the lake bank continues below the hole, with a neighbouring fairway, winding path, trees and glimpses of another green and bunker. The illustration is a self-contained SVG background cached per round/layout. It naturally reveals more of the world when a result card grows, while adding no height when feedback is closed. It stays behind feedback text and outside the played route. Mobile checks verify the fully populated result card, the scenery along its exposed edges, and zero feedback height after closing. The full existing game test suite passes; scoring, word vectors and the original mowing stripe pattern are unchanged.


## Continuous water and shared lakeside rough (course v39)

The active map and the landscape below the result card now render the same complete lake path, shoreline contours and rough mask. The playing SVG clips at its own viewport, preventing offscreen scenery from painting a second layer over the feedback background. The old separately closed continuation lake is removed. The first cut of rough follows the bank 24 drawing units inland, and intersects the perimeter through a union mask tinted once, so there are no darker overlapping cuts.

The occasional approach area is roughly 40% wider, with larger trees or sand. Its connected turf peninsula belongs to the same rough mask rather than an overlapping grass island. Tree placement checks water membership with a canopy/shadow margin; the previously submerged continuation trees are omitted. Geometry tests cover the reported water location and dry tree margins across 100 seeded rounds at both widths. Mobile and desktop result previews verify the seam removal and larger connected approach. The full game suite passes; vectors, thresholds, scoring and straight mowing stripes are unchanged.


## Smooth rough and automatic range finish trial (course v40)

The rough is the exterior of one smooth fairway contour, following the bank and rising into the larger approach feature. It has no overlapping turf islands or joined masks. The approach bunker is wider/deeper and the vegetation variant has three larger trees. Shared lake/world geometry, dry tree checks, mowing stripes and the red chip-range envelope remain.

New rounds save `finish_mode: range`. After a successful landed shot, the engine checks whether the literal hole-word shot is legal using its existing distance and hub-adjusted requirement. If legal (or on the green), it records one counted automatic finish; outside-green finishes chip and bounce, green finishes putt. The UI first shows the landed lie and its current shot count, without revealing the automatic trail or result, pauses 1.1 seconds, then plays the finishing shot. Reduced motion shortens the pause. Misses and water never trigger it; returning to the tee does not trigger it. Map words are now plain labels and have no click, keyboard or input-fill action. The optional chip-zone toggle is retained.

Older rounds keep their original green/manual-chip behavior on replay. Loading the release starts a fresh trial round while archiving the earlier scorecard. Finish mode is included in saved states, skill/history keys, bridge feedback keys and assessment settings. Skill and opening-bridge evaluation recognize finishing range as terminal, and exclude the automatic shot from player-choice grading. The green threshold and all contact/hub formulas remain unchanged.

A dedicated test covers borderline hub-adjusted finishes, automatic shot counts, misses/water/tee exceptions, deterministic restore, scorecard entries, skill/shortcut replay and actual MARS → INSPIRE (miss) → ROVER → CAMERA → automatic CLARITY. Mobile checks verify the GENIE → MAGIC settling pause at one shot with no result/second trail, automatic completion in two shots, noninteractive labels and the retained toggle. Historical scoring fixtures and the full suite pass.


## Miss-message alignment and continuous background (course v41)

The scorecard landscape is now one full-world SVG background on the map card, extending behind both the drawing and feedback. Feedback is transparent instead of starting a second background at the bottom edge of the playing SVG. This removes the separate surface join that could show as a thin horizontal line. The foreground drawing remains clipped; artwork placement and original mowing stripes are preserved.

Miss/water messages use a text-and-close grid so the 44-pixel dismiss target stays vertically centred beside wrapped text. Close icons use explicit grid centring instead of font baseline positioning. Mobile checks at 390 and 320 pixels verify placement and dismissal with zero leftover feedback height. Appearance, map and automatic-finish regression checks pass. All course settings, thresholds and the automatic-finish trial are unchanged.


## Stable focused play and current-lie help (course v42)

Focused mobile play no longer flex-stretches the playing SVG inside a taller card. The entire course keeps the SVG aspect ratio and cannot grow beyond its pre-focus width. A small layout helper fits that width to the actual visual viewport space left by the heading, input and optional help. If the keyboard or help needs more room, the map and its background shrink together rather than letterboxing and revealing duplicate strips of the background.

A concise line below HIT SHOT always names the current lie and target: “Connect to ROVER to hit; move closer to CLARITY.” The adjacent info button expands a current-scenario explanation and reminds players that the ball word changes after each landed shot. It stays available in typing mode, preserves input focus when tapped on mobile, and triggers a fresh fit when opened/closed. Input descriptions also reference the helper text.

Geometry tests cover narrow phones, short keyboard-space heights and expanded map heights, verifying no enlargement and one preserved aspect ratio. Mobile UI checks verify unchanged 354×238.5 course bounds on focus, a uniformly scaled view in a 390×360 viewport with help open, retained input focus, and the MARS → ROVER hint updating to the current lie. Map and automatic-finish regressions pass. Course settings and thresholds are unchanged.


## Gentle threshold adjustment and direct instructions (course v43)

New holes use short contact .095, long contact .215 and green .27, with the same hub surcharge and automatic finish trial. Existing scorecards retain their recorded settings; restarting a previous standard course adopts these new defaults. Course inputs accept .005 increments. Thirteen eligible endpoint pairs from the latest scorecards join the existing menu (102 holes total), with no personal play records published.

The heading above the course now says “Connect with DIGGER to hit, and LOAD to advance.” It updates to the current lie after a landed shot. It replaces the original tee-to-hole title and remains visible during mobile typing. The info button, expanded explanation and duplicate below-input hint are removed. The focused course retains uniform scaling.


## Contextual guidance placement and result actions (course v44)

The tee-to-hole title returns above the course. Guidance spans the input row beneath it on desktop and on mobile while the input is inactive. During mobile typing only, guidance takes the title's place above the map and the lower copy is hidden. Both use the current lie and target; the mobile course continues to scale uniformly to the available keyboard space.

Skill calibration buttons and note inputs are removed from the result and scorecard UI. Historical feedback remains in saved/exported scorecards. The completion card instead offers NEXT HOLE (the following dropdown hole, wrapping at the end; custom holes start at the first menu hole) and REPLAY (same endpoints and restart settings). Actions appear immediately on completion, independently of skill assessment, and archive the completed round normally. Thresholds remain .095 / .215 / .27.


## Compact shot counter (course v45)

The shot count now uses a slightly smaller number with SHOTS centred beneath it. On mobile, focused entry gives the current-lie guidance the remaining header width with an eight-pixel gap and natural line wrapping. Course layout, guidance wording and gameplay settings are unchanged.


## Stable skill placeholder and consistent guidance (course v46)

The result always reserves the skill row as SKILL --% while the assessment loads, replacing its text with the percentage without changing row height. The tee-to-hole title stays above the map on every device, including mobile typing. Current-lie guidance remains below the input in both focused and inactive modes. The stacked shot count increases slightly: 37px desktop, 28px mobile and 24px while typing, with a 10px/9px SHOTS caption. Gameplay is unchanged.


## Result footer alignment (course v47)

The completion card no longer has a close icon or a separate Show result action. Equal side padding replaces the old close-button gutter, so NEXT HOLE and REPLAY are centred across the actual card at its bottom. Miss-message dismissal is unchanged. Bridge eligibility, gameplay and thresholds are unchanged.


## Explicit backward-shot message (course v48)

Water shots now explain the semantic direction with the attempted word, target and origin: “Splash! Penalty for hitting backwards. SPEAK is less related to CHIRP than TALK.” Only the message changes; the existing counted shot and return to the current lie remain unchanged, with no extra stroke.


## Scenario-specific misses and compact keyboard layout (course v49)

Miss and water messages now lead with bold labels and name the exact words: “Splash! You hit backwards. SPEAK is less related to CHIRP than TALK.” and “Miss! PUKE doesn't connect enough to GATE to hit the ball.” Contact failures name the origin lie, not the tee. Words are HTML-escaped and scoring is unchanged.

Focused mobile play reduces outer spacing, input spacing and helper typography before reducing the map. It avoids reserving the device's bottom safe area again above an already inset software keyboard. Input and submit targets retain a 44px minimum. The pre-focus course width remains the cap; proportional map shrinking is retained for viewports that genuinely cannot fit the course and controls.


## Restore space between course and keyboard controls (course v50)

Mobile typing retains the normal 20px gap between the course and the input/button row, replacing the cramped 6px gap. The input, HIT SHOT and guidance move down together. The fit calculation reserves this margin before scaling the course, keeping the full pre-focus size whenever the viewport has sufficient room. Gameplay and messages are unchanged.


## FINANCE projection experiment (course v51)

The dropdown retains GOLD → HOVER and adds GOLD → HOVER · FINANCE headwind immediately afterwards. A visible note identifies its 50% topic reduction. For each word vector v, the experiment uses normalize(v − .5(v·h)h), where h is the unit FINANCE vector. This transformation is constant for the whole round and includes the tee and target. It changes geometry rather than imposing a guaranteed penalty: some similarities can increase. Existing contact/green defaults and hub scores are unchanged.

The projected Float32 model is computed on demand and one variant is cached per base model; downloads and source vectors are unchanged. Play, automatic finishing, chip-range display, bridge assessment, skill comparisons and shortcut replay use the same projected model. The wind word, strength and version are saved/exported, included in assessment/feedback keys and retained by replay, restart and reset. The original and wind variants remain distinct in the course selector and scorecards. Custom holes start without a headwind.

At the chosen strength the legal opening-finishing bridges change from 67 to 65; finance vocabulary is not universally removed. GOLD–MONEY contact falls from .265 to .247, while GOLD–SILVER stays nearly unchanged (.848 to .847). This is a controlled playtest of topic removal, not a claim that all vague routes have been eliminated. Tests verify the projection independently, source immutability, replay/persistence, exact full-vocabulary bridge legality, adjusted skill/shortcut calculations, and ordinary-course regressions.


## Selectable ABTT comparison (course v52)

“Word model” offers Current model (the unchanged default) and ABTT · 1 component (trial). Switching starts a separate saved round with the same endpoints. Next hole, custom holes, restart and replay retain the selected profile; restoring a scorecard uses its recorded profile. Scorecards, skill reports and bridge feedback distinguish the profiles and their vector hashes. The trial is downloaded on first selection and cached, so standard play does not download both models.

The trial fits the mean and covariance to all 400,000 **unnormalised** original GloVe 6B 300d vectors. For each selected vocabulary row x it computes c = x − mean, then normalize(c − (c·u)u), where u is the largest centred principal component. The result is packed to float16, using the same integrity-checked gzip/fallback loader as the current model. This is a centred, one-component All-but-the-top trial, not CSLS. See [Mu and Viswanath, All-but-the-Top](https://arxiv.org/abs/1702.01417). `scripts/build_abtt.py` reproduces the artifact from ignored `data/glove.6B.zip` and caches the result in ignored data. Rebuild with `.venv/bin/python scripts/build_pages.py`.

Current defaults remain short .095 / long .215 / green .27. The trial uses calibrated short .09526148742408946 / long .2226404434066529 / green .26797642291676005 to approximately preserve overall contact and finishing opportunity, rather than comparing geometries at arbitrary identical cosine cutoffs. Existing breadth scores and the .035 hub surcharge remain fixed for comparison. FINANCE headwind, if selected, is applied after the selected base profile.

For GOLD → HOVER the packed trial has 53 legal finishing bridges versus 67 in the current model: AROUND, STILL, COME, WILL, CONTINUED, HOLD, KEEP and EXPECTED are excluded, while SHINY remains. This does not guarantee every level or familiar route improves. Tests check artifact integrity, no upfront trial download, lazy switching, profile-separated replay/logs/feedback keys, correct skill/shortcut/chip-range geometry and headwind composition.


## Current / ABTT comparison holes (course v53)

Ten fresh holes appear in the first dropdown group, “Model comparison · 10 holes”, numbered 01–10. The original course remains in its own group with its original stored indices; comparison holes from `data/comparison-holes.json` are appended to the browser config so NEXT HOLE advances through them in order. Use the existing Word model selector to restart the same hole under Current or ABTT. Scorecards already record model identity and actual thresholds. No scoring, model defaults or vector files changed for this set.

Selection screened familiar non-hub tee/hole words against previously submitted scorecards and the existing menu. Both models must reject a direct hole-in-one, offer multiple opening finishing bridges, and have several robust model-specific bridges in both directions. On these ten pairs, opening-finishing bridge set Jaccard overlap is .20–.51; disagreement is not solely near-threshold float precision or a slight calibration change. This predicts different available routes, not a guarantee that a player will choose different words or prefer one model. Solutions are intentionally omitted from the UI and documentation.

01 KNUCKLE → SHADOW; 02 JARGON → CLOUD; 03 LACE → HAMMER; 04 MUSEUM → GIRAFFE; 05 HOVER → DREAM; 06 SILVER → ZIPPER; 07 FABLE → THUNDER; 08 SYNTAX → BRIDGE; 09 WEAVE → SPARK; 10 ASH → CURL.

## LS15 and Success mode (course v54)

The selector adds a 15% Local Scaling trial while retaining Current as the default and the ABTT trial for comparison. LS reuses the published Current vectors and downloads only a hashed 99,980-byte float32 table of neighbourhood radii on first selection. For cosine s and each word's distance r to its tenth-nearest other vocabulary word, it computes L = exp(−(1−s)²/(rₐrᵦ)), then .85s + .15(L−.004275184227927229)/.5912053921108603. Self-similarity is exactly one. The frozen defaults are short .07535575526565894, long .2193557552656589, green .255080630816617. These match the offline blind-review trial; there is no new fit to these ten holes or ratings. Float32 radii preserve the offline opening counts on all ten trial holes.

`scripts/build_ls.py` regenerates the radius data from the packed published vectors, with an ignored local cache. Play, assessment worker, exhaustive bridge previews, skill rows, shortcut review and restoration all use the same transformed scores. The radius fingerprint and frozen coefficients produce a separate score-model identity in scorecards. The old FINANCE projection experiment is deliberately unavailable under LS because its fixed neighbourhood radii describe the unprojected model; Current and ABTT still support it.

The first selector group, “LS trial · 10 new holes”, contains MAZE → BONE, SILENCE → SNOW, SHIELD → BLOSSOM, FABRIC → MELODY, CANYON → LIGHTNING, WITNESS → COFFEE, BREEZE → HARE, DESERT → SHOULDER, RECIPE → PANDA and JUSTICE → OPERA. These pairs were excluded from earlier submitted scorecards and course menus. Five come from sparse Current holes gaining options under LS, and five from richer Current holes losing options. All reject a direct opening hole-in-one in Current, LS and ABTT and have available opening finishes. The sample is deliberately selected for comparison, not a random estimate of game quality. Previous course and comparison holes are retained; next-hole navigation preserves the selected model.

New rounds use Success mode with par 3, including the automatic finishing shot. A challenge has a stable ID and an attempt number distinct from its shot count. If the shot budget no longer allows par, the engine ends the attempt; the UI retains its map and explanation for two seconds, then creates a separate scorecard at the tee with the same challenge ID and the next attempt number. With one stroke remaining, the only available completion is a legal literal-hole shot: a new connecting word followed by an automatic finish needs two strokes. Unknown words and the current lie remain uncharged, misses/water remain counted, and the contact/direction rules are unchanged. A connecting shot cannot sneak an extra automatic stroke beyond par.

Results say “Success! Par on attempt 3” or “Success! Birdie on attempt 2”, retaining the route, misses and skill assessment. Every failed attempt and its model/settings remain saved and exported. Reload restores the challenge and restarts an already-failed attempt; replay, selecting another model or hole, and manual restart begin a fresh challenge. Old rounds are archived on the initial upgrade and remain reproducible without a shot budget. The state supports later par 4/5 courses; mandatory intermediate fairway targets are not part of this release.

Validation includes independent LS formula checks, frozen per-hole counts and exhaustive candidate parity against the game on all ten new holes, workerless/lazy loading, model-separated skill and logs, deterministic restoration, challenge budgeting, auto-finish accounting and failed-attempt retention. Dedicated tests run in the Pages workflow alongside the existing scoring and layout suite.


## Immediate retries and fading attempt history (course v55)

New challenges use `par-challenge-v2`: the first scored miss or water penalty immediately ends the attempt, even if strokes remain. The shot animation and explanation remain visible, followed by the existing two-second pause and automatic retry. Unknown words and the current lie remain uncharged and do not restart. Running out of the par budget still ends an attempt. Version 1 states retain their historical budget-only rules during replay; loading the release archives a previous challenge before starting the new rule version with the selected model.

The most recent three failed attempts in the same challenge appear as blue-grey ghost trails and hollow word markers, fading at opacity .55, .34 and .19. They never combine different holes, model/settings, or manual replay challenges. All retries share one seeded course layout, keeping the tee, cup, shore and semantic positions aligned. Current words/labels take priority; optional ghost labels use spare space and are omitted if they cannot fit without expanding the map. An expandable Previous attempts list preserves the exact word sequence and identifies the failed word as miss or penalty. Ghosts survive reload through the existing full scorecards. The header prominently counts attempts, with par beside the title; shot totals remain in scorecards and result classification. Grass, LS/Current/ABTT scores, thresholds and saved attempt data are unchanged.

Tests cover instant miss/penalty failure, no-charge exceptions, versioned restoration, selecting exactly three recent attempts, fade order and model isolation, shared map projection, and optional label packing without displacing live labels or increasing map height.


## Single ghost and compact path results (course v56)

Only the latest failed attempt is drawn, at .72 opacity. It remains while entering a word, then fades over 220 ms as the next charged shot begins; unsupported/current-word submissions do not dismiss it. Once the current attempt has a shot, the ghost stays hidden, including during the final result. The optional previous-attempt list remains available. All earlier attempts remain in exported scorecards.

The result displays three lines: “Success!”, “Par on attempt 4” (or birdie/eagle as applicable), and “Path skill 88%”, followed by the existing next/replay actions. The repeated route, failures and shortcut asterisks/review are removed from the result/UI. The skill row reserves its placeholder height. Path skill grades only the successful attempt, independently of earlier failed attempts; scoring geometry and the skill formula are unchanged. Historical scorecards with misses retain their original assessment label and values.

Miss/backward messages are shorter and survive the automatic retry until the player types. Focusing alone does not dismiss them. Dismissal survives reload for that active attempt. The next typed word clears the message and recalculates the mobile fit; unsupported words remain uncharged. Saved scorecards still include the full diagnostic history. Browser checks cover persistence through retry and reload, clearing on typing, one stronger ghost, disappearance on the next valid shot, and the compact mobile success result.


## Informative forward misses only (course v57)

A missed word gets a marker, trail and next-attempt ghost only when its raw target similarity improves on the current lie by at least 10% of the original tee-to-green similarity gap. This is measured in the selected model's scores, never distorted map pixels. The latest failed attempt must qualify; a nearby/backward miss clears ghost eligibility rather than falling back to an older useful miss. Existing small connected recovery/backtracking rules and all contact/finish thresholds are unchanged.

Backward failed hits use the ordinary miss animation, with no splash or backward word marker. Their original `water` outcome remains in diagnostic scorecards for reproducible analysis; the main play UI calls them misses. The course lake remains scenery. Useful forward feedback reads “Miss! SCIENCE needs a stronger link to HEAT.” Nearby misses read “Miss! Not enough connection.” Backward misses read “Miss! SPEAK takes you away from CHIRP.” Unsupported words read “Word not allowed. Try another.” and the current lie reads “You’re already on HEAT. Try another word.” Both input errors remain uncharged and preserve the ghost. Par failure and success messages retain the approved copy. Feedback remains through retries until typing, and a qualifying ghost still fades on the next valid shot.

Tests exercise the inclusive semantic boundary, current-lie versus tee calculations, nearby/backward suppression, no fallback to older ghosts, exact message copy and input-error handling. Browser checks verify forward ghosts, absence of nearby/backward labels and splash, and persistent feedback after retry.


## Softer ghost (course v58)

The previous attempt ghost uses .60 opacity instead of .72, making its trail, marker and label a little fainter. Ghost eligibility, fading on the next shot and all game rules are unchanged.


## Previous-attempt labels only (course v59)

Retries retain only the normal faded labels for visible words from the latest unsuccessful attempt: successful steps and meaningful forward misses, excluding tee/flag duplicates. There are no past-shot arcs, circles, ball markers or label leader lines. The label font, background and normal missed-label opacity (.72) are shared with the ordinary map labels, with no separate ghost styling. If a nearby/backward miss was hidden, its label stays hidden, while any successful setup word from that attempt is still recalled. The separate Previous attempt panel is removed; full history remains in Scorecards. Labels use spare space and cannot push live labels or expand the map. They fade on the next charged shot; invalid words preserve them. Attempt selection, messages, scoring and full exported history are unchanged.

## Focus dismissal and large-history reset (course v60)

Previous-attempt labels fade over 220 ms when the shot input gains focus on desktop or mobile. Dismissal is saved on the active attempt so resize, chip-range toggling and reload cannot bring them back. Reduced-motion users see immediate dismissal.

Scorecard reset writes the small new batch before replacing the recovery copy, avoiding the temporary double-sized history that could exceed localStorage quota. A failed recovery write restores the original stored batch. Tests cover quota pressure and rollback; the submitted 321-round scorecard also resets under a quota where the previous write order fails. Restore uses the same space-saving order with rollback on failure. New downloads exclude the recovery archive, and Restore previous scorecards remains available. Gameplay, models and thresholds are unchanged.

## Stable word labels (course v61)

Map redraws reuse each readable label box while its word anchor, text size and course layout stay the same. Changes to active-ball status, label priority, connector lines and previous-attempt fading no longer trigger fresh placement. New labels fit around the retained ones; actual marker collisions and changed word locations still allow repositioning. Optional previous-attempt labels cannot displace current words. A new hole or mobile/desktop layout starts fresh placement.

Successful-shot previews reserve space for the arriving full-size ball, avoiding a second label move at landing. Any necessary label relocation is animated, including non-tee words; reduced-motion preferences are respected. Mobile browser checks cover preview/landing, chip-range toggle and failed-attempt return. Regression tests cover role changes, ghost labels, collisions and changed word anchors at both course widths. No scoring or grass changes.

## Fast retries and blind LLM route review (course v62)

Failed attempts no longer have a two-second hold after the miss notice appears. Retry is queued for the next event-loop turn, after submission unlocks; the notice remains visible while the new attempt's input is ready. Existing shot animations, scorecards and notice dismissal are unchanged. Mobile browser checks verify the notice and enabled input coexist, and tapping enters typing mode.

`node scripts/build_llm_review.mjs` creates a local, ignored `reports/llm-route-review/` handoff. The frozen-seed study uses 60 sampled course holes and 60 recombinations of course endpoints, rejecting opening hole-in-ones under any model. Current, ABTT 1 and LS 15% retain their published profile defaults. Each model/hole contributes up to eight uniformly sampled opening bridges for the primary comparison. Up to two strongest tee links and two model-exclusive bridges are sampled separately for diagnostics. Shared routes are deduplicated, all samples are replayed through the actual engine, and the model key/settings/fingerprints and full repeated-word finishing coverage stay in `private/answer-key.json`.

The generated study has 3,347 routes in 24 blinded batches of at most 150; complete holes stay together for paired comparisons. Each batch contains the same self-contained LLM rubric for independent edge connection, route satisfaction, context-specific vagueness and confidence. The generated ZIP must exclude the answer key. Start with `batch-01.md` (145 routes), then return the CSV ratings. `scripts/analyze_llm_review.py ratings*.csv` joins ratings to the key, validates IDs/scales/duplicates, excludes diagnostics from primary rates, and compares equal-weight complete paired holes with paired bootstrap intervals. Unknown/missing ratings cannot silently be treated as poor bridges. LLM ratings are a semantic-quality proxy requiring human spot checks, not proof of human preference. The analyzer was smoke-tested on synthetic constant ratings, not presented as a real model result.

## Short-shot range feedback and faded dots (course v63)

A successful second shot that remains outside real finishing range temporarily reveals the chip-in arc, even when the player's persistent range preference is off. The browser client checks the actual model's `finishesFrom` rule; it does not infer legality from the drawing or change scoring. After an unreachable-par retry, the arc remains alongside the previous attempt's positions until the input is focused. The notice says “Short of chip-in range. Try again.” Misses and backward failures do not trigger this short-landing reveal. The saved on/off preference is unchanged.

Previous visible words now retain their normal faded dots (opacity .4) as well as labels (.72), with no old shot paths or leader lines. Both fade on input activation, together with any temporary previous-attempt range arc. The same display eligibility rules remain: successful setup words and useful forward misses are retained; hidden nearby/backward misses stay hidden. Stable label placement is unchanged.

The approved future blocklist wording is `WORD is too vague for this hole. Try again.`, available through `vagueWordNotice`. No per-hole blocklists have been activated in this release; model/threshold choices and the pending curation trial are unchanged. Tests cover actual short/finishing/backward second-shot cases and the wording; mobile browser QA covers range-off automatic reveal, fast retry, dots/labels, focus dismissal and reload persistence.

## Compact notices and transient MISS feedback (course v64)

A missed or backward failed hit briefly shows “MISS!” over the centre of the course, then fades. The overlay is pointer-transparent, adds no retry delay and is dismissed immediately by new input. Reduced-motion preferences use a brief static display. The persistent notice displays only the explanation visually, with the original “Miss!” retained for screen readers. Short-of-range notices continue without the MISS animation.

Persistent notices are centred and capped at 560px, with wrapping on phones. Feedback padding is reduced from 18px top / 22px bottom to 6px / 8px, placing the notice closer to the drawing and avoiding unnecessary downward displacement. Completion-card spacing is unchanged. Browser QA covers 1440px desktop and 390px mobile widths, overlay dismissal, enabled retry input, compact notice geometry and no horizontal overflow. No scoring changes.

## Layered in-course miss feedback (course v65)

The persistent explanation now overlays the bottom of the course, including over the green, without increasing map-card height or moving controls down. It remains centred and capped at 560px, with phone wrapping. Completion feedback retains its existing flow layout.

“MISS!” uses a brighter red (#de3b30), holds longer and finishes its animation after 1.5 seconds. The explanation waits 300ms, then fades in over 220ms. Input remains ready immediately and clears both elements. Reduced-motion users receive a static MISS display and a delayed instant explanation. All finished-shot feedback uses past tense: “needed a stronger link,” “took you away,” “The connection was too weak,” and “The shot landed short of chip-in range.” Current-state validation and instructions retain their appropriate tense.

Mobile QA verifies explanation opacity starts at zero while MISS is visible, becomes one and remains after MISS disappears, and map-card height stays exactly equal to the SVG height plus its border. Desktop QA verifies the 560px cap and no horizontal overflow. Scoring, retry timing and blocklist activation are unchanged.

## Golf scorecard results and inline misses (course v66)

Miss explanations now include a bold inline “MISS!” instead of the large red course overlay. The message appears immediately in its existing compact course position, with no animation or retry delay.

Success uses a paper-style golf scorecard with a framed border, par badge, result and attempt cells, and a separate Path skill row. The card starts 36px higher than before; NEXT HOLE and REPLAY sit centred below the paper over the continuation scenery. Skill retains its reserved placeholder space. Mobile (390px) and desktop (1440px) browser checks cover the completed route, card placement, separate buttons, replay and no browser errors. Summary, success-mode and feedback tests pass. Models, thresholds and course artwork are unchanged.

## Compact feedback and contained scorecard actions (course v67)

Shot notices shrink to their text width while remaining centred and capped for long messages. The scorecard moves another 18px higher, uses ATTEMPTS and SKILL labels, and contains centred NEXT HOLE and REPLAY actions beneath a divider. Mobile browser QA verifies the full route stays visible, both actions are inside the card and there is no horizontal overflow; desktop QA verifies a short miss message occupies only its required width. Summary and feedback tests pass. No gameplay changes.

Course v68 adds a little extra spacing after the inline bold MISS! lead-in.

## Paired result cells and connection-aware path skill (course v69)

The scorecard headline names the result (for example, “You got a Par!”), with SKILL and ATTEMPTS in adjacent cells directly above their values. The skill placeholder retains its cell geometry; the result row and detached skill row are removed.

Skill v4 retains the existing one-step onward-opportunity, unhelpful-loop and long generic-move assessment. Success-mode long advances and finishing bridges also receive relative connection regret: 1 minus their link strength divided by the strongest comparable legal alternative. A finishing bridge uses the geometric mean of its contact and hole links, comparing against other automatic-finish bridges; direct hole shots compare only with direct finishes. Other long moves use contact strength among shortlisted choices preserving at least as much onward opportunity. Small non-finishing moves (no more than half the original tee-to-green gap, including lateral/backward setup) receive zero additional connection regret. They retain their existing opportunity assessment, so useful setup remains valuable and padding cannot improve the score. Automatic finishes and prior failed attempts remain excluded. Historical non-challenge rounds retain the previous scoring formula. New report fields and version/history-key validation prevent reuse of stale assessments; old feedback snapshots are retained.

Controlled graph tests distinguish a strong balanced bridge (100%) from balanced (86%), unbalanced (77%) and marginal (62%) alternatives, while two equally useful small setups with very different contact strengths both score 100%. Existing skill, specificity, feedback, success-mode and summary regression tests pass. Reassessing the latest 25 distinct successful short range-mode model/route combinations from scorecards (8), retaining each model/settings and using par 9 for older non-challenge routes, gave 61–100% (median 70.9%) instead of 80–100% (median 99.3%); scores at least 95% fell from 15 to 2. This is a small replay calibration with repeated holes across models, not a population distribution or validation of human semantic judgement. Full local rows are in the ignored `reports/llm-route-review/skill-v4-calibration.json`. The model can still overvalue awkward associations; skill remains a vector-based comparison, not a human percentile or proof of optimal play. Gameplay thresholds and models are unchanged.

## Fresh ten-hole course (course v70)

A new “Fresh course · 10 holes” group appears first in the hole dropdown, numbered in playing order. The course is stored separately in `data/fresh-course.json`, exported by the Pages builder and kept out of the regular-course group to avoid duplicates. NEXT HOLE follows its stored sequence. Existing rounds, model selections and all previous holes remain available.

The ten pairs were absent from both the published course and scorecards (8). All endpoints have zero measured hub surcharge in the current hub table. Each pair has a manually reviewed, specific association route that replays within par 3 in Current, ABTT and LS with their existing defaults. No pair permits a direct opening hole-word finish in any of those three models. Validated routes include a mix of two and three counted shots; they are retained only in the local ignored `reports/llm-route-review/fresh-course-validation.json` to avoid publishing solution spoilers. This curation establishes satisfying legal examples, not that every available bridge is satisfying; no blocks or threshold changes were added.

## Fairway-only mowing pattern (course v71)

The vertical stripes now use a clip path matching the existing smooth fairway contour. Rough is opaque and uniformly coloured, instead of being a translucent tint over full-page stripes. The playable SVG and continuing scenery beneath the result card share this rendering, so stripes cannot bleed through the rough in either view. Fairway stripe spacing, green mowing, terrain geometry and gameplay are unchanged. Mobile and desktop result-view browser checks pass, alongside appearance, map and typing-layout regression tests.

## Retained player discoveries (course v72)

Scorecards (9) and (10) were reviewed together without double-counting: 87 distinct journeys and 22 completions, all Current model. All ten fresh holes remain available. A new “Player discoveries · 4 holes” group retains SAVING → PARROT, SUNSET → PONY, STREAMLINE → RANK and TEMPERATURE → SEW. Each has a specific verified par-or-better route and no direct opening finish in all three models; endpoint hub values are zero. The group is sourced from `data/player-discoveries.json` and remains separate from the original fresh course and regular holes. The report `reports/scorecards-9-10-review.md` records retention decisions, threshold evidence and skill-calibration concerns, including singular/plural benchmark bias and generic benchmark words. All eleven qualifying small setups in the submitted data had zero added connection cost. No scoring or threshold changes; the v71 fairway-only pattern fix is retained.

## Five-hole rounds and two test courses (course v73)

Course A and Course B each contain five new, manually curated holes from `data/five-hole-courses.json`. Each has a satisfying verified route within par 3 in Current, ABTT and LS using their existing defaults; none permits a direct opening finish in any model. All twenty endpoints have zero measured hub surcharge. Detailed route validation remains in the ignored local `reports/llm-route-review/five-hole-test-course-validation.json` to preserve blind play. Existing individual holes remain available.

Start either course from FIVE-HOLE COURSES. A card lists all five word pairs immediately, highlights the current hole and progressively fills each best result and attempts used. The game header shows only the word pair and “Hole N of 5”. A hole has at most five attempts, retaining its best result across later misses: birdie −1, par Even, unfinished but reaching halfway +1, otherwise +2. Players can retry after a success or move on early, and can leave a retry after an earlier success using NEXT HOLE on the live card. An unsupported/current word consumes no attempt. After the fifth failed attempt there is no sixth automatic retry; the result card offers NEXT HOLE or FINISH ROUND. Direct opening finishes are excluded, and the course scoring has no eagle/hole-in-one category.

The dashed halfway arc uses the same curved/root-distorted map coordinates as the word lies. Each hole freezes its initial arrival fraction, and only the furthest successful landing counts; a far missed proposal does not count and backtracking cannot erase earlier progress. Changing viewport size does not change the saved bogey assessment. The fairway-only mowing pattern is retained.

Skill is computed in the background with the existing v4 path assessment and suppressed in course play, including the lower scorecard skill panel. Overall skill is revealed only after locking all five holes, as an equal-weight mean of the five retained paths. Golf result selects the path first; higher path skill breaks ties between successful paths with the same result. Unfinished holes retain their furthest valid attempt and multiply that partial path's quality by its displayed progress; no valid landing contributes zero. Misses are stripped from partial path assessment, prior attempts are excluded, and the small-setup exemption remains. The final percentage waits for all relevant assessments and keeps reserved space. This remains a vector-model estimate with the previously documented word-family/generic-benchmark limitations.

`course-round.mjs` stores independent round history under `word-golf-courses-v1`, with a fixed model per round, per-hole challenge IDs, settings, every attempted path, progress and background assessments. Refresh resumes the active hole, capped result or finished round. Stale worker responses cannot attach to a different attempt. Download all scorecards retains the existing journeys and adds `course_rounds`, including per-hole results, attempts, final score, overall skill and aggregation version. Scorecard reset/recovery also resets/restores course history. Storage failures surface a warning while allowing play.

Regression tests cover best-score retention, five-attempt limits, all four results, valid/failed/backtracked progress, skill ties and completion weighting, reload, stale responses, exports/reset/recovery and storage failure. Browser QA completed both courses, preserving a birdie through four later failures, testing both bogey and double bogey, a par route, free unsupported input, mid-round and completed-round refresh, return to individual practice, and mobile typing with unchanged map width. Actual browser download was checked: Course A −2 / 74.8%, Course B −2 / 79.6%, all five results and every attempt exported correctly. Mobile/desktop visual checks verify the card and no horizontal overflow. Scoring thresholds, models and existing skill v4 are unchanged.

### V74: borderline plural rescue

New games check supported words formed by adding/removing S or ES only when contact or automatic finish falls short by at most 0.02. Pair similarity must exceed 0.65 in the selected model. A qualifying alternative must pass the complete shot calculation; water hits are not rescued. The entered word stays visible, with `scoring_word` recorded for analysis. No notice or extra shot is added. Existing successes and historical saved games retain their outcomes; new saves record `plural_rescue` for deterministic replay and skill caching. Opening bridge previews include rescued shots.

Regression coverage includes both suffix directions, strict similarity and shortfall limits, chip finishes, water, real BAMBOO → DRUM → MELODY, and saved-game replay. Global thresholds and course selection are unchanged.

### V75: individual waypoint-hole trial

Three individual holes are listed under “Waypoint trials”: PENGUIN → LIBRARY → GALAXY (par 4), PENCIL → FOREST → ORCHESTRA (par 5), and COAL → WEDDING → TELESCOPE (par 4). These are not part of the five-hole courses. Attempts are unlimited and par is advisory during the trial: connected safe shots may continue beyond par, while any miss or water hit restarts the entire hole.

The first target is a mandatory fairway zone with its own 0.27 threshold. Entering it changes the target to the final flag, resets the second-leg baseline to the entry word, and keeps the actual entry word as the lie. It adds no shot and no automatic move to the waypoint word. The final word is unavailable until the waypoint has been reached. The ordinary chip/putt finish applies on the second leg.

A narrowed dogleg, shaded first landing zone, persistent final flag, fading transition, and changing guidance communicate the two legs. Each recorded shot stores its leg, target, baseline and threshold, preserving map anchors across the target change. Saved games replay both legs; failed second-leg ghosts use the original leg geometry. Trial result cards show shots and attempts; the single-target skill metric is deliberately not shown.

Verified routes and browser testing cover both legs, mobile input width, midway refresh, first/second-leg failure, unrestricted retries, and successful par-4/par-5 play. Existing courses and thresholds are unchanged.

### V76: waypoint retry positions and longer-hole artwork

After a miss on an individual waypoint trial, “Tap a reached word to retry from there” makes the tee and the previous attempt’s successful labels selectable. Selecting a lie replays the successful prefix into the new attempt; every preceding shot remains counted. The waypoint/final target and new baseline are restored by replay, rather than by moving a ball without its history. Assumed shots carry `assumed` flags, `resumed_from` provenance and source-journey references in the JSON export; the copied scorecard marks carried-forward shots too. This practice feature does not change five-hole course scoring. Typing a new word dismisses the previous labels as before.

Waypoint holes use 80% ball, flag, mowing stripe and tree scale, with unchanged label text size. Tee markers are smaller and closer, with both kept clear of the lake’s rough. Greens are 184 units tall (previously 318), placed lower for an upward bend and higher for a downward bend. Both dogleg directions are included in the three trial holes. The waypoint ellipse and fixed map label are removed after reaching it. If the waypoint word was actually played, its ordinary shot label remains. The centreline uses connected cubic curves with a shared tangent at the bend; bunkers and lake reuse the standard scorecard textures and shore treatment. A bunker on the approach side and an opposing tree cluster frame the bend; a second bunker sits above the green, clear of the fringe (mirrored on the opposite dogleg). Extra trees occupy the surrounding rough, which wraps closely behind the green. The tee-side fairway contour blends smoothly into the lake bank instead of meeting its rough margin at an angle. The chip guide is clipped before the green, with no arc behind it.

Validated on mobile and desktop, including a retry from the third successful shot, refresh after a retry, tee restarts, exact counted shots and saved replay. The player’s BOOK → ATLAS, STICK → FIRE → PIT, and TRAIN → WEDDING → PHOTO routes still complete.

### V77: bunker nestled into the green

The waypoint greenside bunker now sits against a shallow recess in the green’s contour and matching fringe. The green is 12% narrower, trimmed from its front edge while retaining the back edge. The recess mirrors with the dogleg and leaves the flag on the usable green. Trees behind the green form staggered clusters with gaps, rather than an evenly spaced row. Groves sit closer to the fairway edge, with additional small clusters along the approach. Ordinary two-word greens are unchanged. Checked at desktop and mobile widths in both orientations.

### V78: slightly wider plural allowance

New games rescue close S/ES singular/plural contact or finishing shortfalls up to 0.025 (previously 0.02), still requiring pair similarity above 0.65 and a fully successful alternative shot. This covers WEDDING → PHOTOS on the COAL → WEDDING → TELESCOPE trial. Saved games retain their original allowance for consistent replay; skill and bridge calculations use the same recorded allowance.

### V79: create your own waypoint trials

The hole creator accepts an optional middle waypoint. Three-word custom holes use the dogleg map, mandatory waypoint zone, advisory par five, unlimited attempts, and counted-prefix retries. Leaving the waypoint blank creates a regular two-word hole. Preview shows both legs’ word separation; custom waypoint holes are retained in scorecards and restored after refresh.

### V80: fifteen fresh waypoint tests

Added a separate “New waypoint tests · 15 holes” dropdown group. All 45 tee/waypoint/hole words are new to the retained level catalogue, with alternating dogleg directions, advisory par four/five and unlimited attempts. Each has a verified route through the mandatory waypoint to the final flag; routes are kept in test fixtures rather than revealed in the interface. The shot entry now says “Play your first word” at the tee and “Play your next word” elsewhere, including retries and reloads.

### V81: reversible focus after a miss

Focusing the shot field temporarily hides previous-attempt labels, dots, range and retry guidance without deleting them or saving dismissal. Blurring an untouched empty field restores the same elements and retry targets in their original positions. Typing a word or choosing a retry point still commits to the new attempt and dismisses the old hints.

### V82: more varied course scenery

Waypoint bunkers use distinct kidney and scalloped profiles rather than a shared rotated outline. Two additional bunker profiles are also available to ordinary holes. Downward doglegs have their own tee/bend/green positions, fairway proportions and shoreline; they are no longer exact reflections. A third centreline anchor follows the landing area after the bend. The longer shoreline, masked cart paths and larger tree clusters fill outer rough while preserving mowing patterns and shot rules.

### V83: waypoint placement and course drawing corrections

Shots that reach the mandatory waypoint land at its map anchor, including FREESTYLE when the BUTTERFLY → SWIMMING starting cosine already exceeds the waypoint threshold. Retry guidance appears only with successful earlier shots; a previous waypoint entry replaces the static waypoint label during retry selection. The centre trace uses two smooth curves through the waypoint centre. Through paths follow the outer cut without hairpins, lake coves fill more of the inner rough, and simpler bunkers align beside the green with irregular tree clusters.

### V84: natural waypoint landings and terrain clearance

Waypoint cutoff remains 0.27. Reached shots vary within the ellipse according to their recorded target connection instead of snapping to its centre. An occupied retry waypoint has no shading. The tee label focuses the shot field even after a first-shot miss, without showing irrelevant retry guidance. Simple sand profiles replace lobed bunkers; edge bunkers straddle cuts, and tree placement checks the actual cart-path geometry to keep canopies clear of its centre.

### V85: contour-aware bunkers and closer path planting

Asymmetric sand profiles hug two recesses in the green. The surrounding fairway is a single smooth closed spline, including behind the green. Paired trees sit just beside the cart path while its clearance check keeps their trunks off it. Tapping any retry point restores its counted prefix and opens the shot field; the tee/current lie also opens entry directly.

### V86: coherent green and sand layers

A shared outer collar joins the green and its two greenside bunkers. Sand banks and putting edges retain a measured small turf gap, so their outlines do not touch or paint over one another. Fairway connects only at the front; rough surrounds the sides and back. Broad authored curves replace the interpolated fairway boundary, avoiding the previous ripples and pointed joins.


### V87: progressive exact-vector loading

New play uses only the Current model. Archived model metadata and exact historical replay remain available internally; saved alternate-model rounds are retained while a fresh Current round starts.

The map starts with a 312-word level-endpoint seed (173 KB compressed), the vocabulary index and hub data. It does not wait for the common-word starter. A background queue then loads the most frequent 5,000 words (excluding already seeded rows), followed by disjoint packs of 2,000 remaining words. These are the same float16 rows as before, with the same indices and scores. The complete cold transfer remains about 13.9 MB of compressed vectors; this change reduces the download required before play, rather than reducing model precision.

An uncached shot fetches missing exact rows via HTTP Range (600 bytes per word), including supported singular/plural variants. A server without Range support falls back to the containing verified pack. Foreground row requests run independently of background packs. Network failures do not consume a shot. Bridge enumeration, route review and skill analysis wait for the complete vocabulary. Pack byte lengths and SHA-256 hashes are checked, and unready rows cannot silently score as zero.

Content-hashed packs and individual rows persist in CacheStorage. A complete Current model cached by earlier releases is reused in the background without downloading the packs again. No ABTT or LS files are requested during normal play. Generate packs with `.venv/bin/python scripts/build_pages.py`; the frequency order uses the existing wordfreq dependency. `tests/test_progressive.mjs` checks exact reconstruction, startup size, concurrency, slow downloads, range fallback, corrupted data, cache reuse, unchanged waypoint scoring and failure without a consumed shot.


### V88: stroke play, curated eagles and reversible retries

New holes use `stroke-play-v1`: par 3 allows 6 attempts and 5 strokes per attempt, par 4 allows 12 attempts and 7 strokes, and par 5 allows 18 attempts and 8 strokes. A miss or backward hit ends the attempt immediately. The final allowed stroke can still be played; an unfinished attempt records double bogey on par 3 or triple bogey on par 4/5. Earlier failures cannot overwrite a better finish. Five-hole rounds retain each hole's par and waypoint; score comes first and attempts break ties. Old challenge versions and course scorecards retain their original scoring. New rules tee up an older active hole afresh while preserving its logs.

Skill is hidden and no new skill assessments run during play. Historical skill data stays in saved exports. New course exports include the total attempts used and `ranking_order: score-then-attempts`, ready for a later server leaderboard; no population percentile is invented locally.

`data/golden-paths.json` is an initial editorial LLM selection covering 28 holes, including both five-hole courses and selected waypoint holes. Each par 3 route contains one nominated word; each par 4 route contains two, including a successful waypoint entry. The exact entered words must match and all normal contact, safety, waypoint and finishing-range checks must pass. Only the additional finishing stroke is removed. Par 5 has no curated bonus. No words are blocked and no runtime LLM is used. Vector-checked candidates without a satisfying editorial link are left as ordinary holes; future curation can extend the data file.

Curated eagle animation flies into the actual green and rolls into the cup along one continuous ground trajectory. Height reaches zero smoothly at touchdown, with no angular turn towards the hole. The landing point is calculated against the same green outline used by the map; final word labels use that point. Par 3 artwork has a narrower tee fairway, a narrower middle widening into smooth top and bottom green shoulders, with rough behind the green, and a 222-unit-high green with unchanged width. Bunkers sit at roughly 11, 4 and 7 o’clock beside matching smooth indentations; sampled outlines maintain a turf gap between sand and green edge lines. A gently curved dotted centre trace follows the fairway before easing towards the variable flag. The wider tee contains both markers comfortably, with a visibly narrower middle and the mid-hole bunker straddling its edge. A curved south-side cart path follows the actual fairway boundary with seed-varied tree counts, sizes and spacing; sampled path points remain out of both fairway and lake, and canopy checks keep trees off paths and sand. The lake return matches the shore tangent, and the neighbouring hole’s road is offset from its boundary so it cannot cross the fairway exposed beneath results. Mowing patterns remain confined to fairway/green.

Tapping a tee or previously reached word previews a retry, retaining the prefix strokes. Playing a valid attempt word commits the new attempt and archives any abandoned live attempt. Tapping away restores the original state and spends nothing, including when text was entered but no shot played. Unknown words and failed downloads do not commit retries.

Saved current-rule holes now draw from recorded map data before fetching scoring rows; input stays disabled until exact replay is ready. Chip-in range starts off on every page load, regardless of old browser preferences. The toggle only applies during the current visit; the existing short-shot feedback can still reveal range during play.

Validation includes the progressive-loader display-without-fetch check, all curated real-vector routes and their exact replays, per-par final-shot caps, prefix retry/cancellation, mixed-par five-hole rounds, retained best scores, tie handling and smooth golden-shot motion. Mobile UI checks cover an ace, an eagle, reversible retry, refresh defaults and exhausting six attempts without losing another hole's best score.


### V89: rough around the par 3 green

The par 3 fairway ends in a rounded front approach at the foremost greenside bunker line. Its complete outline is bounded by that line: no mowing extends alongside, above, below or behind the green. The green and all three greenside bunkers sit in continuous rough. The narrowed middle, wider tee, edge bunker, curved trace, path, varied tree clusters and scoring changes from V88 remain. Geometry tests check the complete fairway outline against the bunker cutoff.


### V90: early fairway waist and a connected front approach

The par 3 tee is slightly wider than its markers, then narrows rapidly to its minimum width at 32% of the tee-to-flag distance. The approach broadens to embrace the front greenside bunkers and merge under the front of the green, replacing V89's blunt stop. Mowing ends inside the front half of the green, leaving the sides and back in rough. A small morphological closing softens fairway joins beneath the painted green/bunker edges without changing their sand outlines. The header places the hole words above one baseline-aligned row for par and Attempt 1 of 6. Tests measure the early minimum, tee clearance and widening front approach on phone and desktop layouts.

V90 also resumes a missed attempt at its last landed lie, carrying the prefix shots into the next attempt; earlier words remain tappable. Retry guidance omits cancellation instructions. Par-3 shot offsets are 20% smaller. Dogleg labels near the outside corner prefer the inward side while retaining readable existing placements. Final-leg display baselines reserve approach space when a waypoint entry is already inside chip range; shot/guide projection share this scale while scoring remains unchanged. Word reuse is drawn using each event's leg, and unused waypoint words stay available on the final leg.

V91 puts PAR and TRY on two compact right-aligned lines beside the retained hole title, with a regular-weight attempt count. A retry preview can switch directly to another earlier lie without cancelling or increasing the pending attempt number; tapping away still restores the original attempt. The departure lie dot appears when successful ball movement begins, including the opening tee shot.

V92 uses a compact HOLE n (PAR n) header with ATTEMPT above the regular-weight count on the right. The current lie and active target have dark green labels with a quiet halo; inactive waypoint/hole words use the standard labels. Newly started waypoint holes check the final target's finish range immediately on waypoint entry and, if qualified, add the ordinary automatic finishing stroke after the target-change pause. This allows a two-stroke albatross on par 5 without bypassing the waypoint. The finishing requirement uses the final target similarity rather than waypoint similarity, and the ball chips from its actual waypoint lie. Existing scorecards retain their old finish rule for exact replay; restarting a hole adopts the new rule.

V93 aligns the hole title and single-line ATTEMPT n of n display on one text baseline, using the existing count size for both attempt label and count. Completed holes highlight both tee and final hole words. BEST shows the golf result with its relative score, including Par (EVEN), Birdie (-1), and Bogey (+1). Result-card buttons have seven additional pixels of bottom padding above the inner border.

V94 retains landed-word retry actions while typing, handles word selection on pointer-down before focus can be lost, and resolves overlapping generous label/lie-dot tap targets by proximity to their visible cores. Hit targets use at least 44 screen pixels independent of SVG scale. Retry switching preserves the focused editable input and briefly rejects edits while restoring the selected prefix. Solid label borders replace dotted retry borders. The header is inset six pixels, attempt text grows one pixel, and its gap narrows. Mobile keyboard layout ignores non-unit visual-viewport scale; pinch gestures over the active map are suppressed without restricting page zoom elsewhere.

V95 widens the par-3 tee and middle fairway by about 15%, with staggered edge turns and an asymmetric approach that blends into the existing green. Small deterministic tree clusters overlap the fairway edge while retaining clearance from sand, paths, lake and putting surface. Attempt counts use medium weight. Gameplay/scoring and mowing-stripe direction are unchanged.

V95 also makes retry selection/cancellation synchronous using only already-loaded played words, removes blur-triggered state restoration, and selects on pointer-up so a drag or a second finger cancels selection. Visible text has priority over enlarged marker targets. Labels from the candidate route remain available while choosing a retry lie, and lie markers reserve ball clearance so moving the active ball does not unnecessarily repack the text.

V96 places result cards side by side above the extended landscape on screens at least 960px wide: the round companion is 60% of the current-hole card's width. Individual play shows a recent-practice scorecard grouped by challenge, so retries do not become extra holes. Narrow layouts retain the existing stack. The extended landscape reuses the actual hole artwork and lake geometry (including reflected doglegs), adds clipped water ripples, and rounds the neighbouring fairway's top turn.

V97: Tapping back to the original current lie cancels an uncommitted retry and restores the original attempt count, route, and entry without recording another attempt.

V98 returns desktop results to the same centred card arrangement as mobile, with the course scorecard below when playing a round. The improved continuous landscape remains. Lake highlights are scattered with varied lengths, curvature, opacity and occasional paired strokes instead of repeated identical marks.
Result action labels are slightly larger with a four-pixel wider gap, while retaining their existing button dimensions.

V99 places par-3 tees at either 40% or 60% of the map height, stable for each hole. The fairway, path, lie projection and centre trace follow the shifted tee; green and cup placement remain unchanged.

V100 selects automatic putt/chip animation and its map trace from the ball’s actual position on the drawn green, fixing CACTUS → PRICK → NEEDLE → BLOOD without altering scores. Completed waypoint holes retain an unplayed waypoint as a faded green reference label, with no lie dot or shot connector.

V101 follows the final-leg fairway midpoint with the centre trace and lie projection, retaining semantic distance-to-cup mapping with less lateral spread. Played waypoint labels receive full green styling at completion. Replay retains the complete last successful route for prefix retries; custom holes are recovered into a persistent local dropdown. End cards omit repeated maximum-score/MISS prefixes, and mobile header typography and spacing remain consistent during entry. RADIO → SONAR is checked against the same rules with or without its earlier first-leg use; its long-shot contact remains insufficient under the current thresholds.
Eight additional player-created waypoint layouts from scorecard exports 12 and 13 are retained in the public dropdown, including both ROSES/NOTES/NOSES orders. They are saved test layouts rather than new curated eagle routes.

V102 keeps 11 additional waypoint layouts from scorecards 14 (19 player-created layouts total). New games replace same-leg repeat shots with a no-cost prompt to tap the earlier lie, and no longer exempt earlier words from the backward boundary. Cross-leg word reuse remains valid. Historical saves retain their original rule. No numerical thresholds or par defaults change. See reports/scorecards-14-review.md for attempt statistics and route-refinement observations.

V103 corrects the V102 interpretation: earlier words can be typed and are scored as ordinary shots, including normal contact and backward/recovery rules. Only the special backward exemption is removed; there is no same-leg word block or no-cost retry prompt. Cross-leg reuse and tap-to-retry remain unchanged.

V104 estimates par 4/5 for a custom waypoint hole in the background, with an automatic suggestion and manual override. A bounded beam explores at most four manual shots using exact current game/plural/waypoint/automatic-finish rules. It favours several distinct opening families with comfortable contact margins, not the single shortest path: at least two openings with a ≤3-stroke route and ≥0.06 contact surplus, or three openings with a ≤4-stroke route and ≥0.08 surplus, suggest par 4; otherwise par 5. These are estimator constants, not gameplay thresholds. The search is sampled and does not assess human semantic satisfaction. Route-row and UI-result caches keep repeat estimates fast.

Creation separately rejects either direct endpoint-word shot (tee → waypoint or waypoint → hole) using the actual game rules, reports which leg is too directly connected, and enforces this again inside the browser client’s creation operation. This check needs only the three endpoint vectors and does not wait for the full-model estimate. Existing saved/banked holes and their par values are unchanged.

V105 back-processes all 37 banked waypoint layouts with the custom-hole estimator: 21 par 4 and 16 par 5, with 16 changed. Source definitions and published config carry the same estimator metadata. Four existing direct-leg exceptions remain playable and are listed in reports/waypoint-par-backfill.md. Saved attempts keep their recorded par; the explicit Restart hole action adopts the latest bank par. Re-run scripts/backfill_waypoint_pars.mjs to recalculate the bank.

V106 removes BUTTERFLY → SWIMMING → MEDICINE, GLOVE → BASEBALL → BAKERY, LIGHTHOUSE → ASTRONOMY → CLASSROOM, and PASTEL → LEAFY → COVEN from bank sources, published options and curated routes. Retirement identities prevent scorecard/local-storage recovery from restoring those options. Historical scorecards remain intact; an active removed layout opens a fresh valid hole on reload. The remaining 33 waypoint holes are 17 par 4 and 16 par 5, and all pass direct-leg validation.

The same V106 update adds 20 wholly new waypoint layouts under New waypoint holes · 20, with alternating doglegs, estimator-assigned pars and a verified completing route for each. All endpoints are supported and both direct-leg checks pass.

V111 slightly widens waypoint acceptance (0.270 → 0.265) for fresh banked/custom holes; the final green and base launch settings stay unchanged. Historical attempts retain their recorded settings. Near-waypoint drawing now reserves ball clearance on both sides of the scoring boundary. Existing pars stay fixed for this small adjustment. Level selection must follow [LEVEL_DESIGN.md](LEVEL_DESIGN.md): favour recognisable, clever setups; a model-found route alone is not enough to approve a hole.


V157 replaces the map undo and attempts controls with one compact golf-bag menu: actual strokes, recorded best, scoring attempts remaining, Return to tee, Playing tips, and Hole log. Tap-to-retry and its initial session hint remain. Fresh attempts allow continuous exploration beyond the double-bogey scoring cap; the actual route is retained while competitive strokes cap at par + 2. Scoring budgets are 10/15/20 for par 3/4/5. After a final failed scoring attempt, play resumes at the last lie in practice without a modal; the best result remains frozen. The final three remaining-attempt reminders follow shot feedback after 1.5 seconds and cancel when the player resumes input. Historical saved routes retain their original stroke-limit behavior until a new attempt starts.

V158 moves the bag icon one pixel left, clarifies menu actions with dividers and chevrons, and opens Playing tips and Your best route in the existing scrolling map card. Tips explain stronger contact for longer shots and preserve small setup play. Best route follows the recorded scoring winner, including during practice. Return to tee remains clickable at the tee and simply closes the menu without changing the attempt or focusing entry.

V159 orders the bag actions Return to tee, Your best route, Hole log, Playing tips. Best route stays disabled until a successful hole-out; when only practice has been completed it can show that route without changing the recorded score. Tips put aiming before distance, describe a small step as a set up shot, and explain choosing either the dogleg word or an in-range word to prepare for the flag. The first Return to tee selection per session shows a tap-a-previous-lie reminder, with sessionStorage preventing repeats on reload.

V160 moves in-play Hole log, Playing tips and best-route cards over the hole, with internal scroll, a close button, and a lightly dimmed/blurred map backdrop. Mobile scenery grows only enough to frame the card. Backdrop taps dismiss without selecting a lie; map labels leave keyboard navigation while covered. Feedback messages and retry guidance fade out under menus/cards and return afterward. Results retain their scorecard layout, omit the embedded attempt log, and sit just below the lowest visible route label/tee marker; the completed course scene and its background lift together by up to 24 screen pixels after the final animation, bounded by label/flag/tee-marker clearance and respecting reduced motion. Course-scorecard selections own a single page-top scroll through the fade transition, while other entry and within-hole anchoring remain unchanged.

V161 increases completed-route clearance from 18 to 24 pixels and removes the typing-specific two-pixel bag offset. How to play replaces Playing tips with the expanded hitting, distance, setup, dogleg, attempt-budget table and scoring instructions; it does not auto-open on first visit yet. Scoring reminders no longer replace shot feedback on a timer: mobile entry shows the remaining-attempt/practice context and inactive play retains shot feedback. Desktop keeps a separate note below entry guidance. Each hole's first practice entry shows the recorded-score introduction once, tracked in local scorecard data; later entries/results use “Practice mode: best score already recorded”. Keyboard/viewport handlers remain intact; a body-class observer follows the existing entry state.

V162 consistently labels result retries TRY AGAIN and uses “Scoring attempts exhausted” in the hole footer. Exhaustion checks the course attempt history even when reviewing an earlier best, so practice retry no longer silently returns. Explicit result retries start at the tee, keep input inactive, and preserve the frozen best. Result/header next-hole controls and retries use an isolated page-top navigation scope, suppressing only their intermediate header anchors. The mobile completion handler now scrolls to page top instead of centring the entire map/results frame; ordinary shot entry/exit retains its existing header anchor.

V163 removes the idle mobile practice-notice fallback. Practice context appears only during active entry; inactive play retains previous-shot feedback. Desktop keeps its separate entry note. Notice-rendering regression checks cover all three states without changing focus or viewport handling.

V164 adds an isolated rolling-nine trial at `?mode=rolling`, with a five-column scorecard, daily 00:00 UTC publication queue, stable hole IDs, carried routes/bests and one +3 bonus per returning UTC day for previously attempted active holes. Initial allowances remain 10/15/20; exhaustion pauses competitive exploration. Submission snapshots default unfinished holes to double bogey for that day only and lock all nine holes until rollover. Retired-hole practice is unrestricted and prefers unseen holes. No leaderboard is included.

The trial uses its own local-storage namespace, with a separate simulator at `?mode=rolling&date=YYYY-MM-DD`; trial controls offer next-day stepping, a reset of simulation only and data export. Backward dates cannot duplicate bonuses or undo a submission; stale-tab writes are rejected and the UI reloads current saves. This is device-local exploration, not server-enforced competition. The frozen publication manifest covers 238 banked holes, including pre-launch retired practice holes; do not renumber or reorder its existing IDs. Future curation should append holes. Rolling assets load only in trial mode. The standard game retains its existing keyboard/viewport coordinator and shot rules. How to play's attempt table is now balanced and centred.

V174 balances the rolling publication queue programmatically: every consecutive daily nine totals par 35 or 36, with no adjacent par 3 holes. Individual definitions, pars and IDs stay unchanged. The starter nine is rebalanced; old routes remain in the bank and already-submitted daily snapshots retain their original nine holes. `node scripts/build_rolling_schedule.mjs` appends eligible holes without reordering the frozen queue. The current bank provides 131 valid daily courses; 90 additional definitions remain unreleased until suitable complementary holes are curated.

The daily Practice Holes/trial-controls panel and practice label now leave the compact mobile keyboard layout. A matched 390px-wide layout check with a 420px keyboard frame measured original scroll height 420px versus daily 1,019px before the fix, and 420px for both afterward, with identical input positions. The keyboard detection, height calculation and scroll coordinator are unchanged.

Fresh hole results show JUST NOW and the latest stroke result; revisiting shows only the best-result sections. Submitted holes remain available for read-only review with a Practice Holes action. Completing all nine changes the calendar banner to an inline Submit Now action. Help and log cards grow the scenery only when their content needs room, up to a viewport-based cap, with internal scrolling for longer content; short logs retain the original map height. The duplicate practice paragraph below entry guidance is removed.

V176 changes the rolling trial to three new holes and three retirements per UTC day, with each hole on the course for three days. The newest/retiring three carry NEW/LAST DAY badges. Eighteen curated holes (six of each par) arrive in six daily trios from 25–30 October 2026; the existing upcoming queue follows six days later in its original order. Daily totals remain 35–36 without consecutive par 3s. Hole IDs, banked routes, once-daily +3 bonuses and already-submitted snapshots are preserved. The queue currently supports 50 daily courses. `scripts/curate_daily_october25.mjs` records the one-time editorial insertion; verified semantic examples are in `reports/daily-discoveries-25-october.md` (spoilers). New layouts are also in the individual-hole dropdown. Twenty-two new endpoint rows are warmed in the initial seed without changing model vectors or invalidating later cached packs.

The bag moves to bottom-right, opening upward. Mobile focus retains the hidden help link's space until the actual keyboard layout activates, avoiding the measured 24px pre-keyboard daily-scorecard shift; lower daily panels also opt out of browser scroll anchoring. Native keyboard detection and viewport/scroll coordination are unchanged. Returning hole results use a centred HOLE n (PAR p) title; fresh results retain JUST NOW and the stroke result. Information/submission dialogs focus their headings, lock the background in place and restore its scroll position on dismissal, including handover between dialogs.

V177 adds a separate five-hole Daily Tour at `?mode=tour`, using the daily-nine scorecard design. Fixed UTC daily fives contain no repeated layouts across the prepared 26-day schedule (through 19 November 2026). `node scripts/build_tour_schedule.mjs` preserves existing daily assignments and appends from the curated bank. Tour progress is isolated under `word-golf.tour-live.`; `?mode=tour&date=YYYY-MM-DD` uses the separate `word-golf.tour-sim.` namespace.

Scoring attempts are unlimited. A new attempt counts only after a valid manual shot is committed, including a miss; assumed retry prefixes, opening another lie, empty attempts and unknown words do not count. Subsequent shots within that live attempt do not add attempts. Total attempts across the five holes provisionally select Pro Tour (0–24), Amateur Tour (25–49), or Social Tour (50+). The map and scorecard show qualification and remaining room in the current Tour. Before committing attempts 25 and 50, a neutral-focus dialog offers a scorecard review or explicit continuation into the next Tour. Canceled previews never spend an attempt; consent survives refresh without changing qualification until a shot is actually committed. The map count updates as soon as the scoring engine commits the shot, without rebuilding the map during flight.

Submission freezes five best stroke scores, the total attempt count, eagle count and Tour for that UTC day. Unfinished holes receive double bogey in the submitted snapshot without manufacturing an attempt or a completed route. Submitted routes remain viewable; earlier practice holes stay available and cannot include current/future Tour layouts. Par-5 golden overrides remain disabled. Engine serialization/restoration explicitly retains unlimited Tour attempts without altering older game modes or their limits.

Standings have separate Tour tabs and rank by raw strokes, then most eagles, then fewest total attempts, with shared places for exact ties. This trial's standings contain only scorecards submitted on this device; no fake opponents, shared leaderboard, account or server enforcement is claimed. The comparison function is independent of storage for a later server connection. Trial controls provide dated simulation and scorecard download for play analysis.

V178 adds an independent Competitive / Social five-hole trial at `?mode=competitive`, reusing the daily-five schedule and mechanics while retaining `?mode=tour` for comparison. Separate `word-golf.competitive-live.` and `word-golf.competitive-sim.` storage prevents cross-mode progress changes. Competitive includes attempts 0–25; committing attempt 26 moves the round permanently to Social for that UTC date. A pre-commit warning offers scorecard review instead. Assumed route prefixes and lie selection remain free; genuine attempts across all five holes count exactly as in the Tours trial.

The single official comparison table filters Competitive submissions only and ranks raw strokes, then eagles, then attempts, sharing ranks on exact ties. Social submission freezes the final improved score (not the score at attempt 25), displays its stroke/attempt totals, and calculates its hypothetical place against the Competitive field without inserting it. The prototype has device-local submissions only; with no available Competitive field it states that a placement is unavailable, rather than inventing other players or a global rank. Pure ranking functions accept a future shared field. Submission locking, UTC rollover, double-bogey defaults, retired practice and par-5 golden-route restrictions are unchanged. `tests/test_competitive_course.mjs` verifies classification, boundary consent, final-score snapshots, filtering and hypothetical tie-breaking.

V179 adds an expandable SEMANTIC ANALYSIS section to completed hole result cards. It reports separate maxima for strict 100-neighbour weakest-link distinctiveness and continuous balanced neighbourhood separation, plus a separate dogleg-landing comparison against legally reachable alternatives from the actual incoming lie. Every typed internal word is inspectable, including its neighbour table and affinity components; the unplayed dogleg is never inserted. The section analyses the current completed route, independently of the best stroke route, and explicitly says the percentages are experimental vector measures, not player percentiles. JSON downloads enable inspection without filling localStorage with neighbourhood lists. No gameplay, ball animation, stroke calculation, attempt counting or leaderboard logic is changed.

Calculations reuse the assessment worker, full existing model and bounded per-word/report caches. Analysis never enumerates complete routes; only the requested neighbourhoods and one-shot dogleg alternatives are evaluated. The UI suppresses stale responses on navigation and provides a retry on download/worker failures. Full formulas and limitations are in `reports/semantic-analysis/FORMULAS.md`; the six-route comparison is in `reports/semantic-analysis/BENCHMARK.md`. Generic routes also score highly on distinctiveness, so this experiment does not yet establish a reliable human-satisfaction measure.

### Standalone vector cleverness

The live results card shows experimental band-free vector cleverness after each completed attempt, alongside the previous harmonic score. A quality-scaled bonus applies once when any actual leg takes one stroke, within the existing ceiling.
Analysis runs asynchronously in a browser worker using the existing word vectors,
neighbourhood profiles and authoritative route history. No Python service,
WordNet lookup, LLM or scoring API is required. This works on GitHub Pages and
any ordinary static web server. Par 3 and dogleg holes are supported.
Expand the details to inspect components, prior completed attempts, and copy or
export results. Golf scoring is unchanged. See [implementation notes](VECTOR_CLEVERNESS.md).

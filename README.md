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

Default green similarity is **0.28**. Contact requirements range from **0.10 to 0.21**. Trip fraction is the absolute change in target similarity, clipping both positions at the green edge, divided by the original tee-to-green gap and capped at 1. Required contact is `0.10 + 0.11 * trip_fraction`. Finishing gets easier as you approach, without extra cost for landing deeper inside the green. All comparisons include `1e-7` tolerance.

A consistent small retreat of `0.01` is allowed. The lower safe boundary is anchored to the **best target similarity reached**, not the latest lie, so repeated tiny retreats cannot produce unlimited backward drift. A sufficiently connected shot back to any previously reached word bypasses water and resets this boundary to the revisited lie, enabling a new branch. Failed proposals do not qualify as previous lies. Outcomes are:

- **Miss:** contact below the required strength; ball stays still.
- **Water:** enough contact, but destination below the safe boundary; ball splashes into the pond and returns.
- **Recovery:** enough contact and within the safe boundary, but slightly behind the current lie; ball lands there.
- **Landed:** enough contact and safe forward or level movement.
- **Backtrack:** connected return to a previously reached word, without water.
- **Green:** safe successful shot at or beyond the green threshold; automatically finishes in one extra shot unless the word is the target itself.

Each supported guess counts as exactly one shot. Water adds no extra penalty. New states keep user shots in `history`, automatic finishes in `automatic_shots`, and their combined count in `attempts`. Scorecard entries include both user shots and the automatic finish. Scorecards retain every supported shot and every unscored rejected word. Normal play uses plain golf feedback; exact similarities, including negative target similarities, remain available in **Course settings** and exported scorecards.

New holes use `golf-distance-v2`, or `golf-fixed-v2` in fixed mode. Existing fixed/distance rule versions remain supported for exact historical replay. On first load of this release, older active rounds are archived unchanged and the same endpoints tee off with the golf rules. All earlier scorecards remain selectable. The unchanged `escape-velocity.flight-log.v1` storage key preserves prior playtests; JSON exports retain their original field names for compatibility.

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

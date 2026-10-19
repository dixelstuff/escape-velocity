# WORD GOLF ⛳

A browser word-golf game using actual Stanford GloVe 6B 300-dimensional vectors. Connect your next word to the ball word and aim closer to the hole. Reach the putting green to finish. Every supported guess counts as one shot, including misses and water balls; unknown words and your current lie cost nothing. Originally prototyped as Escape Velocity; the existing Pages URL and saved scorecards are preserved.

## Play online

[Play Word Golf on GitHub Pages](https://dixelstuff.github.io/escape-velocity/). The public version calculates cosine similarities entirely in your browser. It downloads the curated 24 MB float32 model once; ordinary browser caching reuses unchanged files on later visits. No account, API key, or running Python server is needed. The original 822 MiB GloVe archive is never sent to players.

## Run

Python 3.11+ recommended. From the repository directory:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/prepare.py
python scripts/analyze_forward.py
python scripts/build_pages.py
python scripts/browser_fixtures.py
python server.py
```

Open **http://localhost:8000**. If this workspace has already been prepared, just run `.venv/bin/python server.py`. Use `--port 8001` if necessary. The server binds to localhost. No API keys, cloud model, Node build, or GPU are required.

First preparation downloads the official 822 MiB GloVe archive and the roughly 10 MiB WordNet corpus. Allow about 1.5 GiB of free disk space including Python packages and intermediate graph calculations. Preparation streams `glove.6B.300d.txt` directly from the archive rather than writing an additional ~1 GiB text copy. The original archive is retained for offline use. Generated data and the virtual environment are ignored by Git; repeat preparation on another machine.

## Play

Choose a hole, enter a word, and press **Hit shot** or Enter. **Make your own hole** accepts any two supported, different words for the tee and flag. The literal hole word is a normal, scored shot: too weak a connection misses; a strong enough connection finishes. No extra putt is required after entering the green.

The current ball is a shaded, dimpled SVG golf ball on a mown fairway. Previous lies are small markers, and measured labels use leader lines and collision avoidance. A pond shows the destination of out-of-bounds backward shots. Misses leave the ball still; water shots animate into the pond, splash, and return to the same lie. A completion banner appears over the map and brings the green into view. Semantic horizontal position stays fixed; height is only for readability. Resizing never changes scoring.

Default green similarity is **0.25**. Contact requirements range from **0.09 to 0.19**. Trip fraction is the absolute change in target similarity, clipping both positions at the green edge, divided by the original tee-to-green gap and capped at 1. Required contact is `0.09 + 0.10 * trip_fraction`. Finishing gets easier as you approach, without extra cost for landing deeper inside the green. All comparisons include `1e-7` tolerance.

A small retreat is allowed: `max(0, min(0.01, 0.05 * (green_threshold - tee_target_similarity)))`. The lower safe boundary is anchored to the **best target similarity reached**, not the latest lie, so repeated tiny retreats cannot produce unlimited backward drift. Outcomes are:

- **Miss:** contact below the required strength; ball stays still.
- **Water:** enough contact, but destination below the safe boundary; ball splashes into the pond and returns.
- **Recovery:** enough contact and within the safe boundary, but slightly behind the current lie; ball lands there.
- **Landed:** enough contact and safe forward or level movement.
- **Green:** safe successful shot at or beyond the green threshold; hole complete.

Each supported guess counts as exactly one shot. Water adds no extra penalty. Scorecards retain every supported shot and every unscored rejected word. Normal play uses plain golf feedback; exact similarities, including negative target similarities, remain available in **Course settings** and exported scorecards.

New holes use `golf-distance-v1`, or `golf-fixed-v1` in fixed mode. Existing fixed/distance rule versions remain supported for exact historical replay. On first load of this release, older active rounds are archived unchanged and the same endpoints tee off with the golf rules. All earlier scorecards remain selectable. The unchanged `escape-velocity.flight-log.v1` storage key preserves prior playtests; JSON exports retain their original field names for compatibility.

COFFEE → SCIENCE opens the course. On mobile, 16px inputs avoid focus zoom, and a compact map-and-input view follows `visualViewport` above the keyboard. Hitting a shot dismisses the keyboard. Pinch zoom and reduced-motion preferences remain supported. Real iOS/Android keyboards still need device playtesting.

## Data and vocabulary

- [Stanford GloVe](https://nlp.stanford.edu/projects/glove/): Wikipedia 2014 + Gigaword 5, 6B tokens, 400,000 uncased entries. We use the original **300d** model, not newer 2024 models. Pretrained data is offered under the [PDDL](https://opendatacommons.org/licenses/pddl/1-0/).
- [wordfreq 3.1.1](https://github.com/rspeer/wordfreq): English frequency rank and Zipf scores, combining multiple text sources. Code is Apache 2.0; included frequency data is CC BY-SA 4.0, as described upstream. It ranks candidates rather than contributing similarity scores.
- [Princeton WordNet](https://wordnet.princeton.edu/), downloaded from the [NLTK data mirror](https://github.com/nltk/nltk_data): lowercase single-word dictionary lemmas help filter punctuation, phrases, names, and inflections. See the `wordnet/LICENSE` member of the retained archive for terms.

`prepare.py` intersects the top 150,000 English frequency tokens with lowercase WordNet lemmas of 3–18 ASCII letters, requires a Zipf score of at least 2.5, removes an explicit common-name/unsuitable-token list, and removes simple regular plurals and participles only if a more frequent base is available. It then keeps up to 20,000 candidates and drops entries absent from GloVe. This is a reproducible heuristic, not a perfect dictionary or content filter; editorial review remains useful before public release. The actual retained count and sources are in `data/metadata.json`.

Every retained 300d vector is normalized to unit length and stored as float32 in a NumPy array. The Python tools memory-map it for offline experiments. `scripts/build_pages.py` exports the same normalized values as a little-endian float32 binary for the browser, preserving full precision without quantization. `static/engine.mjs` calculates arbitrary supported word-pair dot products in the browser, and owns the same rules as `engine.py`. Only the curated model is published, never the full archive or graph. JavaScript and NumPy summation can differ at floating-point rounding scale; parity tests compare scores within 1e-6 and assert identical outcomes for all selected puzzles.

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
```

To preview the standalone public version locally without the Python API:

```sh
python3 -m http.server 8001 --bind 127.0.0.1 --directory static
```

The original Python API remains available for experiments. The UI uses the browser engine on both local and published sites. No word submissions leave the browser.

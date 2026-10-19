# ESCAPE VELOCITY 🚀

A local browser word game using actual Stanford GloVe 6B 300-dimensional vectors. Jump between words with related meanings, then land in the target's arrival zone to finish. Every supported submission counts, including retries and failed launches. Entering your current word costs nothing.

## Play online

[Play Escape Velocity on GitHub Pages](https://dixelstuff.github.io/escape-velocity/). The public version calculates cosine similarities entirely in your browser. It downloads the curated 24 MB float32 model once; ordinary browser caching reuses unchanged files on later visits. No account, API key, or running Python server is needed. The original 822 MiB GloVe archive is never sent to players.

## Run

Python 3.11+ recommended. From the repository directory:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/prepare.py
python scripts/analyze.py
python scripts/analyze_distance.py
python scripts/build_pages.py
python scripts/browser_fixtures.py
python server.py
```

Open **http://localhost:8000**. If this workspace has already been prepared, just run `.venv/bin/python server.py`. Use `--port 8001` if necessary. The server binds to localhost. No API keys, cloud model, Node build, or GPU are required.

First preparation downloads the official 822 MiB GloVe archive and the roughly 10 MiB WordNet corpus. Allow about 1.5 GiB of free disk space including Python packages and intermediate graph calculations. Preparation streams `glove.6B.300d.txt` directly from the archive rather than writing an additional ~1 GiB text copy. The original archive is retained for offline use. Generated data and the virtual environment are ignored by Git; repeat preparation on another machine.

## Play

Choose a journey, enter a word, and press Launch or Enter. Destination position measures similarity to the target. Launch similarity must meet a requirement that grows with trip length. Backward guesses cost an attempt, leave the rocket in place, and appear only in the flight log. Failed forward launches leave faint markers at stable positions; these disappear when you pass them. Unknown words and your current word cost nothing. An unreached forward word can be retried from a different planet. Reach any word inside the arrival zone to win immediately.

The arrival zone is centred on the target circle, extending equally far to its left and right, and slightly wider than the previous version. The rocket finishes on the qualifying word. Height separates attempted words and has no semantic meaning. Default arrival is 0.25; distance launch requirements range from 0.08 to 0.18. Boundaries are inclusive with a `1e-7` floating-point tolerance, including equal-progress moves. Map resizing never changes scores. Successful route planets remain visible as a trail; failed backward guesses never get markers or flight animations.

Open **Flight lab** to inspect exact cosine readings, choose distance or fixed launch mode, adjust arrival and short/long-hop requirements, and choose arbitrary supported endpoints. Applying settings restarts the puzzle. The route tester submits comma-separated intermediate words through the same animated and scored game flow. Optimal routes are deliberately excluded from browser configuration.

## Launch experiment and saved journeys

In distance mode, trip length is the absolute change in target cosine (clipping both positions at the arrival threshold) divided by the original start-to-arrival gap, capped at 1. Required launch cosine is `0.08 + 0.10 * trip_length`. A backward destination cannot succeed even if launch similarity is sufficient. The required value is shown after each attempt and saved in Flight log. A one-attempt victory requires at least 0.18 launch similarity.

New menu journeys use `distance-v3`; new fixed journeys use `fixed-threshold-v3`. Both allow only forward movement. Older rule versions remain supported for accurate historical replay. On first load after this update, an older active journey (including the previous 0.12 arrival and 0.30 / 0.12–0.30 defaults) is archived unchanged and a fresh journey with the same endpoints starts at the new defaults. All previous attempts remain selectable in Flight log.

COFFEE → SCIENCE is now the opening journey. FOREST → MONEY remains available for comparison. On mobile, inputs are at least 16px to avoid focus zoom, submitting dismisses the keyboard, and flights do not automatically refocus the input. Intentional pinch zoom and reduced-motion support remain available. Actual iOS focus behaviour still benefits from device playtesting.

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

The current menu retains familiar thematic puzzles while making stepping-stone play easier. Distinct optimal routes and opening moves are reported for review; this does not prove that typical human journeys take 2–4 attempts. Running the original `analyze.py` regenerates its fixed-mode puzzle selection; run `analyze_distance.py` afterwards to restore the current menu before building browser data.

To evaluate a specific route without the UI (last word is the target; intermediate words are submissions):

```sh
.venv/bin/python scripts/analyze.py --mode distance --threshold 0.45 --route coffee food medical science
```

Current menu routes are verified with `.venv/bin/python scripts/analyze_forward.py`; results are in `reports/forward-analysis.json` (spoilers). Earlier calibration reports describe historical settings.

Tests cover normalization, cosine symmetry, meaningful real-vector comparisons, launch failure, boundary failure, forward-only movement, historical backward travel, retries, retry scoring, current-word/unknown rejection, legacy rule restoration, variable launch requirements, inclusive thresholds, attempt counting, automatic victory, and every selected puzzle's optimal route.

## Files and prototype limits

- `engine.py`: semantic scoring and game rules.
- `server.py`: static files and `/api/config`, `/api/new`, `/api/submit`; independent in-memory browser sessions.
- `static/`: responsive plain HTML/CSS/JavaScript, browser scoring, curated vectors, SVG planets, rocket animations, reduced-motion support, and debug controls.
- `scripts/prepare.py`: download and normalize real embeddings.
- `scripts/analyze.py`: original fixed-threshold graph search and calibration.
- `scripts/analyze_distance.py`: target-dependent graph search and current puzzle selection.

Browser journeys and every submission are saved in local storage; reloads resume the active journey. A resume message identifies it, and **Play opening journey** starts COFFEE → SCIENCE without deleting earlier logs. Only an untouched original FOREST → MONEY default is automatically replaced with the new opening. The config revalidates on load, while the 24 MB vectors retain normal browser caching. The ARRIVAL V3 footer identifies this release. The rocket and filled planet mark your current position without an extra label. Switching puzzles or restarting archives earlier journeys in the Flight log. Copy a journey as readable text or download all logs as JSON. Logs include rejected words without charging attempts, failures, successes, timestamps, thresholds, and both cosine readings. Browser storage stays on the same device and can be removed by clearing site data; download logs for a backup. If storage fails, a visible message asks you to download before leaving. Earlier plays from before flight logging was added cannot be recovered. Python API sessions reset when the server restarts. This prototype uses fixed-scale map framing rather than a moving camera. It is a local playtest tool; authentication and player result distributions are outside this version. The interface uses system-font fallbacks if optional Google Fonts cannot load.

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

On mobile, focusing the word input switches to a compact map-and-input view sized to `visualViewport`, so the software keyboard has room below it. Blurring restores the normal page and previous scroll position. Inputs remain 16px and pinch zoom remains available. Desktop browser checks simulate narrow and shortened viewports; real iOS/Android keyboard behavior still needs device playtesting.

On arrival, a prominent “Touchdown! You made it.” banner appears over the map with the attempt count, and the map is brought into view. The detailed result and full flight log remain below.

The current distance rule caps trip measurement at the arrival-zone edge. Words deeper inside the zone need no extra launch strength. With arrival 0.25 and launch 0.08–0.18, a launch from target similarity 0.23 needs about 0.089 for MOON → KITCHEN regardless of overshoot. Older `distance-v1` and `distance-v2` histories retain their exact scoring when replayed.

Use **Make your own journey** below the launch controls to enter a starting word and destination, then press **Play my journey**. Custom levels use the current menu defaults (arrival 0.25, launches 0.08–0.18, distance-v3), appear in the journey selector, can be restarted, and save progress and attempts in the same Flight log. Unsupported words and identical endpoints show an inline error without replacing the active journey.

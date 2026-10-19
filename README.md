# ESCAPE VELOCITY 🚀

A local browser word game using actual Stanford GloVe 6B 300-dimensional vectors. Jump between words with related meanings, then reach the target's arrival zone for a free gravity assist. Every supported submission counts, including retries and failed launches. Entering your current word costs nothing.

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

Choose a journey, enter a word, and press Launch or Enter. The proposed planet appears before the rocket launches. Destination position measures target similarity. In the new distance mode, current-word similarity must meet a requirement that grows with the size of the trip. A successful backward launch is allowed, provided it stays at or beyond the starting boundary. Failed launches and out-of-boundary destinations cost an attempt and leave faint markers. Unknown words and your current word cost nothing. Other planets can be revisited, including the start, and failed words can be retried from a different planet. Each such submission costs an attempt. Reach any word inside the arrival zone to win automatically; the last hop is free.

The map gives 90% of the start-to-target horizontal span to the journey before the arrival zone, and 10% to the zone itself; the padded zone occupies roughly 13–15% of the visible journey width. Height separates attempted words and has no semantic meaning. It shows the complete journey throughout, including at completion. Planets behind the starting boundary are shown at the far-left map edge. Arrival has a fixed inclusive threshold (0.45 by default). Distance-based launch requirements range from 0.25 to 0.40. Both use a `1e-7` floating-point tolerance. Map compression changes no scores. The literal target is a supported submission too, governed by exactly the same rules. There are no fabricated player statistics.

Open **Flight lab** to inspect exact cosine readings, choose distance or fixed launch mode, adjust arrival and short/long-hop requirements, and choose arbitrary supported endpoints. Applying settings restarts the puzzle. The route tester submits comma-separated intermediate words through the same animated and scored game flow. Optimal routes are deliberately excluded from browser configuration.

## Launch experiment and saved journeys

In distance mode, trip length is the absolute change in destination cosine divided by the original start-to-arrival cosine gap, capped at 1. The required launch cosine is `0.25 + 0.15 * trip_length`. Backward hops have the same cost as equally long forward hops. This uses semantic progress rather than screen pixels, so resizing the map never changes the rules. The requirement is shown after every attempt and recorded in Flight log. A one-attempt victory still needs at least 0.40 launch similarity, and the arrival threshold stays 0.45.

New menu journeys use `distance-v1`. New fixed-mode journeys use `fixed-threshold-v2` and also allow revisits. Existing saved journeys use their original `fixed-threshold-v1` rules, including duplicate rejection; they are replayed under that version and never silently rescored. **Start with new rules** archives the old journey and starts the same endpoints with the updated rules, preserving all prior logs.

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

The analysis tool builds exact all-vocabulary threshold graphs in memory-bounded matrix batches. Breadth-first search permits backward movement but respects each puzzle's start boundary, and stops at an arrival-zone planet. It counts submitted words, excluding the free final hop. Seed 42 makes the random endpoint sample reproducible. The output includes one-, two-, three-, four-, five-plus-attempt and unreachable categories, graph connectivity, and optimal routes for offline inspection.

See [reports/distance-calibration.md](reports/distance-calibration.md) for the new experiment, exact requirements, and verified routes; the original fixed-threshold analysis remains in [reports/calibration.md](reports/calibration.md). **Both reports contain spoilers.** Machine-readable outputs are `reports/distance-analysis.json` and `reports/analysis.json`. The new analysis uses a candidate graph at cosine 0.25 and checks each edge against the target-dependent requirement and starting boundary during BFS. The original 128 endpoint pairs are reused for comparison. The new settings yielded 97 two-attempt, 24 three-attempt, six four-attempt, and one unreachable pair, with no single-attempt solutions in this sample. These are mathematical optima, not human playtest statistics.

The current menu retains familiar thematic puzzles while making stepping-stone play easier. Distinct optimal routes and opening moves are reported for review; this does not prove that typical human journeys take 2–4 attempts. Running the original `analyze.py` regenerates its fixed-mode puzzle selection; run `analyze_distance.py` afterwards to restore the current menu before building browser data.

To evaluate a specific route without the UI (last word is the target; intermediate words are submissions):

```sh
.venv/bin/python scripts/analyze.py --mode distance --threshold 0.45 --route coffee food medical science
```

Tests cover normalization, cosine symmetry, meaningful real-vector comparisons, launch failure, boundary failure, legal backward travel, revisits, retry scoring, current-word/unknown rejection, legacy rule restoration, variable launch requirements, inclusive thresholds, attempt counting, automatic victory, and every selected puzzle's optimal route.

## Files and prototype limits

- `engine.py`: semantic scoring and game rules.
- `server.py`: static files and `/api/config`, `/api/new`, `/api/submit`; independent in-memory browser sessions.
- `static/`: responsive plain HTML/CSS/JavaScript, browser scoring, curated vectors, SVG planets, rocket animations, reduced-motion support, and debug controls.
- `scripts/prepare.py`: download and normalize real embeddings.
- `scripts/analyze.py`: original fixed-threshold graph search and calibration.
- `scripts/analyze_distance.py`: target-dependent graph search and current puzzle selection.

Browser journeys and every submission are saved in local storage; reloads resume the active journey. Switching puzzles or restarting archives earlier journeys in the Flight log. Copy a journey as readable text or download all logs as JSON. Logs include rejected words without charging attempts, failures, successes, timestamps, thresholds, and both cosine readings. Browser storage stays on the same device and can be removed by clearing site data; download logs for a backup. If storage fails, a visible message asks you to download before leaving. Earlier plays from before flight logging was added cannot be recovered. Python API sessions reset when the server restarts. This prototype uses fixed-scale map framing rather than a moving camera. It is a local playtest tool; authentication and player result distributions are outside this version. The interface uses system-font fallbacks if optional Google Fonts cannot load.

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

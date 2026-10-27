# Standalone vector-only cleverness

The primary live cleverness score uses vectors, local semantic neighbourhoods and the actual played route. It runs in the existing browser assessment worker and needs only static files. No Python, localhost scoring service, WordNet query, dictionary evidence, LLM or external scoring API is involved.

## Evidence and formula

This is explicitly a **vector-only variant** of the V6.6/V6.7 harmonic architecture. Removing lexical corroboration changes some results; it is not labelled as numerically identical to the former dictionary-assisted experiment. V6.2 in the details is likewise a vector-only comparison, so both use the same evidence scope.

The existing vector context partitions, endpoint contrast, supported setup roles, corner geometry, observed departure progress, generic-hub safeguards and route coherence are retained. Pair credibility receives no lexical floor; dictionary synonym/morphology classifications and three-way lexical contrast are absent. No replacement dataset or hand-authored semantic exceptions is introduced.

The harmonic formula, golf-result bands, opportunity correction and leg restrictions are unchanged. For Par 3 holes, the entire route is one departure stage. No hypothetical approach, landing or corner credit is added; corner utility is shown as unavailable. The strongest eligible moment, independent diminishing additions and mechanical relevance filters still apply. Existing word-form allowances remain gameplay rules during authoritative replay, not cleverness bonuses.

## Runtime and UI

The worker waits for the existing model to finish loading, replays the completed history, builds vector evidence and scores the attempt. Shot animation and golf result publication do not wait for this analysis. Static neighbourhood profiles are lazy-loaded and integrity checked. Missing profiles, unsupported models or incomplete evidence show an unavailable state instead of a substitute number.

The results card displays **Vector cleverness XX/100**. Expand the details for components, actual dogleg, stroke split, strongest sequence, restrictions and the vector-only baseline. Completed attempts are saved additively in the existing FlightLog; copy/JSON controls retain full precision. Older dictionary-assisted diagnostics are available separately and load only if explicitly opened. They never supply evidence to the vector score.

## Reproducibility

`node scripts/build_vector_cleverness.mjs` generates browser-safe copies of the research scorers and existing evidence analysers into `static/vector-cleverness/`. Scoring formula bodies are unchanged; lexical providers in the evidence copies are explicitly neutral. `index.mjs` and `evidence.mjs` are the maintained browser adapters and includes the single-leg mapping.

`node tests/test_vector_cleverness.mjs` regenerates full vector evidence for 23 recorded calibration routes and compares exact unrounded outputs with fixtures derived by removing lexical inputs from the original experimental scorer. It also tests a real completed Par 3, determinism, input immutability, stroke counts and the lack of scoring-server/dictionary imports. The fixtures contain authoritative completed states, not route-specific scoring rules.

All deployment runtime modules and resources live under `static/`. The older local WordNet service is not required or called by this implementation.

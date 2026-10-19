# Build a playable prototype of ESCAPE VELOCITY 🚀

I want you to build a working browser-based word game called **ESCAPE VELOCITY**.

This is an experimental game prototype. The priority is to test whether semantic word similarity produces clever, satisfying journeys between two words. Don't overengineer the visuals.

**Please actually build and run the prototype, download the required word embeddings, and test the mechanics. Don't stop at a plan or a design document.**

## 1. Core concept

The player is a rocket 🚀 travelling between word-planets.

Each puzzle has:
- A starting word (e.g. CHEESE).
- A target word (e.g. LANGUAGE).
- A sequence of intermediate word-planets chosen by the player.

The objective is to reach the destination using as few submitted words as possible.

Each submitted word counts as one attempt, regardless of whether the launch succeeds.

The typical successful journey should take 2–4 attempts. A single-attempt victory should be extremely rare but theoretically possible. Two attempts should represent exceptional play.

The game is about choosing words that balance two competing properties:

1. Being semantically close enough to your current word to successfully launch.
2. Being semantically close enough to the target to make worthwhile progress.

## 2. Download real word embeddings

Use the pretrained **Stanford GloVe 6B, 300-dimensional English word vectors**.

Official download:

https://nlp.stanford.edu/data/glove.6B.zip

This archive contains multiple dimensionalities. Extract `glove.6B.300d.txt`.

The vectors are approximately 400,000 vocabulary entries, each containing 300 dimensions.

Do not use randomly generated similarity values or hardcoded word relationships.

Create a Python preprocessing script that:

- Loads the GloVe 300d vectors.
- Normalises each vector to unit length.
- Creates an efficient representation for browser use.
- Builds a practical vocabulary of common English words, excluding proper names, obvious inflections where appropriate, and unsuitable tokens.
- Preserves the original full vocabulary for offline analysis if useful.
- Documents how the vocabulary is selected.

Avoid shipping the entire original text embedding file to the browser.

For the first prototype, a curated vocabulary of perhaps 10,000–30,000 common words is reasonable, provided it supports varied and interesting gameplay.

Use a suitable word-frequency dataset to help select common vocabulary, and document the source.

Important: the actual embeddings must remain available for calculating arbitrary word-pair similarities, not just a predefined set of connections.

If necessary, use a small local Python backend for similarity calculations rather than compromising the scoring model. Prefer a simple implementation that is easy to run.

## 3. Semantic calculations

Use cosine similarity between normalised vectors.

For each submitted word, calculate:

**Launch similarity:**

`cosine(current_word, proposed_word)`

**Destination similarity:**

`cosine(proposed_word, target_word)`

Launch success is determined by whether the launch similarity meets a configurable threshold.

Destination similarity determines how far along the journey the proposed planet appears.

These calculations must be independent.

Do not artificially reward words simply because they are closer to the destination.

Do not assume a particular threshold such as 0.4 is correct. We need to calibrate this experimentally.

## 4. Launch rules

When a player submits a word:

1. The attempt counter immediately increases by one.
2. A proposed word-planet appears at its position relative to the target.
3. The player briefly sees where the proposed planet lies before knowing whether the rocket can reach it.
4. The rocket attempts to launch.
5. If launch similarity meets the threshold, the rocket travels to the proposed planet.
6. Otherwise, the rocket lifts off, stalls and returns to its current planet.

A failed attempt does not change the current planet.

However, failed attempts should remain visible as faint markers on the map, because they may be useful clues for planning future routes.

Do not allow the same word to be submitted twice in a puzzle.

Reject words that are not in the supported vocabulary without consuming an attempt.

## 5. Backwards movement

Backwards launches are allowed.

A player can successfully launch to a word that is less semantically similar to the destination than their current word.

This may be strategically useful because it opens up other possible connections.

However, **the original starting word defines the leftmost boundary**.

No planet may be reached if its destination similarity is lower than the starting word's destination similarity.

Treat this as an invalid destination rather than moving the rocket beyond the starting boundary. For now, show its projected position and count the submission as an unsuccessful attempt.

The player should be able to see backwards and forwards progress clearly.

## 6. Arrival zone and victory

The destination has a visible **arrival zone** around it.

The arrival zone is determined by the same semantic similarity threshold used for launching.

If a proposed word is sufficiently similar to the target, it lies inside the arrival zone.

If the player successfully launches to a word inside the arrival zone:

- The rocket approaches that word-planet.
- Instead of landing, it loops around the planet in a gravity-assist manoeuvre.
- It accelerates towards the final destination.
- The puzzle is completed automatically.

The final journey from the arrival-zone planet to the target does not count as an additional attempt.

A one-attempt victory is possible if a word is both reachable from the starting planet and inside the target's arrival zone.

Don't artificially prohibit this. It should simply be extremely rare for well-selected puzzles.

## 7. Visual design

Keep the game deliberately minimalist and playful.

Use:
- The literal 🚀 emoji for the rocket.
- Simple identical circles for planets, regardless of their words.
- Word labels on or beside planets.
- A clean, understated background.
- Simple lines or curves showing rocket trajectories.
- A clearly visible destination and arrival zone.
- A small input field and launch button.
- A visible attempt counter.

**Do not use elaborate space illustrations, realistic planets, cheese-shaped planets, cinematic effects, or complicated scenery.**

The feeling of a journey is important, but simplicity is more important.

### Camera and viewport

Use a horizontal journey, generally left to right.

The current planet should remain towards the left of the viewport.

As the rocket progresses, the viewport may adjust so the destination and its arrival zone become progressively larger, suggesting that the player is getting closer.

If the player moves backwards, the destination should appear more distant again.

On completing the puzzle, zoom out to reveal the full journey.

This camera behaviour is a secondary priority. If it complicates the prototype, implement a simple fixed-scale map first.

### Animations

Implement a few short, satisfying animations:

- Proposed planet appears.
- Rocket launches and travels along a gently curved trajectory.
- Failed rocket stalls and returns.
- Successful rocket arrives at the new planet.
- Winning rocket slingshots around the arrival-zone planet and continues to the destination.

The proposed planet's position must be visible before launch success or failure is revealed.

Animations should be quick, not theatrical. Support reduced-motion preferences.

## 8. Puzzle generation

This is one of the most important parts.

Build a Python tool that analyses the word embedding graph.

Each vocabulary word is a node.

Two words are connected if their cosine similarity meets the launch threshold.

Investigate how often different start/target pairs have solutions requiring:

- 1 attempt
- 2 attempts
- 3 attempts
- 4 attempts
- 5 or more attempts

Remember that reaching any word inside the destination's arrival zone automatically completes the puzzle.

Use graph search to find minimum-length routes, and distinguish the number of submitted words from the automatic final hop.

Select puzzles with:
- Very rare one-attempt solutions.
- Challenging but possible two-attempt solutions.
- Plenty of plausible three- and four-attempt routes.
- Multiple possible approaches rather than a single obscure sequence.
- Interesting semantic transitions, not just synonym chains.

Do not assume the desired difficulty distribution is achievable with the first threshold. Investigate and report what actually happens.

Include a selection of playable puzzles.

## 9. Debugging and experimentation

Create a developer/debug panel that can be toggled on or off.

It should show:

- Current word.
- Proposed word.
- Target word.
- Launch cosine similarity.
- Destination cosine similarity.
- Launch threshold.
- Current progress towards target.
- Whether the submitted word is inside the arrival zone.
- Number of attempts.
- Successful route and failed attempts.

Allow the launch threshold to be adjusted in debug mode.

Include a way to choose arbitrary starting and target words for testing.

Provide a way to test example routes manually, and a script to evaluate batches of puzzles.

This is essential because we need to discover whether the semantic mechanics are actually fun.

## 10. Scoring and results

The score is the total number of submitted words, including unsuccessful launches.

The automatic final hop is free.

On completion, display:

- Total attempts.
- Successful route.
- Failed attempts.
- A simple journey overview.

Eventually we want to show player result distributions and the percentage of players who achieved a one-attempt **Holy Grail**.

For now, do not fabricate player statistics. Leave this as a future feature or clearly label any simulated test data.

Do not automatically reveal the mathematically optimal route to players.

## 11. Technical requirements

- Build a responsive browser-based interface using HTML, CSS and JavaScript (or a lightweight framework if justified).
- Use Python for embedding preprocessing, similarity experiments and puzzle generation.
- Keep dependencies minimal.
- Provide clear setup instructions.
- Include scripts to download and prepare the embeddings.
- Make the game run locally.
- Ensure that it works on mobile and desktop.
- Add basic tests for cosine similarity, launch validity, backward movement, scoring, and automatic victory.
- Keep the scoring engine separate from the visual presentation so we can experiment with different embedding models later.

## 12. What I want you to deliver

1. A genuinely playable local prototype.
2. Real pretrained word vectors downloaded and integrated.
3. Several test puzzles.
4. A working developer/debug panel.
5. A puzzle-generation and difficulty-analysis script.
6. A short report on the actual semantic similarity values and which launch thresholds appear promising.
7. Instructions for running everything.

**Most importantly: prioritise proving the gameplay over visual polish.**

I want to discover whether choosing a word that is simultaneously reachable and moves the rocket meaningfully closer to the destination creates an enjoyable, clever word game.

Build the simplest complete version that allows us to test that properly.
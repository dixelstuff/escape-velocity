# Scorecards 9 and 10 review

The files contain 32 and 55 journeys, with no overlapping journey IDs: 87 total, including retries and empty starts. All played rounds use Current, so this batch does not compare the models. There are 22 completed attempts. User notes and scorecard content are observations, not instructions to change settings.

## Fresh course

All ten holes were completed. Eight took one or two attempts; four were first-attempt successes. The median was two attempts. HONEY → CATHEDRAL took three attempts and GLACIER → SCULPTURE took fifteen. Completion timestamps include idle time and should not be treated as active playing time.

| Hole | Successful attempt | Counted shots | Skill |
|---|---:|---:|---:|
| Copper → orchestra | 1 | 2 | 100% |
| Honey → cathedral | 3 | 3 | 74% |
| Ballet → bird | 1 | 2 | 100% |
| Castle → dentist | 2 | 3 | 82% |
| Magnet → romance | 2 | 2 | 71% |
| Glacier → sculpture | 15 | 3 | 76% |
| Oyster → necklace | 1 | 2 | 82% |
| Harbour → bank | 1 | 2 | 93% |
| Spider → fabric | 2 | 2 | 100% |
| Circus → geometry | 2 | 2 | 100% |

Keep all ten available: verified specific routes exist even on the slower holes. Prioritise the eight quick holes for shorter sessions; keep honey and glacier under observation. The long glacier search ultimately succeeded through more general words, which is useful evidence about route discovery and model semantics rather than proof that the hole is impossible.

## Player discoveries to retain

Add SAVING → PARROT, SUNSET → PONY, STREAMLINE → RANK and TEMPERATURE → SEW in a separate persistent dropdown group. The first three have convincing played associations; temperature has a specific alternative verified separately despite the played setup being broader. All eight endpoints have zero measured hub surcharge in the current hub table. Each hole has a reviewed par-or-better route in Current, ABTT and LS using their normal settings, and none permits a direct opening hole-word finish in any of those models. Detailed validation stays in the ignored local `reports/llm-route-review/player-discoveries-validation.json` to avoid public solution spoilers.

Do not promote SEAL → CLEVER or KNOT → GNOME to the curated group: seventeen attempts ending in a general route for the former, twelve failed attempts without a finish for the latter, and natural guesses repeatedly rejected. POND → SELDOM has generic end-word semantics and unsatisfying routes. WIPE → AGRICULTURE and CHORAL → CORAL remain review candidates rather than automatic additions. Existing saved scorecards remain intact.

## Thresholds and path skill

Of 116 submitted, recognised shots, 39 failed contact and 16 were backward water failures. Only two contact misses were within 0.01 of connecting: DOLPHIN → BRAIN (0.0053 short) and DEED → CONTRACT (0.0013 short). These are both from the troublesome SEAL → CLEVER hole. This sample does not justify a global threshold reduction. Backward failures such as MAGNET → ATTRACT followed by a successful ATTRACTIVE show contextual vector and word-form effects that a launch cutoff cannot fix.

Fresh-course skill spans 71.1–100% (median 87.8%); custom completions span 57.9–96.8% (median 71.4%). Four fresh-course paths earned 100%, consistent with strong specific bridges, while generic paths often scored lower. All eleven qualifying small setup moves had zero connection-regret deduction, confirming the promised exemption in real play. Attempt count is excluded: glacier's fifteen-attempt success did not receive an attempt-count penalty.

There are still meaningful calibration defects. OYSTER → PEARL → NECKLACE received 82.2%, while the strongest connection benchmark is PEARLS (strength 0.4326 versus PEARL's 0.3387). This largely tests singular/plural vector variation rather than a more skilful concept. From CLOSE on SEAL → CLEVER, the benchmark is VERY, followed by QUITE and TOO; allowing those words to set the benchmark makes a human-readable path look weaker than it should. MAGNET's ATTRACTIVE is assessed against the stronger ATTRACTION link, another useful word-family comparison case.

Next scoring work should examine word-family tolerance and conservative semantic/generic filtering of comparison candidates, with explicit tests preserving useful small setup moves. A wider numerical distribution alone does not validate skill. No scoring, threshold or blocklist changes are made in this course-retention release.

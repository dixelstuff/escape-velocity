# Strong dogleg arrival finish — 0.32

The browser now records `dogleg_finish_rule: {version: "strong-arrival-v1", after: 0}` on new waypoint games. The threshold is 0.32 for the landing word's **credited** flag similarity, in addition to the existing finish rules. It gates both normal green and chip-range completion at dogleg entry. Exactly 0.32 qualifies, using the engine's existing floating-point tolerance. Existing plural/family semantic representations are retained.

## Follow-up

When the landing would previously have finished but is below 0.32, it stops in the dogleg and records `dogleg_finish_deferred`. Only the immediately following shot receives the special handling:

- Explicit flag-word input is disallowed throughout the second leg under the new rule (including equivalent UK/US spellings), with “Play another word to reach the flag.” It consumes no stroke. First-leg flag input remains allowed.
- Contact requirements are unchanged.
- A qualifying normal finish may step behind the previous best affinity if it remains at least `min(best_progress, green_threshold) - backward_allowance`. With the standard green and tolerance this is 0.26 for an already-close landing. Nonfinishing and more distant backwards moves remain disallowed.
- A successful finishing follow-up records `dogleg_finish_followup`. The map uses its usual landing if farther, otherwise a minimum one-third advance towards the flag from the dogleg lie. A final radial clamp accounts for side offsets, guaranteeing at least one-third reduction in remaining visual distance. This affects map placement only; semantic vectors, contact, stroke counts and Cleverness formulas are not changed.
- The ball is still hit, lands and pauses, then the existing automatic finishing stroke/animation plays. The follow-up and automatic finish each count one stroke.

An entry that was not otherwise eligible to finish receives no special exception. An ordinary shot does not receive backwards leniency just because it is near the flag. The normal second-leg finishing rule and 0.12 span adjustment remain unchanged.

## Compatibility

The core engine opts into this explicit marker so old recorded histories and research fixtures retain their original physics. The browser applies it to every new waypoint game and adopts it on the next valid submission of an existing live game, starting after its existing history. Retry previews preserve assumed prefixes under their recorded rules, with new exploration under the new rule. Cancellation restores the original state. Completed saved routes and scores are not rewritten.

The marker is included in semantic/skill/hole report identities; the whole-state playtest key already includes it. The module cache graph is updated together so worker/main/map versions agree. The Cleverness scorer version and formula remain unchanged.

## Verification

`tests/test_strong_dogleg_finish.mjs` checks the exact boundary, MATCH → SAME stopping, no-cost flag rejection, MATCH → SAME → SIMILAR → DEEP in three strokes with a slight backwards affinity step, weak-contact and nonfinishing-backwards safeguards, literal first-leg flag input, aliases, minimum/farther landing positions at both viewport sizes and both doglegs, exact save replay, historical albatross retention, retry prefix activation/cancellation, live browser-client adoption, cache separation and actual completed-route vector Cleverness analysis.

An isolated Chrome UI test on desktop and mobile verifies the SAME dogleg pause, the separate SIMILAR landing and pause, then final roll, three total strokes and a saved final trail. No real player storage is touched.

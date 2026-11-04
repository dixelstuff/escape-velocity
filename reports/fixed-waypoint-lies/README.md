# Fixed first-leg word positions — 4 November 2026

## Cause

On DOUBTFUL → STUDIO → CUFF, playing TALENT directly misses but aims inside the zone: similarity to STUDIO is 0.286033. After DUBIOUS, the old contact rescue silently substituted TALENTS. That form has similarity 0.202453 to STUDIO, so it hit a shorter shot and landed outside. The drawing faithfully displayed the substituted destination; the underlying rescue had changed the word's semantic position based on the incoming lie.

After DUBIOUS, raw TALENT contact is 0.168373 versus required 0.192749, within the existing 0.025 rescue margin. TALENTS provides contact 0.194163—enough for the actual TALENT distance. The old substituted-distance requirement was only 0.174271. The correction preserves the true intended distance rather than borrowing the shorter one.

## Correction

New first-leg games record waypoint_rescue with version fixed-destination-v1 and an activation index after. First-leg destination is determined only by the entered word, active waypoint, fixed model and word-form settings:

1. Use the entered word's target similarity.
2. Retain the existing small boundary allowance: when it is below the waypoint threshold by no more than the configured plural tolerance / 0.025 family tolerance, a >0.65-similar permitted form inside the zone can supply the destination. Resolve this before checking contact, without consulting the incoming lie. Plural forms retain priority over adjective-family forms; candidates use deterministic similarity/lexical ordering.
3. A near contact miss may borrow a permitted form's contact strength, but keeps that fixed destination, full-distance requirement, played-word hub surcharge, direction and safety. This cannot shorten the shot to make the borrowed contact sufficient.
4. Record contact_word for contact-only substitutions and destination_word for a fixed near-zone representative. The entered word remains the visible label. Existing scoring_word identifies a destination representative where applicable.
5. Second-leg and non-dogleg plural/family finishing rescue is unchanged. No thresholds, tolerances, vectors or Cleverness formula changed.

TALENT is above the threshold already, so its destination stays exactly 0.286033. Its direct swing still misses; after DUBIOUS it hits and satisfies the waypoint. Existing BACTERIA/BACTERIAL near-zone generosity is retained, but now its region membership is the same before and after making contact.

## Saved games and retries

Old saved histories without the marker retain their recorded rescue geometry. Completed results, old scores and routes are not rewritten. The vector replay adapter explicitly selects legacy behaviour when stripping history from an old state. Frozen publication/calibration tests use their recorded rule through a named historical test helper; their exact assertions remain in place.

Resuming an old first leg adopts the correction only on the next committed live shot. Retrying from an old lie replays the assumed prefix under its original rules and activates the fix afterwards. Cancelling the preview restores the original state. Invalid input does not mutate the live game. The marker and activation index persist and separate semantic/playtest caches. UK/US canonicalisation covers the new contact/destination metadata.

These historical records may still display their original recorded positions. New exploration uses the corrected rule without silently changing already-counted shots.

## Verification

- Exact TALENT coordinates match for the miss and successful arrival at both map widths and both dogleg orientations.
- Eighteen further words are checked from three unrelated incoming lies for identical destination, region membership and destination representative.
- Synthetic plural and adjective-family cases cover near-zone generosity before/after contact, the >0.65 gate, contact tolerance, full-distance requirements, hub surcharge, outside/water cases and no distant boundary rescue.
- Real BACTERIA retains its boundary allowance; COAL → TRAIN → WEDDING → PHOTOS retains the existing final-leg PHOTO finish.
- Old saves and mixed-prefix corrected saves roundtrip exactly; live restore/retry/cancellation and invalid input are covered through the real browser client.
- The completed DOUBTFUL → DUBIOUS → TALENT → SKILL → HAND → CUFF route produces a valid live vector Cleverness report with the correct 2+3 leg split.
- Existing 23 vector calibration routes and spelling-score comparisons retain their scores.
- Isolated desktop/mobile Chrome DOM checks reproduce the exact three-shot sequence and compare actual rendered circles. The failed and successful TALENT points are identical, inside the original ellipse; the zone disappears and the visible target becomes CUFF only on the hit. Tests use an observational log hook for the IndexedDB-backed test history; no real user profile/storage is touched.

Run node tests/test_waypoint_contact_geometry.mjs and node scripts/check_fixed_waypoint_lies.mjs. See [before/after events and coordinates](reproduction.json).

# Play feedback and named-dogleg substitution — 3 November 2026

## Latest 30-hole playtest

The supplied export contains 342 journey records, including some already reviewed holes and a custom hole. This review isolates the latest batch (#322–#351) rather than adding cumulative player stats or counting the older DRAFT/PIN records again.

All 30 new holes have a captured completion. Best strokes: **4 eagles, 19 birdies, 7 pars, no bogeys**. There are **326 actual word submissions** across them, after removing assumed copied prefixes, automatic finishes and duplicate timestamps/words/origins. Median submissions per hole: **9.5**; counts can include improvement experiments after the first finish. This is one player's experience, not a general difficulty estimate. The player's explicit feedback is that this batch felt less restricted while retaining room for clever improvement. Retain the holes and the current selection balance; do not turn these counts into generation gates.

## Proposed dogleg evidence

For each hole, examine the best-stroke completion (highest saved Cleverness breaks a stroke tie). Reproduce the route with the unchanged browser engine. Compare the actual dogleg landing B to the literal named dogleg W:

1. Incoming: replay the original prefix up to the preceding lie A, then submit W instead of B. Record whether it legally reaches the dogleg, including the actual hit requirement, progress restrictions and target transition.
2. Outgoing: reuse the existing live scorer's stipulated-W counterfactual, with W's own second-leg baseline and restrictions. Inspect its first recorded outgoing shot. This is a conditional test from a hypothetical W lie even when the incoming test fails, not a claim that W was legally reached through that prefix.
3. Check whether W already finishes the hole. An early finish is a success, never evidence that the following word is inaccessible.
4. Retain the whole-suffix counterfactual separately from this immediate-next-move check. A later failed continuation is different evidence from an immediately blocked shot.

## Results

- Eight selected routes use the named dogleg itself; 22 use a different landing word.
- Of those 22, the literal dogleg fails the incoming shot in **11**.
- It fails the first player-chosen outgoing shot in **14** of the alternative-landing routes. Some also fail incoming; these counts are not additive.
- **20** have a failed incoming shot or a failed observed next shot under substitution.
- **One** supports both incoming and outgoing moves using the literal dogleg.
- **One** remains unclassified by the immediate-next-shot comparison because the original landing auto-finishes and there is no next player-chosen word. Two other auto-finish cases already fail the incoming test. Do not infer a bonus from an empty suffix or a null result.

Examples from the actual play (spoilers):

- **BREEZE → SAIL → FREE → SAMPLE → PAINT**, dogleg DUTY. SAIL could legally reach DUTY, but the stipulated DUTY lie cannot make the observed SAMPLE shot. FREE preserves a familiar 'free sample' continuation. This is a strong example of the landing choice opening the observed route.
- **APPLAUSE → ROUND → FUNDING → FLOW → RIVER**, dogleg DEBT. Replacing FUNDING with DEBT fails on the incoming shot from ROUND; the conditional outgoing FLOW shot from DEBT works. The choice provides access from the approach, rather than exclusive onward access.
- **CLAIM → OPEN → WINDOW → AIR → FRESH**, dogleg CURTAIN. CURTAIN supports the incoming OPEN shot and the outgoing AIR shot, and the existing counterfactual completes the recorded suffix. WINDOW therefore has no demonstrated mechanical exclusivity by this test. That does not prove the association or route is uninteresting.

## Relationship to existing Cleverness

The live scorer already uses `strategyEvidence()` in `static/vector-cleverness/evidence.mjs` to test the recorded suffix from a stipulated literal-waypoint lie. `cornerDiagnostic()` in V6.6 blends this functional access evidence with geometry as strategic utility. It does **not** validate the actual incoming prefix to that literal word. The proposed incoming comparison adds information; simply adding another outgoing bonus would risk counting existing evidence twice.

This measures **functional value of the dogleg choice**, not semantic originality by itself. Its high prevalence here (20 of 22 alternative landings) means a binary award would be common, not selective recognition of exceptional play. Require meaningful actual associations and demonstrated use; distinguish a large access improvement from a razor-thin miss. If W works both ways, withhold this particular exclusivity evidence rather than penalising the route's other ingenuity. Do not make it a second efficiency or corner-cutting reward.

Recommendation: retain these two directional tests as inspectable experimental evidence first. Check diverse unseen routes and calibration cases, including generic alternatives, literal landings, automatic finishes, UK/US identities and existing skippable-step controls, before changing weights. No new cleverness score, bonus or scoring change is introduced by this review. No route search or external lexical resource was used.

Detailed route states are not copied; `analysis.json` retains routes, substitution results and relevant engine events. Replayed completions match the authoritative engine. The separate UI fix suppresses old shot feedback when explicitly returning to the original lie; a new successful dogleg shot still announces its transition.

# Choosing Word Golf holes

## Source of truth

Read this file from disk before each batch. It is the complete editorial generation brief; do not supplement it with remembered chat preferences, favourite routes or historical instructions. Explicit current user instructions take precedence: incorporate design changes here before generating. AGENTS.md remains the reference for mechanics, identity, persistence and publishing.

## Nominate lightly, reject clear problems

Aim for **easy to start, interesting to explore, challenging to perfect**. Language already supplies subtle connections; let players discover them. Do not manufacture cleverness by planning transitions or dogleg landings.

1. **Nominate loosely.** Build a broad pool of fresh, familiar everyday words with readily available associations. Gently favour words with two distinct everyday meanings, especially a less immediately obvious secondary sense, while keeping a broad mix. Seek slightly more discovery through meaning, not greater distance or less familiar vocabulary. If the pool feels depleted, expand across ordinary activities, places, objects, actions and qualities rather than defaulting to reuse. Randomly combine words into tee–dogleg–flag triples using a recorded seed, without novelty quotas, grammatical patterns or a particular word type in each position. Ambiguity is an opportunity, not evidence that a triple works: favour familiar, natural associations over merely possible senses. Do not require ambiguity in every triple, match a dogleg to explain the tee or choose a flag to demonstrate a pivot.
2. **Apply the rejection checks below once.** Keep combinations that pass. Do not require proof of a clever route, a meaning switch, strategic landing choices or a satisfying birdie before accepting a hole.
3. **Replace, do not tune.** Reject the whole candidate and take the next randomly formed triple. Do not adjust its dogleg towards the tee's category to improve opening counts, or repeatedly edit slots to manufacture a transition. If the pool is insufficient, broaden it with more familiar words and record the addition.

## Rejection checks

- **Invalid:** unsupported or blocked endpoints, repeated identities within a triple, an existing duplicate triple, or failure of the current engine's direct-leg rules. Use UK/US spelling equivalence and the current live settings.
- **Giveaway connection:** reject routine category, trade, synonym or stock-phrase links that give the opening away, and whole-context shortcuts even when their bridge was absent from the six probes. Apparently unrelated endpoints can still share a routine context, as FOG–RUNNING–FRIDGE did through MORNING and COLD. Related words can still offer useful setups. For an easy probe arrival, judge that actual landing against the flag: reject an immediately routine category or soft general finish. This is editorial, without further shot probes, maximal distance or required extra strokes.
- **Restricted, remote or inexplicable:** reject triples that feel too remote or difficult to think around on sight, even if numerical checks pass; no complete route or semantic-distance target is needed. Nominate six familiar tee associations independently of the dogleg and check each once. Useful small setups count; fewer than three legal forward moves is grounds to replace the candidate. Count useful setups, not merely tiny numerical gains: JOURNAL–UNTIE passed while ordinary journal associations left UNTIE feeling arbitrary. Reject clear combinations where plausible approaches feel unrewarding and the apparent escape is only a vague general connection. Familiar endpoints and a passing count do not excuse that gap. Do not change the six ideas to improve the result.
- **Clear stale or hollow shortcut:** consider tee and flag together as well as each leg. An unrelated-looking dogleg does not rescue a triple when a readily apparent generic, material or everyday-context bridge seems to do most of the work. Notice repeated bridges and routine category/colour/size finishes too. Reject clear cases without searching for weak routes. Broad words, related endpoints and quick finishes are not inherently bad.
- **Repetition or vocabulary friction:** freshness includes recent endpoints (even withdrawn holes) and recurring easy bridges identified in feedback. Fresh triples can still feel stale when another cooking flag readily invites RECIPE; avoid obvious repetition without searching routes or banning bridges or topics. Avoid forced quirkiness, obscurity and narrow association bottlenecks. TUSK and NOD are recorded endpoint warnings, not input bans. MATT/MATTE is a UK/US spelling-variant issue, not evidence that the concept makes a poor endpoint. These cautions do not ban whole word classes or older archive vocabulary.

Otherwise, let the hole through. Do not add landing maps, continuation probes, route searches, simulations, Cleverness analysis or stroke/difficulty quotas. Awkward landings, contrasting contexts and hard second legs are not positive selection targets. Player feedback decides which holes merit keeping; early routes do not establish a hole's full potential.

## Record and publish

Record this file's hash, the word pool, random seed, original candidate order and brief rejection reasons alongside the usual local checks. This records compliance; it is not another research exercise. Publishing order follows the current request. Preserve permanent IDs, previous definitions and progress; public withdrawal is not deletion from the archive. Cross-leg reuse remains legal.

Historical reasoning: [design reset review](reports/level-design-reset-2026-11-13/README.md). That review and earlier reports are evidence, not additional generation instructions.

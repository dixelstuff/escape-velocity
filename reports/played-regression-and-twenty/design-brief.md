# Choosing Word Golf holes

## Source of truth

Read this file from disk before each batch. It is the complete editorial generation brief; do not supplement it with remembered chat preferences, favourite routes or historical instructions. Explicit current user instructions take precedence: incorporate design changes here before generating. AGENTS.md remains the reference for mechanics, identity, persistence and publishing.

## Nominate lightly, reject clear problems

Aim for **easy to start, interesting to explore, challenging to perfect**. Language already supplies subtle connections; let players discover them. Do not manufacture cleverness by planning transitions or dogleg landings.

1. **Nominate loosely.** Build a broad pool of fresh, familiar everyday words with readily available associations. If it feels depleted, expand across ordinary activities, places, objects, actions and qualities; do not reach for less familiar vocabulary or default to reusing words. Randomly combine words into tee–dogleg–flag triples using a recorded seed, without novelty quotas, grammatical patterns or a particular word type in each position. Multiple meanings are welcome, not required. Do not match a dogleg to explain the tee or choose a flag to demonstrate a pivot.
2. **Apply the rejection checks below once.** Keep combinations that pass. Do not require proof of a clever route, a meaning switch, strategic landing choices or a satisfying birdie before accepting a hole.
3. **Replace, do not tune.** Reject the whole candidate and take the next randomly formed triple. Do not adjust its dogleg towards the tee's category to improve opening counts, or repeatedly edit slots to manufacture a transition. If the pool is insufficient, broaden it with more familiar words and record the addition.

## Rejection checks

- **Invalid:** unsupported or blocked endpoints, repeated identities within a triple, an existing duplicate triple, or failure of the current engine's direct-leg rules. Use UK/US spelling equivalence and the current live settings.
- **Giveaway connection:** reject routine category, trade, synonym or stock-phrase links that give the opening away, and whole-context shortcuts even when their bridge was absent from the six probes. Apparently unrelated endpoints can still share a routine context, as FOG–RUNNING–FRIDGE did through MORNING and COLD. Related words can still offer useful setups. For an easy probe arrival, judge that actual landing against the flag: reject an immediately routine category or soft general finish. This is editorial, without further shot probes, maximal distance or required extra strokes.
- **Restricted, remote or inexplicable:** reject triples that feel too remote or difficult to think around on sight, even if numerical checks pass; no complete route or semantic-distance target is needed. Nominate six familiar tee associations independently of the dogleg and check each once. Useful small setups count; fewer than three legal forward moves is grounds to replace the candidate. Count useful setups, not merely tiny numerical gains: JOURNAL–UNTIE passed while ordinary journal associations left UNTIE feeling arbitrary. Familiar endpoints and a passing count do not excuse that gap. Do not change the six ideas to improve the result.
- **Clear stale or hollow shortcut:** briefly notice readily apparent repeated bridges or routine category/colour/size/general-word finishes that appear to resolve the hole without worthwhile discovery. A common bridge reaching the dogleg deserves particular scrutiny when the flag also accepts that same broad context. Broad words and quick finishes are not inherently bad. Do not search for weak routes or reject a hole merely because one could exist.
- **Repetition or vocabulary friction:** check recent endpoints, including withdrawn holes the player saw, and obvious overused motifs identified in recorded feedback. Avoid forced quirkiness, obscurity or narrow association bottlenecks. Recorded play flags TUSK and NOD as poor endpoint choices; avoid them in generation without changing the playable vocabulary. These are combination warnings, not bans on whole word classes or old archive vocabulary.

Otherwise, let the hole through. Do not add landing maps, continuation probes, route searches, simulations, Cleverness analysis or stroke/difficulty quotas. Awkward landings, contrasting contexts and hard second legs are not positive selection targets. Player feedback decides which holes merit keeping; early routes do not establish a hole's full potential.

## Record and publish

Record this file's hash, the word pool, random seed, original candidate order and brief rejection reasons alongside the usual local checks. This records compliance; it is not another research exercise. Publishing order follows the current request. Preserve permanent IDs, previous definitions and progress; public withdrawal is not deletion from the archive. Cross-leg reuse remains legal.

Historical reasoning: [design reset review](reports/level-design-reset-2026-11-13/README.md). That review and earlier reports are evidence, not additional generation instructions.

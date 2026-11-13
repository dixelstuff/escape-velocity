# Level-design reset — 13 November 2026

This is a retrospective, not an additional generation brief. `LEVEL_DESIGN.md` alone defines editorial generation. No holes, public ordering, gameplay, scoring or saved data are changed by this reset.

## Verified positive reference

The latest explicit overall endorsement found in this chat is **12 November 2026, 10:36 Melbourne time**, referring to the thirty-hole grounded-discoveries batch: “Overall this set was better to play.” The wording “best ones yet” was not found in the available chat history and is not attributed as an exact earlier quote.

The batch is recorded in [grounded discoveries](../grounded-discoveries-thirty/README.md); the design-file revision used for publication was `f2af945`. The accompanying feedback contains three 5/5 holes and seven satisfying transitions among thirty. BATTER–HEARING–CONFESS, QUIVER–PERFORMANCE–SURRENDER and WARD–PROTECTION–REFRAIN were the three 5/5s. This is an overall positive reference, not proof that every instruction then in force caused its success.

Earlier support for a light baseline is visible in `120a6f8` and `e95c348`: choose familiar words freely, let players discover connections, use six opening probes, and replace clear problems without repeatedly refining candidates. The player described the specific-words twenty as generally pretty good; [its report](../specific-words-twenty/README.md) retains the batch record.

## What drifted afterwards

| Change | Intention | How it encouraged over-design |
|---|---|---|
| After the grounded-discoveries feedback, recorded in `3dd737e` | Reward reconsidering an approach | Awkward expected arrivals and flags chosen against likely landings became compositional targets. These should have remained explanations of enjoyable play, not requirements for selecting triples. |
| `949d22b` | Avoid arbitrary gaps and vary contexts | The brief asked for recognisable alternative approaches and distinct neighbourhood opportunities. Generating to demonstrate these features still encouraged planned conceptual handoffs and a new slot template. |
| `c0bd111` | Restore naturalness and approachable flags | The qualification was useful, but detailed tee/dogleg/flag roles and the worked BOULDER route remained. "Several familiar associations" could still be satisfied by obvious category/domain pairings. |
| Execution across the later batches | Pass the light access checks | Candidates were repeatedly adjusted in individual slots, especially doglegs, until enough opening probes passed. This contradicted earlier replacement guidance. The check became an optimisation target instead of a rejection warning. |

The latest four playtests make the failure concrete: CHOP–FORESTRY, LAPEL–TAILORING, ODD–MATHEMATICS and CLUTCH–MECHANIC were all rated too obvious. The last triple's PERMIT flag also sustained the driving context. These would warrant rejection on a short human review before any numerical checks. A literal engine prohibition on directly playing an endpoint does not establish conceptual discovery.

Strictly obtaining sixty unused endpoint words also became an implicit quality certificate. Freshness can prevent repetition, but cannot justify obscure vocabulary, narrow associations or routine combinations. No particular model of difficulty, score or shortest route explains all enjoyment ratings.

This chronology supports the diagnosis of drift; it does not isolate the effect of each edit experimentally. The clearest demonstrated process failure is repeated slot-tuning despite the written lightweight guidance.

## Reset

- Remove the per-slot creative recipe, expected-landing planning and worked successful-route example from the active brief.
- Restore a broad familiar word pool and genuinely random combinations, with no need to imagine why a triple will produce a clever route.
- Make clear invalidity, giveaways, restricted/inexplicable access and stale shortcuts the rejection criteria. Passing these is sufficient; do not demand positive proof of an interesting pivot.
- Replace rejected triples wholesale. Record the pool, random seed, original order and short rejection reasons, so a category-pair repair loop cannot masquerade as random nomination.
- Retain the existing six independent opening probes and light local validity/freshness checks. Add no route search, simulations or scoring analysis.
- Reduce the generation section in AGENTS.md to a pointer and operational safeguards, removing the competing editorial brief. Read the actual design file before each generation and record its hash. Chat feedback changes the file first rather than becoming hidden generation rules.

The pool/seed/rejection record is a small reproducibility artifact, not a search or evaluation campaign. Player feedback remains the authority on enjoyment. New generation is not part of this documentation-only change.

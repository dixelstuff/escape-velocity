# Discovery public twenty — 4 November 2026

The player reports 16 eagles and 8 birdies in the first 24 of the former public fifty. They approve the familiar, natural word style but want fewer obvious short paths. This twenty-hole replacement is a focused playtest before expanding further. The previous fifty are withdrawn from the public view only; all 510 preceding definitions, stable IDs and saved progress remain in the admin archive.

## Public selection

Public #1–#20 are new definitions, admin #482–#501. There are 530 permanent definitions / 501 non-retired archive holes after this append. Internal dates 2028-03-13 through 2028-04-01 are stable scheduling IDs, not player-facing availability limits. Public viewers have only this selection and no custom creator; admin retains the archive and creation tools. Loading a replacement selection is not a data reset.

| Public # | Tee | Dogleg | Flag | Editorial mix |
| --- | --- | --- | --- | --- |
| 1 | RUMOUR | REPAIR | TIDE | welcoming |
| 2 | CURTAIN | PATIENCE | CHARGE | discovery |
| 3 | GLANCE | COURAGE | RIBBON | welcoming |
| 4 | ANCHOR | MERCY | RESTLESS | discovery |
| 5 | PROUD | FRICTION | LETTER | discovery |
| 6 | FLUSH | JUSTICE | FEATHER | welcoming |
| 7 | STEADY | RUMOUR | LOCK | discovery |
| 8 | STUMBLE | MERCY | INK | discovery |
| 9 | GLEAM | BURDEN | WITNESS | welcoming |
| 10 | WHISPER | DUTY | CANVAS | discovery |
| 11 | CHILL | PROMISE | SADDLE | discovery |
| 12 | FAINT | BARGAIN | CROWN | welcoming |
| 13 | SCRATCH | WELCOME | RECEIPT | discovery |
| 14 | STROKE | LOYALTY | WINDOW | discovery |
| 15 | FAVOUR | SIGNAL | BRUISE | welcoming |
| 16 | TWIST | CONSENT | BLANKET | discovery |
| 17 | HOLLOW | LOYALTY | TUNE | discovery |
| 18 | THIRST | HONOUR | SCREEN | welcoming |
| 19 | LEAN | RESCUE | SCENT | discovery |
| 20 | FLOAT | PAYMENT | VELVET | discovery |

## Selection process

Sixty word-only nominations preceded checks. Thirty-one independently described words extend the previously frozen everyday context graph; no complete routes were authored or inserted into live definitions. Twenty-four combinations received additional actual-landing/shared-onward-pool review; twenty were retained after critical review. [Nominations](nominations.json), [independent context additions](contexts-additions.json), [editorial review](candidate-review.json), [final word-only proposals](proposals.json).

Seven are intended as welcoming and thirteen as discovery holes, mixed through the order. These are editorial hypotheses, not predicted eagle/birdie counts. There is no per-hole minimum solution length. The selection favours familiar multi-use words and distinct onward opportunities rather than maximum vector distance, rare vocabulary or a prescribed clever bridge. No gameplay or scoring changes accompany the batch.

The same two-manual-choice natural-context probe found 31 <=3-stroke routes across 13 of the old first 24 holes, versus five across three of the new twenty. It includes active targets and current dogleg/automatic-finish rules. This is exhaustive only within the stated pool/configuration, not all vocabulary or all short solutions. In particular, eleven of the old first 24 had no sampled short route despite all 24 being eagles/birdies in human play: do not treat a zero as proof of difficulty. [Exact comparison](short-comparison.json).

All selected triples have a complete engine-validated natural-context witness and differing onward options from multiple reached landing words. These witnesses are safety evidence, not intended solutions; some are long because the bounded checker prioritises viable handoffs rather than shortest completion. None of the selected safety witnesses depends on repeating a word across legs. Real players can find different or shorter routes. The alternative-landings analysis uses a shared pool across landings; raw generic mechanically valid finishes are distinguished from independently context-supported ones. Both are recorded, not conflated with human semantic judgement. [Selected safety/landing evidence](safety.json), [screening all sixty](screening.json), [shortlisted landing checks](choices.json).

Excluded examples: PEEL–AMBITION–QUIET offered too many immediate finishes from reached landings; GRACE–BORROW–THUNDER lacked a demonstrated opening in the bounded pool; PLEDGE–FLAVOUR–STRAIN failed the existing direct-leg check. Several other nominations had repeated-word safety witnesses, narrow openings or less persuasive contextual handoffs. Holding a nomination is not a declaration that it is impossible or always unenjoyable.

## Mechanics and persistence

All twenty use unchanged Par 5 mandatory-dogleg settings: final threshold .27, waypoint .265, launch .095–.215, subsequent second-leg finish span .12, UK/US spelling equivalence, unlimited continuous play, no curated golden routes. The twelve excluded generic words are removed from context checks and every published diagnostic shot is checked against the live input policy. Historical replay remains intact. Terrain direction alternates; existing seeded per-hole variation applies.

The previous fifty stay available in admin. Their records are not removed, renumbered internally, rescored or copied into the new holes. Public recent finishes/stats remain scoped to the active selection. Surviving/new definitions use the same shared IDs in public and admin.

## Verification and reproduction

- `node scripts/check_discovery_twenty.mjs`: fixed sixty nominations, bounded approach/finish checks and two-input short probes.
- `node scripts/check_discovery_choices.mjs`: shared-pool landed-state checks for the fixed shortlist; compact output retains exact successful/advancing/finishing word sets.
- `node scripts/compare_discovery_shortcuts.mjs`: same-pool short-route comparison against the prior first 24.
- `node tests/test_discovery_public_twenty.mjs`: 20 independent complete replays, 323 onward-shot probes, all sampled short finishes replayed, unchanged old archive, scoped stats, exact preserved saves and public numbering.
- `scripts/append_discovery_public_twenty.mjs` is a one-time publisher and rejects a duplicate append. `safety.json` is the selected/reordered subset of `choices.json`, bound to proposal/direction hashes.
- Former fifty/rebalanced tests retain their frozen historical selection; the new test owns current-public assertions, rather than deleting or weakening the old archive checks.
- Isolated desktop/mobile Chrome checks verified public selection of the first and last new holes, exactly twenty choices, retained hidden old records, no page errors and access to all 501 archive holes in admin. No real browser profile/storage was used.

Playtest results, not these checks or the intended 7/13 mix, will decide whether this set achieves the desired feel.

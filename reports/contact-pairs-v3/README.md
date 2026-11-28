# Approved contact floor 0.18 — frequency-phrases-v3

Selected by the user on 28 November 2026. This release implements a versioned contact-only supplement, not a vector/model replacement.

## Frozen membership and user decisions

`selection.json` freezes **605 unordered pairs**: 564 accepted modern associations and 41 accepted phrases. The phrase total is eight accepted from the random 200-pair review plus 33 accepted from the suggested 50-pair review. **604 pairs have incoming and outgoing roles. DATA–CENTRE remains outgoing-only.** Spelling variants use the existing curated identity/model-ID mapping.

The latest 17 exclusions are PART–TIMER, RUST–FREE, BOOK–TOKEN, FOOTBALL–TEE, DARK–NET, WEEKEND–WARRIOR, KISSING–DISEASE, SPEECH–BALLOON, ROSE–QUARTZ, BOT–NET, FROG–KICK, NAVY–BEAN, FROST–BOUND, NUT–HOUSE, SURGICAL–SPIRIT, BONE–IDLE and TORNADO–CELLAR. All previous rejected/withheld modern relationships and the 192 rejected random phrase pairs remain outside the supplement. These exclusions do not remove existing dictionary allowances or ban words.

Explicit decisions are preserved in `../word-centred-modern-associations-2026-11-28/user-review.json`; the shortlist has per-pair decisions in `phrase-floor/suggested-phrase-review-50.csv` under that directory. Future edits to research reviews do not silently update the frozen runtime selection.

Build with `node scripts/build-contact-pairs-v3.mjs`. The generated `static/contact-recognized-pairs.mjs` is 7,164 bytes, using existing model IDs, sorted numeric keys and role flags. Its model/vocabulary binding is checked against the frozen v2 table. `data-manifest.json` records hashes of the selection, generated module and untouched v1/v2 tables. Attribution is in `static/CONTACT-SOURCES.md`. No runtime dictionary, LLM, server or network scoring service is added.

## Exact mechanics

Retain all existing v2 dictionary membership, frequencies, incoming/outgoing allowances and custom-setting fallback behavior. Add the approved supplement only under v3. Rejected/unreviewed existing dictionary pairs retain their old allowances and do not acquire a floor.

For approved incoming origin/played membership:

```
effective_contact = max(raw_cosine + 0.130, 0.18)
required = max(0, ordinary_required - rarity - outgoing + frequency_penalty)
connected = effective_contact + 1e-7 >= required
```

The existing incoming 0.130 is counted **once**, on the evidence side rather than also subtracting it from the requirement. The floor includes that credit. Preserve stronger contact and do not add 0.130 after taking the maximum. Retain rarity maximum 0.038, frequency penalty maximum 0.005, hub correction, and outgoing 0.040 tapered by **raw** origin/played cosine from 0.10 to 0.25. Reviewed outgoing membership extends the existing allowance; it does not add a second outgoing credit or grant incoming eligibility to DATA–CENTRE. Source-restricted research masks do not inherit the supplement.

`launch` remains raw vector cosine. Recognized submitted shots additionally save `effective_contact` and `contact_floor`. Existing internal plural/family rescue tolerances and legal hit margins use effective contact when present; raw semantic measurements remain raw. Fixed first-leg rescue keeps the entered word's original requirement, destination and safety, replacing only candidate contact evidence. Assessment raw-cosine cutoffs are algebraically consistent with the new predicate, including negative contacts.

Destinations, safety, dogleg inclusion, actual landing word, next-shot semantic position, target/flag thresholds and automatic finishing predicates are unchanged. The floor does not carry to an unrelated next shot or enter `finishRequirement`. No direct new Cleverness bonus or scorer-identity change is made. Legal counterfactual checks use the correct saved contact rule; ingenuity still uses the original vectors. No model/vocabulary data or real browser storage is altered.

## Activation, replay and persistence

- Fresh eligible standard browser games start with `{version:'frequency-phrases-v3', after:0}`. Offline `Game` construction remains explicit and never silently upgrades historical settings.
- Existing browser games adopt v3 on the next valid submitted shot, including a legal-input miss. Invalid input, restore, retry cancellation, display and result review do not adopt it.
- `contact_adjustment.previous` now supports strictly decreasing v3 → v2 → v1 versions and activation indices. Each old prefix is replayed under its own saved rule. Unversioned stretches remain unversioned.
- Retrying before a boundary prunes only policies which governed no retained shot. The new suffix starts v3 at the retained prefix length; earlier v2/v1 boundaries remain exact.
- Current semantic/cache keys already include the complete saved contact policy. Browser entry, engine and worker import graphs use `contact-floor18-v1` cache tokens. Scorer identity and progress are not reset.
- Existing bunker/headwind/alternate-vector eligibility exclusions remain in place.

## Verification

`node tests/test_contact_pairs_v3.mjs` passes: all 605 exact memberships and rejected/held controls; 1,208 directional incoming geometry/safety/assessment checks; single credit and raw evidence; positive and negative shots; unchanged finishing and next-shot position; outgoing-only DATA–CENTRE; exact spelling; nested rule validation, browser adoption, invalid input, restore, retry and cache-boundary identity. The v2 golden test now explicitly requests v2 for its frozen 101 fixtures while browser-adoption assertions follow the current version.

Local research validation replayed **10,460 historical contexts with zero differences** in saved-rule contact, destination, success, safety, outcomes, credited forms, arrivals and finishing. Results: `historical-replay.json`.

The exact production release was prepared in an isolated checkout, excluding unrelated working-tree experiments and offline research edits. **All 158 Pages deployment checks pass**, including the new contact-floor test and the committed landscape tests. Full results: `release-regression-results.json`. The earlier mixed-workspace landscape failure was unrelated and is absent from this release. No regression was observed in scoring, persistence, mobile UI, input/spelling, dogleg geometry/finishing, worker/cache or contact tests.

Syntax checks and `git diff --check` pass. The frozen v1/v2 tables and model files retain their original hashes. Build/test scripts do not reset scores or access real player storage. Publishing uses the normal checked GitHub Pages workflow.

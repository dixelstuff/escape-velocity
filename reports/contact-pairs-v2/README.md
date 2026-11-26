# Reviewed contact-pair expansion

Standard new exploration uses `frequency-phrases-v2`: 30,770 retained original pairs plus 1,527 reviewed additions, for 32,297 unordered pairs. The selected additions have both an editorial relationship judgment and an authoritative-engine miss-to-hit example. Eighty-eight original pairs lacked a useful threshold example in the tested likely-scenario envelope and are excluded from normal v2 membership. That is a bounded editorial/data selection, not a proof about every possible future triple.

The existing recipe is unchanged: rarity maximum 0.038, frequent-word surcharge maximum 0.005, incoming allowance 0.130 and outgoing allowance 0.040 tapered by actual ball/played contact from 0.10 to 0.25. Existing hub, spelling, plural/family rescue, destination, safety, dogleg, finishing and Cleverness rules remain unchanged.

## Compact data and compatibility

`selection.json` freezes the reviewed additions, exclusions and incoming-role certificate. `node scripts/build-contact-pairs-v2.mjs` builds `static/contact-pair-table.mjs` deterministically. The generated table reuses the model's word IDs; it does not ship another word list. Its vocabulary fingerprint prevents use with an incompatible vocabulary ordering. `data-manifest.json` records counts, sizes and hashes.

The table encodes the exact original v1 source masks alongside v2 role bits. Frequencies remain exactly the frozen hundredths, including curated spelling-equivalence group values. `static/contact-data.mjs` stays unchanged as an archival/build reference; normal runtime contact lookup no longer imports it. The compact module includes all frequency values and lossless v1 compatibility, not just the v2 pair packet.

Incoming role omission covers spelling aliases, both played-word directions and existing rescue contact representations. The certificate is scoped to base contact maximum <=0.25 and plural tolerance <=0.025. Wider custom settings use full original-plus-added membership, including the normal v2 exclusions. Incoming omission is not applied to outgoing membership: a strong played/target pair can still help weaker ball/played contact. The finishing requirement never consumes a contact allowance.

## Saved rules and activation

Unversioned historical games retain unadjusted contact. A saved `frequency-phrases-v1` game continues to restore and score with its exact v1 table. Restoring/displaying a game does not adopt v2. On the next valid committed shot in eligible standard play, the browser adds v2 at the retained prefix length. Invalid or blocked input cannot change that boundary.

A mixed state can contain:

```json
{"version":"frequency-phrases-v2","after":4,"previous":{"version":"frequency-phrases-v1","after":1}}
```

Here shot indexes 0, 1–3 and 4 onward use unadjusted, v1 and v2 contact respectively. Retry prefixes replay their retained words under their saved versions and activate v2 only for new exploration. State serialization clones the previous boundary. Semantic/scoring cache identities already include the complete contact-rule object; the live scorer identity is unchanged. No player storage, bests, hole IDs or score identity is reset.

## Validation

`node tests/test_contact_pairs_v2.mjs` verifies all 30,858 frozen v1 source masks, all 36,063 frozen frequency identities, the 101 reviewed gains, mixed-version restore/adoption/retry, custom-setting fallback and scoring replay. The new test is a Pages deployment check.

`tests/fixtures/contact-pairs-v2.json` contains anonymised mechanical settings and word prefixes for those 101 cases. It contains no private export files or player IDs. The full local release replay is recorded in `replay-verification.json`: 15,800 historical observations / 7,288 distinct shot contexts, 101 extra hits, zero lost hits, zero changed semantic destinations and no changed arrival/finish outcome for previously successful shots. Historical replay matches exactly. Whole-route outcomes and future player enjoyment are not inferred from single-shot counterfactuals.

The complete deployment-check results are in `deployment-checks.json`. Browser/worker import graphs use the `contact-pairs-v2` cache token, independently of saved rule identities.

# Scorecards 8 review

Compared journey IDs with scorecards (7): 321 rounds total, 272 retained from that file and 49 additional rounds. Additional rounds: 29 ABTT, 15 Current and 5 LS. These include deliberate replays and exploratory words, so attempt counts are not an unbiased difficulty comparison. Older rounds also predate the current Success-mode rules.

## Matched recent play: DEPLOY → POPE

- DEPLOY → MOBILE → TOUR → POPE succeeds in three shots with Current, ABTT and LS. The final POPE shot is automatic.
- DEPLOY → WAR → POPE succeeds in two shots in all three.
- DEPLOY → AID → CHARITY → POPE succeeds with ABTT. In LS, AID and CHARITY both connect, but CHARITY is a small recovery step rather than a finish setup. With two shots used and no automatic finish available, par becomes unreachable and the attempt ends. Current was not tested on this exact route in this recent group.

Thus the models preserve the two main tested routes but differ on a marginal alternative. This supports continued route comparison; it does not establish an overall winner or justify a global threshold change. Earlier added examples such as ABTT PLAGUE → BLACK → RANCH and PAR → GOOD → NURSE remain candidates for subjective bridge-quality review, rather than evidence that every newly enabled bridge is desirable.

## Reset investigation

The compact submitted history is around 1.9 MB of JSON. Browser storage may count UTF-16 code units, and reset previously tried to store a full recovery copy alongside the full active history. A simulated 2.5-million-character limit reproduced failure with the old order. Replacing the active batch with the fresh round first, then storing the archive, succeeds on the actual 321-round input. All 321 prior rounds remain recoverable; the next export contains only the new batch. A regression test also verifies rollback if writing the archive fails. Browser quota is a reproduced likely cause, not a direct inspection of the user's mobile storage.

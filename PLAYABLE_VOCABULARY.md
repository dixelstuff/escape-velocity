# Playable vocabulary policy

`static/playable-vocabulary.mjs` blocks YES, YEAH, BUT, ACTUALLY, INDEED, REALLY, HOWEVER, PERHAPS, VERY, ALSO, MAYBE and SOMEONE from fresh browser submissions and new tee/dogleg/flag definitions. Rejections display exactly “Word not allowed. Try another.” Inputs are trimmed and case-normalised; rejection consumes no shot and precedes word-pack loading. Substrings such as BUTTER are unaffected. The live engine client is the enforcement boundary for both public and admin play, including resumed old games.

Vector rows, semantic neighbourhoods and model assets are deliberately retained. `Game` remains the authoritative historical replay engine: restore, retry-prefix, diagnostics and scoring can reproduce saved routes containing these words. They do not accept a new blocked submission through the browser client. No saved progress or Cleverness formula is changed. Pure offline research using Game must apply `checkLiveVocabulary` when evaluating newly playable input policies.

The read-only dogleg hint is suppressed for a blocked target in an old custom hole; new custom definitions reject it. Existing completed results remain reviewable.

Run `node tests/test_playable_vocabulary.mjs`. This checks exact-word matching, new endpoints, browser-client rejection without state mutation and historical replay with retained real vectors. No vocabulary/model regeneration is required.

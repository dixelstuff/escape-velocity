# Durable results across public/admin — 6 November 2026

## Confirmed failures

1. Player summaries contained full best-route states but were still saved in localStorage. Filling that small store caused the summary write to fail while the IndexedDB shot history could still save. In one tab, a result was visible in memory and missing after reload. An isolated native-Chrome control reproduced this with 5.2 MB of unrelated localStorage padding.
2. A cached older public/admin view could write its entire snapshot over newer records. This also applies to retained page instances during browser navigation, not just two simultaneous tabs.
3. Migration from a localStorage fallback blindly replaced existing IndexedDB values. An older fallback could therefore replace newer records when database access recovered.

These are reproduced code paths, not proof of which one occurred on the player's device. Public/admin normal mode share one origin/store. Public presentation is filtered to the current collection; admin includes the archive. That filtering can also make totals differ without data deletion.

## Changes

- Player results join the detailed shot history in the existing `word-golf-play-archive` IndexedDB database. Only small reset metadata remains in localStorage. Legacy and namespaced keys migrate automatically.
- Existing and incoming records merge within an IndexedDB read/write transaction. The two independently saved bests remain monotone: fewest strokes, and highest current-version Cleverness. Equal routes retain their complete saved geometry. Current scorer versions supersede obsolete versions. Completed/pending rescoring keeps its existing semantics.
- Journey IDs are unioned; newer journey states and matching completed-route reports are retained. Cached snapshots cannot simply replace the whole newer log.
- Migration merges old local fallbacks with database records. It deletes a local copy only after commit and only if that exact local copy has not changed while awaiting the database.
- Startup can recover missing result summaries from retained completed journeys, without changing a player's active unfinished lie. It cannot recover information absent from both stores.
- Returning via the browser back button or returning to a visible page refreshes the durable store and summaries without changing the active lie or entry focus.
- Export refreshes the current saved log, while explicit history clearing retains its existing new-namespace reset contract. Old batches are not merged into the current export batch. No real player data was cleared during development/testing.
- An unavailable/failed history database exposes a warning while using limited fallback storage; it no longer silently appears to be a fresh empty account.
- Unchanged own-log snapshots are not repeatedly reparsed on synchronous saves; database commits still perform the authoritative atomic merge. Modules are cache-versioned together.

The hole definitions, game mechanics, scoring formula, word model and public/admin access controls are unchanged. Public statistics still cover its current collection; admin also exposes archived holes. No backend or account has been added. Browser storage can still fail if unavailable, denied, ephemeral, or the entire origin quota is exhausted; existing save warnings and memory-backed export remain available.

## Validation

`node tests/test_shared_play_storage.mjs` covers a one-tab localStorage quota failure, stale public/admin views, interleaved atomic saves, best preservation, equally scored state preservation, fallback migration and a concurrent local change during migration, recovery from completed logs, unfinished-lie preservation, explicit reset and stale-reset rejection.

Existing reset, storage/quota recovery, log/export, player-best, daily-game and dogleg-scoring tests retain their original assertions. A rescoring regression caught an obsolete pending candidate being reintroduced during merge; the merge now drops that candidate once an equal-or-better current-version best has consumed it.

Isolated native Chrome verification:

- Reproduced the old one-tab failure with 5.2 MB localStorage padding.
- New IndexedDB result/log writes survived that same local quota and reload.
- Independent cached views preserved two results and all three test journeys, including the improved three-stroke best.
- An older fallback summary was merged without downgrading the database best.
- Same-tab public → admin navigation preserved those results.

Real UI recovery test using a **copy** of the supplied 707-journey export, with its daily summaries deliberately absent:

- Public rebuilt 50 completed holes; admin rebuilt 56 because it also contains archived holes; public again showed the same 50.
- Every original journey ID remained in downloads after each navigation.
- A recovered completed hole opened its result card normally.
- No page errors. Test browser profiles were fresh and isolated from the user's browser.

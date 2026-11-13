import {BAND_FREE_VERSION} from './cleverness-score-config.mjs?v=incoming-dogleg-v1';
/** Compare against the best retained BEFORE this completion, never its updated copy.
 * An equal-stroke improvement waits for comparable unrounded Cleverness evidence.
 */
export function isNewBestFinish(state,previous,report){
 if(!state?.won)return false;
 if(!previous||state.attempts<previous.strokes)return true;
 if(state.attempts!==previous.strokes)return false;
 const score=report?.band_free;
 return previous.scoreVersion===BAND_FREE_VERSION&&score?.version===BAND_FREE_VERSION&&
  JSON.stringify(report.route)===JSON.stringify(state.route)&&
  Number.isFinite(previous.cleverness)&&Number.isFinite(score.unrounded_score)&&
  score.unrounded_score>previous.cleverness;
}

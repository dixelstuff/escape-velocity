/** Resume current rules; archive older rules before starting with the current finish rule. */
export function isOpening(state, opening) {
  return state.start===opening.start && state.target===opening.target && state.threshold===opening.threshold && state.word_model===opening.word_model && (state.mode||'fixed')===(opening.mode||'fixed')&&JSON.stringify(state.headwind??null)===JSON.stringify(opening.headwind??null);
}
export function startupAction(saved, opening, retired=[]) {
  if(!saved)return 'opening';
  if(retired.some(h=>h.start===saved.state.start&&h.waypoint?.word===saved.state.waypoint?.word&&h.target===(saved.state.final_target??saved.state.target)))return 'removed';
  if(opening.success_version==='stroke-play-v1'&&saved.state.challenge?.version!=='stroke-play-v1')return 'upgrade';
  if(saved.state.waypoint)return 'restore';
  const state=saved.state;
  if(opening.success_mode&&!state.challenge)return 'upgrade';
  if(opening.success_version&&state.challenge?.version!==opening.success_version)return 'upgrade';
  if(opening.finish_mode==='range'&&state.finish_mode!=='range')return 'upgrade';
  if(!['golf-distance-v3','golf-fixed-v3'].includes(state.rules))return 'upgrade';
  if(state.threshold===.25&&state.launch_min===.09&&state.launch_max===.19)return 'upgrade';
  return 'restore';
}

/** Existing rounds retain settings; restarting the previous standard defaults adopts the new course. */
export function restartSettings(state,opening){
 if(state.waypoint)return {start:state.start,target:state.final_target,threshold:state.final_threshold,waypoint:state.waypoint,par:state.challenge?.par??4,...(state.golden_paths?{golden_paths:state.golden_paths}:{}),mode:state.mode,launch_min:state.launch_min,launch_max:state.launch_max,word_model:state.word_model??''};
 const previous=!state.headwind&&state.mode==='distance'&&state.launch_min===.10&&((state.threshold===.28&&state.launch_max===.21)||(state.threshold===.27&&state.launch_max===.22));
 return previous?{...opening,start:state.start,target:state.target}:{start:state.start,target:state.target,threshold:state.threshold,...(state.challenge?{par:state.challenge.par}:{}),...(state.golden_paths?{golden_paths:state.golden_paths}:{}),mode:state.mode,launch_min:state.launch_min,launch_max:state.launch_max,...(state.word_model?{word_model:state.word_model}:{}),...(state.headwind?{headwind:state.headwind}:{})};
}

/** An explicit fresh restart adopts the bank's re-estimated par; saved attempts do not. */
export function bankRestartSettings(state,opening,puzzles){
 const settings=restartSettings(state,opening);
 const bank=puzzles.find(h=>h.par_estimate&&h.start===state.start&&h.target===(state.final_target??state.target)&&h.waypoint?.word===state.waypoint?.word&&h.threshold===(state.final_threshold??state.threshold)&&h.mode===state.mode&&h.launch_min===state.launch_min&&h.launch_max===state.launch_max&&JSON.stringify(h.headwind??null)===JSON.stringify(state.headwind??null)&&!state.word_model);
 return bank?{...settings,par:bank.par,...(bank.waypoint?{waypoint:{...bank.waypoint}}:{})}:settings;
}

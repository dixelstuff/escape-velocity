/** Resume current rules; archive older rules before starting with the current finish rule. */
export function isOpening(state, opening) {
  return state.start===opening.start && state.target===opening.target && state.threshold===opening.threshold && (state.mode||'fixed')===(opening.mode||'fixed');
}
export function startupAction(saved, opening) {
  if(!saved)return 'opening';
  const state=saved.state;
  if(opening.finish_mode==='range'&&state.finish_mode!=='range')return 'upgrade';
  if(!['golf-distance-v3','golf-fixed-v3'].includes(state.rules))return 'upgrade';
  if(state.threshold===.25&&state.launch_min===.09&&state.launch_max===.19)return 'upgrade';
  return 'restore';
}

/** Existing rounds retain settings; restarting the previous standard defaults adopts the new course. */
export function restartSettings(state,opening){
 const previous=state.mode==='distance'&&state.threshold===.28&&state.launch_min===.10&&state.launch_max===.21;
 return previous?{...opening,start:state.start,target:state.target}:{start:state.start,target:state.target,threshold:state.threshold,mode:state.mode,launch_min:state.launch_min,launch_max:state.launch_max};
}

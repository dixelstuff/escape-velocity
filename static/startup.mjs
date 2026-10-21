/** Resume current rules; archive older rules before starting with the current finish rule. */
export function isOpening(state, opening) {
  return state.start===opening.start && state.target===opening.target && state.threshold===opening.threshold && state.word_model===opening.word_model && (state.mode||'fixed')===(opening.mode||'fixed')&&JSON.stringify(state.headwind??null)===JSON.stringify(opening.headwind??null);
}
export function startupAction(saved, opening) {
  if(!saved)return 'opening';
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
 const previous=!state.headwind&&state.mode==='distance'&&state.launch_min===.10&&((state.threshold===.28&&state.launch_max===.21)||(state.threshold===.27&&state.launch_max===.22));
 return previous?{...opening,start:state.start,target:state.target}:{start:state.start,target:state.target,threshold:state.threshold,mode:state.mode,launch_min:state.launch_min,launch_max:state.launch_max,...(state.word_model?{word_model:state.word_model}:{}),...(state.headwind?{headwind:state.headwind}:{})};
}

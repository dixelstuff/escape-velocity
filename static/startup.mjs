/** Resume current rules; archive older rules before starting with the current finish rule. */
export function isOpening(state, opening) {
  return state.start===opening.start && state.target===opening.target && state.threshold===opening.threshold && (state.mode||'fixed')===(opening.mode||'fixed');
}
export function startupAction(saved, opening) {
  if(!saved)return 'opening';
  const state=saved.state;
  if(!['golf-distance-v2','golf-fixed-v2'].includes(state.rules))return 'upgrade';
  if(state.threshold===.25&&state.launch_min===.09&&state.launch_max===.19)return 'upgrade';
  return 'restore';
}

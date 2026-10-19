/** Resume current rules; archive older rules before starting with the current finish rule. */
export function isOpening(state, opening) {
  return state.start===opening.start && state.target===opening.target && state.threshold===opening.threshold && (state.mode||'fixed')===(opening.mode||'fixed');
}
export function startupAction(saved, opening) {
  if(!saved)return 'opening';
  const state=saved.state;
  if(!['golf-distance-v1','golf-fixed-v1'].includes(state.rules))return 'upgrade';
  return 'restore';
}

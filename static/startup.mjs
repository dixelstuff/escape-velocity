/** Resume current rules; archive older rules before starting an easier journey. */
export function isOpening(state, opening) {
  return state.start===opening.start && state.target===opening.target && state.threshold===opening.threshold && (state.mode||'fixed')===(opening.mode||'fixed');
}
export function startupAction(saved, opening) {
  if(!saved)return 'opening';
  const state=saved.state;
  if(!['distance-v2','fixed-threshold-v3'].includes(state.rules))return 'upgrade';
  const previousDefaults=state.threshold===.30 && state.launch_min===.12 && state.launch_max===.30;
  if(previousDefaults)return 'upgrade';
  return 'restore';
}

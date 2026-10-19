/** Preserve real progress; replace only the untouched original default journey. */
export function isOpening(state, opening) {
  return state.start===opening.start && state.target===opening.target && state.threshold===opening.threshold && (state.mode||'fixed')===(opening.mode||'fixed');
}
export function startupAction(saved, opening) {
  if(!saved)return 'opening';
  const state=saved.state;
  const legacy=(state.rules||saved.rules||'fixed-threshold-v1')==='fixed-threshold-v1';
  const untouched=state.attempts===0 && state.history?.length===0 && saved.entries.length===0;
  if(legacy&&untouched&&state.start==='forest'&&state.target==='money'&&!isOpening(state,opening))return 'opening';
  return 'restore';
}

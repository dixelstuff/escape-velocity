/** Presentation only: failed swings remain counted in the original scorecard. */
export function failedShotSummary(state) {
 const history=state?.history??[];
 const misses=history.filter(e=>e.outcome==='miss').map(e=>e.word);
 const penalties=history.filter(e=>e.outcome==='water').map(e=>e.word);
 return [misses.length?`Miss hits: ${misses.join(', ')}`:'',penalties.length?`Penalty hits: ${penalties.join(', ')}`:''].filter(Boolean).join(' · ');
}
/** Course words are labels only; all shots are entered in the input. */
export function mapWordAction(){return 'none';}

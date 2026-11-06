import {bunkerExperimentSettings} from './semantic-bunker.mjs?v=bunker-two-legs-v1';
/** Hand-picked opt-in examples. Neither original definitions nor public order change. */
export const BUNKER_EXAMPLE_WORDS=Object.freeze([
 {tee:'spare',dogleg:'dream',flag:'tension',bunker:'sleep'},
 {tee:'promise',dogleg:'shadow',flag:'luck',bunker:'doubt'},
 {tee:'charm',dogleg:'split',flag:'duty',bunker:'love'},
 {tee:'dress',dogleg:'freedom',flag:'spark',bunker:'free'},
 {tee:'circle',dogleg:'rescue',flag:'warm',bunker:'fire'}
]);
export function bunkerExamples(manifest){
 return BUNKER_EXAMPLE_WORDS.map((words,i)=>{
  const source=manifest.holes.find(h=>h.settings.start===words.tee&&h.settings.waypoint.word===words.dogleg&&h.settings.target===words.flag&&!h.settings.bunker_experiment);
  if(!source)throw Error('Missing bunker example source: '+words.tee);
  return {number:i+1,source,settings:bunkerExperimentSettings(source,true,words.bunker,.4,false)};
 });
}

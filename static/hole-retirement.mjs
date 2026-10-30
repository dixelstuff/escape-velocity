import {spellingIdentity} from './spelling-equivalence.mjs?v=uk-us-v1';
/** Retire from play and visible stats, retaining original definitions and saved history. */
export const retiredHoleWords=[
 ['avocado','bravado','embargo'],
 ['gondola','mechanism','concerto'],
 ['suitcase','forestry','xylophone'],
 ['daffodil','electronics','garlic'],
 ['cassette','genetics','corkscrew'],
 ['urchin','jeweler','lute'],
 ['avocado','goal','embargo'],
 ['dive','camp','trivia'],
 ['straw','housing','aviary'],
 ['turnstile','irrigation','bassoon'],
 ['manatee','buoyancy','champagne'],
 ['doughnut','cosmology','bathtub'],
 ['jigsaw','celebrity','avalanche'],
 ['spatula','masonry','pianist'],
 ['caribou','knitting','catapult'],
 ['guava','horticulture','robin'],
 ['okra','conservation','swallow'],
 ['bellows','forge','clover']
];
const retiredKeys=new Set(retiredHoleWords.map(words=>words.map(spellingIdentity).join('|')));
export function isRetiredHole(hole){
 const s=hole?.settings??hole;
 if(!s)return false;
 const words=[s.start??s.tee,typeof s.waypoint==='string'?s.waypoint:s.waypoint?.word,s.final_target??s.target??s.flag];
 return retiredKeys.has(words.map(w=>spellingIdentity(String(w??'').trim().toLowerCase())).join('|'));
}

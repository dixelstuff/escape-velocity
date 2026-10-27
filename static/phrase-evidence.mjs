import data from './phrase-evidence-data.mjs?v=golf-v185';
import {lexicalRelation} from './lexical-relations.mjs?v=golf-v185';
const wordIds=new Map(data.words.map((w,i)=>[w,i]));
function lookup(a,b){
 const left=wordIds.get(a),right=wordIds.get(b);if(left===undefined||right===undefined)return [];
 const x=Math.min(left,right),y=Math.max(left,right);let lo=0,hi=data.entries.length-1;
 while(lo<=hi){const mid=(lo+hi)>>>1,row=data.entries[mid],order=row[0]-x||row[1]-y;if(order===0)return row[2].map(item=>item.map(i=>data.labels[i]));if(order<0)lo=mid+1;else hi=mid-1;}
 return [];
}
export const phraseCoverage=data.coverage;
export function pairEvidence(a,b){
 const key=[a,b].sort().join('\0'),matches=(lookup(a,b)).map(([kind,label,url])=>({type:kind==='synonym'?'dictionary-supported semantic relationship':kind==='wiktionary-compound'?'compound':'dictionary multiword term',label,source:kind.startsWith('wiktionary')?'English Wiktionary':'Princeton WordNet 3.0',url:url??(kind==='synonym'?'https://wordnet.princeton.edu/':'https://wordnet.princeton.edu/'),synset:kind==='synonym'?label:null,kind}));
 const morphology=lexicalRelation(a,b);
 return {matches,morphology,phrase_matches:matches.filter(m=>m.kind!=='synonym'),dictionary_semantic:matches.filter(m=>m.kind==='synonym'),wiktionary_pair_queried:(data.coverage.wiktionary?.queried_pairs??[]).some(p=>p.join('\0')===key),frequency:null,pmi:null,npmi:null,uncertainty:matches.length?'Dictionary evidence is attested, but intended sense is not determined.':'No match in this limited source coverage; this is not proof no expression exists.'};
}

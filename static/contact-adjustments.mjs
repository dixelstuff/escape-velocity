/** Versioned submitted-contact policy; never chooses a semantic destination. */
import data from './contact-pair-table.mjs?v=vocabulary-expansion-v1';
import recognized from './contact-recognized-pairs.mjs?v=contact-floor18-v1';
import {spellingIdentity} from './spelling-equivalence.mjs?v=vocabulary-expansion-v1';
export const CONTACT_ADJUSTMENT_VERSION='frequency-phrases-v3';
export const PREVIOUS_CONTACT_ADJUSTMENT_VERSION='frequency-phrases-v2';
export const LEGACY_CONTACT_ADJUSTMENT_VERSION='frequency-phrases-v1';
const versions=[LEGACY_CONTACT_ADJUSTMENT_VERSION,PREVIOUS_CONTACT_ADJUSTMENT_VERSION,CONTACT_ADJUSTMENT_VERSION];
if(recognized.version!==CONTACT_ADJUSTMENT_VERSION||recognized.vocabulary!==data.vocabulary||recognized.wordCount!==data.wordCount||recognized.model!==data.model||recognized.keys.length!==recognized.flags.length)throw Error('Recognized contact data does not match the word model.');
const unpack=base64=>Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
const encoded=unpack(data.keys),flags=unpack(data.flags),pairs=new Uint32Array(flags.length);
const frequencies=new DataView(unpack(data.frequencies).buffer);
let offset=0,total=0;
for(let i=0;i<pairs.length;i++){
 let delta=0,multiplier=1,byte;
 do{if(offset>=encoded.length)throw Error('Incomplete contact pair data.');byte=encoded[offset++];delta+=(byte&127)*multiplier;multiplier*=128;}while(byte&128);
 total+=delta;pairs[i]=total;
}
if(offset!==encoded.length||frequencies.byteLength!==data.wordCount*2)throw Error('Invalid contact pair data.');
// Cache-token imports can coexist in a worker/test realm. Share only the model
// vocabulary index, not rule state or pair data, across those module instances.
const registryKey=Symbol.for('word-golf.contact-vocabulary.'+data.vocabulary);
const registry=globalThis[registryKey]??(globalThis[registryKey]={models:new WeakMap(),bound:null});
const vocabularies=registry.models;
function fingerprint(words){let h=2166136261;for(const word of words){for(let i=0;i<word.length;i++)h=Math.imul(h^word.charCodeAt(i),16777619)>>>0;h=Math.imul(h^10,16777619)>>>0;}return h.toString(16).padStart(8,'0');}
export function bindContactModel(e){
 const words=e?.words;if(!Array.isArray(words))return null;
 const compatible=(data.compatibleVocabularies??[{wordCount:data.wordCount,vocabulary:data.vocabulary}]).find(v=>v.wordCount===words.length);if(!compatible)return null;
 let index=vocabularies.get(words);
 if(!index){
  if(fingerprint(words)!==compatible.vocabulary)throw Error('Contact data does not match the word model.');
  index=new Map();words.forEach((w,i)=>{const id=spellingIdentity(w);if(!index.has(id)||w===id&&(i<(data.baseWordCount??data.wordCount)||index.get(id)>=(data.baseWordCount??data.wordCount)))index.set(id,i);});vocabularies.set(words,index);
 }
 registry.bound=index;return index;
}
const vocabulary=e=>e?bindContactModel(e):registry.bound;
export function contactFrequency(word,e){const i=vocabulary(e)?.get(spellingIdentity(word));return i==null?null:frequencies.getUint16(i*2,true)/100;}
export function contactPairFlags(a,b,e){
 const index=vocabulary(e),x=index?.get(spellingIdentity(a)),y=index?.get(spellingIdentity(b));if(x==null||y==null||x===y)return 0;
 const key=Math.min(x,y)*65536+Math.max(x,y);let lo=0,hi=pairs.length-1;
 while(lo<=hi){const mid=(lo+hi)>>>1,value=pairs[mid];if(value===key)return flags[mid];if(value<key)lo=mid+1;else hi=mid-1;}return 0;
}
/** Additional reviewed roles only; old dictionary membership stays frozen. */
export function recognizedContactPairFlags(a,b,e){
 const index=vocabulary(e),x=index?.get(spellingIdentity(a)),y=index?.get(spellingIdentity(b));if(x==null||y==null||x===y)return 0;
 const key=Math.min(x,y)*65536+Math.max(x,y);let lo=0,hi=recognized.keys.length-1;
 while(lo<=hi){const mid=(lo+hi)>>>1,value=recognized.keys[mid];if(value===key)return recognized.flags[mid];if(value<key)lo=mid+1;else hi=mid-1;}return 0;
}
/** Frozen source bits remain available for exact v1 replay and diagnostics. */
export const contactPhraseSources=(a,b,e)=>contactPairFlags(a,b,e)&7;
const clip=x=>Math.max(0,Math.min(1,x));
export function contactAdjustmentTerms(e,origin,word,target,sourceMask=7,version=LEGACY_CONTACT_ADJUSTMENT_VERSION,settings={}){
 const frequency=contactFrequency(word,e),rawContact=e.cosine(origin,word);
 const incomingFlags=contactPairFlags(origin,word,e),outgoingFlags=contactPairFlags(word,target,e);
 let incoming,outgoing;
 if(version===LEGACY_CONTACT_ADJUSTMENT_VERSION){incoming=!!(incomingFlags&sourceMask);outgoing=!!(outgoingFlags&sourceMask);}
 else if(version===PREVIOUS_CONTACT_ADJUSTMENT_VERSION||version===CONTACT_ADJUSTMENT_VERSION){
  // Wider custom settings retain full membership, including old exclusions.
  const fallback=settings.launch_max>data.maximumBaseContact||settings.plural_tolerance>data.maximumPluralTolerance||settings.mode&&settings.mode!=='distance';
  incoming=fallback?!!incomingFlags:!!((incomingFlags>>3)&1);
  outgoing=fallback?!!outgoingFlags:!!((outgoingFlags>>3)&2);
  if(sourceMask!==7){incoming=incoming&&!!(incomingFlags&sourceMask);outgoing=outgoing&&!!(outgoingFlags&sourceMask);}
 }else throw Error('Unknown contact adjustment version.');
 const incomingReviewed=version===CONTACT_ADJUSTMENT_VERSION&&sourceMask===7&&!!(recognizedContactPairFlags(origin,word,e)&1);
 if(incomingReviewed)incoming=true;
 if(version===CONTACT_ADJUSTMENT_VERSION&&sourceMask===7&&(recognizedContactPairFlags(word,target,e)&2))outgoing=true;
 const rarity=frequency==null?0:.038*clip((4-frequency)/1.5),frequencyPenalty=frequency==null?0:.005*clip(frequency-5);
 const incomingAllowance=incoming?.130:0,outgoingAllowance=outgoing?.040*clip((rawContact-.10)/.15):0;
 return {frequency,rawContact,rarity,frequencyPenalty,incoming:incomingAllowance,outgoing:outgoingAllowance,net:rarity+incomingAllowance+outgoingAllowance-frequencyPenalty,...(incomingReviewed?{contact_floor:recognized.floor}:{})};
}
/** Keep raw cosine separate from credited contact. Never used for finishing. */
export function submittedContact(raw,ordinaryRequired,terms){
 if(terms?.contact_floor!=null)return {required:Math.max(0,ordinaryRequired-(terms.net-terms.incoming)),effective_contact:Math.max(raw+terms.incoming,terms.contact_floor),contact_floor:terms.contact_floor};
 return {required:terms?Math.max(0,ordinaryRequired-terms.net):ordinaryRequired};
}
export function contactAdjustmentSettings(value){
 if(value==null||value===false)return null;
 if(!versions.includes(value.version)||!Number.isInteger(value.after)||value.after<0)throw Error('Unknown contact adjustment rule.');
 const result={version:value.version,after:value.after};
 if(value.previous!=null){
  const p=value.previous;
  if(!versions.includes(p.version)||versions.indexOf(p.version)>=versions.indexOf(value.version)||!Number.isInteger(p.after)||p.after<0||p.after>=value.after)throw Error('Unknown previous contact adjustment rule.');
  result.previous=contactAdjustmentSettings(p);
 }
 return result;
}
export function activeContactVersion(rule,through){
 if(!rule)return null;
 if(through>=rule.after)return rule.version;
 return activeContactVersion(rule.previous,through);
}
export function newContactRule(after,previous=null){
 if(!Number.isInteger(after)||after<0)throw Error('Unknown contact adjustment boundary.');
 let old=contactAdjustmentSettings(previous);
 if(old?.version===CONTACT_ADJUSTMENT_VERSION&&old.after<=after)return old;
 while(old&&old.after>=after)old=old.previous;
 return {version:CONTACT_ADJUSTMENT_VERSION,after,...(old&&old.after<after?{previous:old}:{})};
}
export function contactRuleForRetry(rule,through){
 let old=contactAdjustmentSettings(rule);
 if(!Number.isInteger(through)||through<0)throw Error('Unknown contact adjustment boundary.');
 if(old?.version===CONTACT_ADJUSTMENT_VERSION&&through>=old.after)return old;
 while(old&&old.after>=through)old=old.previous;
 return newContactRule(through,old);
}
export function standardContactEligible(s){return !!s.waypoint&&s.rules==='golf-distance-v3'&&(s.mode??'distance')==='distance'&&!s.semantic_bunker&&!s.headwind&&(!s.word_model||s.word_model==='current');}

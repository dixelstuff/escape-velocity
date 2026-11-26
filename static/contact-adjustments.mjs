/** Exact local contact policy. It never chooses a semantic destination. */
import data from './contact-data.mjs?v=contact-allowances-v1';
import {spellingIdentity} from './spelling-equivalence.mjs?v=fixed-waypoint-lie-v1';
export const CONTACT_ADJUSTMENT_VERSION='frequency-phrases-v1';
const unpack=base64=>Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
const words=data.words.split('\n'),index=new Map(words.map((w,i)=>[w,i]));
const frequencies=new DataView(unpack(data.zipf).buffer),pairs=new DataView(unpack(data.pairs).buffer),sources=unpack(data.sources);
export function contactFrequency(word){const i=index.get(spellingIdentity(word));return i==null?null:frequencies.getUint16(i*2,true)/100;}
export function contactPhraseSources(a,b){
 const x=index.get(spellingIdentity(a)),y=index.get(spellingIdentity(b));if(x==null||y==null||x===y)return 0;
 const key=Math.min(x,y)*65536+Math.max(x,y);let lo=0,hi=sources.length-1;
 while(lo<=hi){const mid=(lo+hi)>>>1,value=pairs.getUint32(mid*4,true);if(value===key)return sources[mid];if(value<key)lo=mid+1;else hi=mid-1;}
 return 0;
}
const clip=x=>Math.max(0,Math.min(1,x));
export function contactAdjustmentTerms(e,origin,word,target,sourceMask=7){
 const frequency=contactFrequency(word),rawContact=e.cosine(origin,word);
 const incoming=!!(contactPhraseSources(origin,word)&sourceMask),outgoing=!!(contactPhraseSources(word,target)&sourceMask);
 const rarity=frequency==null?0:.038*clip((4-frequency)/1.5),frequencyPenalty=frequency==null?0:.005*clip(frequency-5);
 const incomingAllowance=incoming?.130:0,outgoingAllowance=outgoing?.040*clip((rawContact-.10)/.15):0;
 return {frequency,rawContact,rarity,frequencyPenalty,incoming:incomingAllowance,outgoing:outgoingAllowance,net:rarity+incomingAllowance+outgoingAllowance-frequencyPenalty};
}
export function contactAdjustmentSettings(value){
 if(value==null||value===false)return null;
 if(value.version!==CONTACT_ADJUSTMENT_VERSION||!Number.isInteger(value.after)||value.after<0)throw Error('Unknown contact adjustment rule.');
 return {version:value.version,after:value.after};
}
export function standardContactEligible(s){return !!s.waypoint&&s.rules==='golf-distance-v3'&&(s.mode??'distance')==='distance'&&!s.semantic_bunker&&!s.headwind&&(!s.word_model||s.word_model==='current');}
export const newContactRule=after=>({version:CONTACT_ADJUSTMENT_VERSION,after});

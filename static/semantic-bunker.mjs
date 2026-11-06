/** Optional local exclusion. Legacy saves keep their original first-leg-only rule. */
export const LEGACY_BUNKER_VERSION='semantic-bunker-v1';
export const BUNKER_VERSION='semantic-bunker-v2-both-legs';
export const bunkerActive=(settings,stage)=>!!settings&&(stage===0||stage===1&&settings.version===BUNKER_VERSION);
export const DEFAULT_BUNKER_THRESHOLD=.85;
export function bunkerSettings(value,embeddings){
 if(!value||value.enabled===false)return null;
 const word=String(value.word??'').trim().toLowerCase(),threshold=value.threshold??DEFAULT_BUNKER_THRESHOLD;
 if(value.version&&![BUNKER_VERSION,LEGACY_BUNKER_VERSION].includes(value.version))throw Error('Unknown bunker rule.');
 if(!word||!embeddings.index.has(word))throw Error('Choose a bunker word in the supported vocabulary.');
 if(!Number.isFinite(threshold)||threshold<0||threshold>1)throw Error('Bunker similarity must be between 0 and 1.');
 return {version:value.version??BUNKER_VERSION,word,threshold,exact_only:value.exact_only!==false};
}
export function bunkerCatch(settings,word,embeddings){
 if(!settings)return null;
 const resolve=w=>embeddings.resolveSpelling?.(w)??w,exact=resolve(word)===resolve(settings.word);
 if(!exact&&settings.exact_only)return null;
 const similarity=embeddings.cosine(word,settings.word);
 return exact||similarity>=settings.threshold?{word:settings.word,similarity,threshold:settings.threshold,exact,exact_only:settings.exact_only}:null;
}
/** Configurations have separate identities; regular three-word IDs remain untouched. */
export function bunkerExperimentSettings(source,enabled,word,threshold,exactOnly){
 const settings=structuredClone(source.settings);
 delete settings.semantic_bunker;
 settings.bunker_experiment={version:BUNKER_VERSION,source_id:source.id};
 if(enabled)settings.semantic_bunker={version:BUNKER_VERSION,word:String(word).trim().toLowerCase(),threshold,exact_only:exactOnly};
 return settings;
}
export function bunkerExperimentId(settings){
 const key=JSON.stringify([settings.bunker_experiment.source_id,settings.semantic_bunker??null]);
 // Two independent integer hashes keep IDs below the challenge's 100-character limit.
 let a=2166136261,b=5381;for(const c of key){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}
 return 'custom-bunker-'+(a>>>0).toString(36)+'-'+(b>>>0).toString(36);
}

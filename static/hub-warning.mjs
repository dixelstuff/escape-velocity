/** Endpoint advice uses the same precomputed breadth as shot scoring. */
export function endpointHubs(e,{start='',target=''}={}){
 return [['tee',start],['hole',target]].flatMap(([role,value])=>{
  const word=value.trim().toLowerCase();
  if(!e.index.has(word))return [];
  const score=e.hub?.(word)??0;
  return score>0?[{role,word,score,very_broad:score>=.5}]:[];
 });
}
export function hubWarningText(endpoints){
 if(!endpoints.length)return '';
 const words=endpoints.map(e=>`${e.very_broad?'Very broad':'Broad'} ${e.role} word: ${e.word.toUpperCase()} (among the broadest ${e.very_broad?'5':'10'}% of words).`);
 return words.join(' ')+' Broad words connect to many other words and can make a hole feel less specific. Longer forward shots involving them need stronger connections. Consider a more specific word; you can still play this hole.';
}

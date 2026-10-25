/** Build a fixed publication queue without changing any hole's identity or par. */
export function balancePublications(manifest){
 const definitions=new Map(manifest.holes.map(h=>[h.id,h]));
 const par=id=>definitions.get(id)?.settings.par??3;
 let ids=[...(manifest.publicationIds??[])];
 if(!ids.length){
  const original=manifest.holes.slice(manifest.initialNewest-8,manifest.initialNewest+1).reverse();
  const pattern=[3,4,5,3,5,4,3,5,3]; // Par 35, with room to alternate 35/36 on rollover.
  const anchors=new Set(original.filter((h,i)=>par(h.id)===pattern[i]).map(h=>h.id));
  const picked=[],future=manifest.holes.slice(manifest.initialNewest+1);
  for(const [i,value] of pattern.entries()){
   const preferred=original[i];
   const hole=par(preferred.id)===value?preferred:
    original.find(h=>!anchors.has(h.id)&&!picked.includes(h.id)&&par(h.id)===value)??
    future.find(h=>!picked.includes(h.id)&&par(h.id)===value);
   if(!hole)throw Error(`More par ${value} holes are needed to seed the daily nine.`);
   picked.push(hole.id);
  }
  const displaced=original.filter(h=>!picked.includes(h.id));
  const retired=[...displaced,...manifest.holes.slice(0,manifest.initialNewest-8)].slice(0,manifest.initialNewest-8);
  ids=[...retired.map(h=>h.id),...picked.reverse()];
 }
 if(new Set(ids).size!==ids.length||ids.some(id=>!definitions.has(id)))throw Error('Invalid publication identities.');
 for(let i=manifest.initialNewest;i<ids.length;i++){
  const nine=ids.slice(i-8,i+1),total=nine.reduce((n,id)=>n+par(id),0);
  if(total<35||total>36||nine.some((id,j)=>j>0&&par(id)===3&&par(nine[j-1])===3))throw Error('The frozen publication queue is not balanced.');
 }
 const remaining=manifest.holes.filter(h=>!ids.includes(h.id));
 while(remaining.length){
  const previous=ids.slice(-8),subtotal=previous.reduce((n,id)=>n+par(id),0);
  // Prefer 3/5 balance; use the smaller par-4 bank when the moving window needs it.
  const allowed=[3,5,4].filter(p=>!(p===3&&par(previous.at(-1))===3)&&subtotal+p>=35&&subtotal+p<=36);
  const next=allowed.map(p=>remaining.findIndex(h=>par(h.id)===p)).find(i=>i>=0);
  if(next===undefined)break; // Never break the rules or quietly alter a hole's par.
  ids.push(remaining.splice(next,1)[0].id);
 }
 return {publicationIds:ids,unreleasedIds:remaining.map(h=>h.id),scheduleVersion:'par35-36-v1'};
}

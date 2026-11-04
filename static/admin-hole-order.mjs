/** Keep the current public playtest first without changing permanent archive identity. */
export function adminHoleOrder(archive,publicCollection){
 const first=new Set(publicCollection.holes.map(h=>h.id));
 return {...archive,entryHoleId:publicCollection.entryHoleId,holes:[...publicCollection.holes.map(h=>archive.holes.find(a=>a.id===h.id)).filter(Boolean),...archive.holes.filter(h=>!first.has(h.id))]};
}

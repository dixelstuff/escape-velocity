/** Session-only geometry trace. No entered words, identifiers or network requests. */
export function createViewportDiagnostics(limit=240){
 const events=[];
 return {
  record(type,geometry){events.push({type,...geometry});if(events.length>limit)events.splice(0,events.length-limit);},
  export(){return events.map(event=>({...event}));},
 };
}

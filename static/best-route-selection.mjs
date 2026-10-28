/** Presentation of independent stroke/Cleverness bests without duplicate routes. */
export function featuredRoutes(hole){
 if(!hole?.bestStrokes)return [];
 const primary={...hole.bestStrokes},highest=hole.bestCleverness;
 if(Number.isFinite(primary.cleverness))primary.score=Math.round(primary.cleverness);
 else if(highest?.journeyId===primary.journeyId)primary.score=highest.score;
 const routes=[{label:'Your best route',best:primary}];
 if(highest&&highest.strokes>primary.strokes&&Number.isFinite(primary.score)&&highest.score>primary.score&&JSON.stringify(highest.route)!==JSON.stringify(primary.route))routes.push({label:'Higher Cleverness · longer route',best:highest});
 return routes;
}

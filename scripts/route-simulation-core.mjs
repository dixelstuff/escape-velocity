/** Seeded offline legal-route sampling. Policies describe computers, not people. */
import {Game} from '../static/engine.mjs';
export const SIMULATION_VERSION='route-sampling-pilot-v1';
export const POLICIES=[{id:'connection',name:'Connection-first',strength:4,progress:1.5,planning:0},{id:'explore',name:'Exploratory',strength:.6,progress:.7,planning:0},{id:'lookahead',name:'One-step planning',strength:1.5,progress:2,planning:2.5}];
export function seededRandom(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
const clone=g=>Object.assign(Object.create(Game.prototype),g,{history:g.history.slice(),route:g.route.slice(),automatic_shots:g.automatic_shots.slice()});
export function createRouteSampler(e,settings,contexts,{maxInputs=12,maxNodes=12000}={}){
 const nodeCache=new Map();let evaluations=0;
 const make=()=>new Game(e,settings.start,settings.target,settings.threshold,settings);
 const actions=g=>{
  const key=JSON.stringify(g.history.map(h=>h.word));if(nodeCache.has(key))return nodeCache.get(key);
  const used=new Set(g.history.filter(h=>h.stage===g.stage).map(h=>contexts.resolve(h.word))),words=[...new Set([g.target,...(contexts.graph.get(contexts.resolve(g.current))??[])])].sort(),list=[];
  for(const word of words){if(used.has(contexts.resolve(word)))continue;const next=clone(g);let event;try{event=next.submit(word);}catch{continue;}evaluations++;if(!event.success)continue;
   const progress=Math.min(1,Math.max(-1,(Math.min(event.destination,g.threshold)-Math.min(g.e.cosine(g.current,g.target),g.threshold))/Math.max(.01,g.threshold-g.baseline)));
   list.push({word,strength:Math.max(.01,g.e.cosine(g.current,word)),progress,turn:!!event.waypoint_reached,won:next.won});
  }
  if(nodeCache.size>=maxNodes)nodeCache.delete(nodeCache.keys().next().value);nodeCache.set(key,list);return list;
 };
 const journey=(policy,rng)=>{const g=make();for(let step=0;step<maxInputs&&!g.won;step++){
  const list=actions(g);if(!list.length)return{completed:false,reason:'no_sampled_legal_action',state:g.state()};
  const weighted=list.map(action=>{let future=0;if(policy.planning){const probe=clone(g);probe.submit(action.word);future=probe.won?1:Math.max(0,...actions(probe).map(a=>a.won?1:a.progress));}
   const weight=Math.pow(.1+action.strength,policy.strength)*Math.exp(policy.progress*action.progress+policy.planning*future+(action.won?2:0)+(action.turn?.5:0));return{...action,weight};});
  let draw=rng()*weighted.reduce((s,a)=>s+a.weight,0),chosen=weighted.at(-1);for(const item of weighted){draw-=item.weight;if(draw<=0){chosen=item;break;}}
  if(!g.submit(chosen.word).success)throw Error('Sampler violated engine transition');
 }
 return{completed:g.won,reason:g.won?'completed':'input_budget',state:g.state()};};
 return{journey,evaluations:()=>evaluations,cachedNodes:()=>nodeCache.size};
}
export function samplePolicy(sampler,policy,{runs=1000,seed=1,sampleSize=100}={}){
 const rng=seededRandom(seed),reservoirRng=seededRandom(seed^0xa51c7e3d),sample=[],histogram={},unique=new Set(),failures={};let completed=0;
 for(let i=0;i<runs;i++){const r=sampler.journey(policy,rng);if(!r.completed){failures[r.reason]=(failures[r.reason]??0)+1;continue;}
  completed++;histogram[r.state.attempts]=(histogram[r.state.attempts]??0)+1;unique.add(JSON.stringify(r.state.route));
  const record={draw:i,state:r.state};if(sample.length<sampleSize)sample.push(record);else{const j=Math.floor(reservoirRng()*completed);if(j<sampleSize)sample[j]=record;}
 }
 return{policy:policy.id,name:policy.name,runs,seed,completed,failures,strokeHistogram:histogram,uniqueCompletedRoutes:unique.size,scoredSample:sample};
}

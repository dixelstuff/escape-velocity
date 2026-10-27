/** Local-only helpers: production vectors and the authoritative JS engine. */
import fs from 'node:fs';
import {Embeddings,decodeHalf,Game} from '../static/engine.mjs';
import {SemanticProfileStore} from '../static/semantic-profile-store.mjs';
export function loadResearchModel(){
 const root=new URL('../static/model/',import.meta.url),read=f=>fs.readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),b=read(config.vector_fallback);
 const embeddings=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file)));
 const fetcher=async url=>{try{return new Response(fs.readFileSync(url));}catch{return new Response('',{status:404});}};
 return {e:embeddings,config,store:new SemanticProfileStore({modelSha:config.vector_sha256,fetcher,base:new URL('../static/semantic-profiles/',import.meta.url)})};
}
export const researchSettings=(tee,waypoint,flag,par=5)=>({start:tee,target:flag,threshold:.27,mode:'distance',rules:'golf-distance-v3',launch_min:.095,launch_max:.215,finish_mode:'range',waypoint:{word:waypoint,threshold:.265},waypoint_auto_finish:true,plural_rescue:true,family_rescue:true,plural_tolerance:.025,allow_backtracking:false,continuous_play:true,challenge:{version:'stroke-play-v1',par,attempt:1,id:'local-research'}});
export function playResearchRoute(e,settings,words){const game=new Game(e,settings.start,settings.target,settings.threshold,settings),events=[];let discrepancy=null;for(const word of words){if(game.won){if(word!==settings.target)discrepancy='The engine completed before '+word;break;}try{const event=game.submit(word);events.push(event);if(!event.success){discrepancy=word+' did not hit safely';break;}}catch(error){discrepancy=error.message;break;}}return {state:game.state(),events,discrepancy:discrepancy??(!game.won?'The supplied route did not complete.':null)};}

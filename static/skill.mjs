import {withHeadwind,headwindKey} from './headwind.mjs?v=golf-v185';
/** Experimental vector choice efficiency. No map pixels or stroke-count benchmark. */
import { Game } from './engine.mjs?v=golf-v185';
export const SKILL_VERSION='vector-skill-v4';
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const TOP=8,DISCOUNT=.75;
/** Balanced bridge strength: a very weak side cannot hide behind one strong side. */
export function linkStrength(contact,destination,finishingBridge=false){
  return finishingBridge?Math.sqrt(Math.max(0,contact)*Math.max(0,destination)):Math.max(0,contact);
}
/** Compare link strength only with legal moves preserving the chosen setup value. */
export function connectionRegret(actual,candidates){
  const benchmark=Math.max(actual,...candidates);
  return {link_strength:actual,link_benchmark:benchmark,connection_loss:benchmark>0?clamp(1-actual/benchmark):0};
}
import {withWordModel} from './word-model.mjs?v=golf-v185';
export function skillHistoryKey(s){return JSON.stringify([s.start,s.target,s.threshold,s.mode,s.rules,s.launch_min,s.launch_max,s.history.map(h=>h.word),...(s.allow_backtracking===false?['no-backtrack-exemption']:[]),...(s.finish_mode==='range'?['range']:[]),...(s.headwind?[s.headwind]:[]),...(s.word_model?[s.word_model]:[]),...(s.challenge?['successful-path-connections']:[]),...(s.family_rescue?['noun-adjective-v1']:[]),...(s.plural_rescue?['plural-rescue-v1',...(s.plural_tolerance>.02?[s.plural_tolerance]:[])]:[])]);}
export function validSkillReport(report,state,modelSha){
  if(!report||report.version!==SKILL_VERSION||report.history_key!==skillHistoryKey(state)||report.model_sha!==modelSha||!report.complete||!Number.isInteger(report.score)||report.score<0||report.score>1000||!Array.isArray(report.shots)||report.shots.length!==state.history.length)return false;
  const metrics=['attempt','score','contact','required','contact_shortfall','contact_score','choice_score','choice_gap','compared_choices','setup_change','good_moves_before','good_moves_after','green_moves_after','direction_shortfall','specificity_loss','forward_fraction','origin_hub','destination_hub','link_strength','link_benchmark','connection_loss'];
  return report.shots.every((shot,i)=>shot&&shot.word===state.history[i].word&&shot.origin===state.history[i].origin&&metrics.every(k=>Number.isFinite(shot[k]))&&Array.isArray(shot.alternatives)&&shot.alternatives.every(a=>a&&typeof a.word==='string'&&['value','contact','required','specificity_loss','setup_value'].every(k=>Number.isFinite(a[k]))));
}
export function skillScore(loss){return Math.round(1000/(1+Math.max(0,loss)));}
/** A small setup move is free; only successful long moves into broader words cost skill. */
export function specificity(e,origin,word,current,destination,baseline,green){
  const forward_fraction=clamp((Math.min(destination,green)-Math.min(current,green))/Math.max(1e-6,green-baseline));
  const origin_hub=e.hub?.(origin)??0,destination_hub=e.hub?.(word)??0;
  const long_fraction=clamp((forward_fraction-.5)/.5);
  return {forward_fraction,origin_hub,destination_hub,
    specificity_loss:.1*long_fraction**2*Math.max(0,destination_hub-origin_hub)};
}
export class SkillAnalyser {
  constructor(e){this.e=e;this.rows=new Map();}
  row(word){
    if(this.rows.has(word)){const row=this.rows.get(word);this.rows.delete(word);this.rows.set(word,row);return row;}
    const {words,vectors,dimensions:d,index}=this.e,base=index.get(word)*d,row=new Float64Array(words.length);
    for(let i=0;i<words.length;i++){let dot=0;for(let k=0;k<d;k++)dot+=vectors[base+k]*vectors[i*d+k];dot=clamp(dot,-1,1);row[i]=this.e.scaleSimilarity?this.e.scaleSimilarity(base/d,i,dot):dot;}
    if(this.rows.size>=80)this.rows.delete(this.rows.keys().next().value);
    this.rows.set(word,row);return row;
  }
  analyse(saved){
    const selected=withWordModel(this.e,saved.word_model);
    if(selected!==this.e)return new SkillAnalyser(selected).analyse(saved);
    if(saved.headwind&&headwindKey(this.e.headwind)!==headwindKey(saved.headwind))return new SkillAnalyser(withHeadwind(this.e,saved.headwind)).analyse(saved);
    if(!['golf-distance-v2','golf-fixed-v2','golf-distance-v3','golf-fixed-v3'].includes(saved.rules))throw Error('Skill is available for rounds played with the current course rules.');
    const e=this.e,g=new Game(e,saved.start,saved.target,saved.threshold,saved),target=this.row(g.target),gap=Math.max(.01,g.threshold-g.baseline);
    const progress=v=>clamp((v-g.baseline)/gap),position=word=>target[e.index.get(word)];
    const specificityAt=(origin,word)=>word===g.target?{...specificity(e,origin,word,position(origin),position(word),g.baseline,g.threshold),specificity_loss:0}:specificity(e,origin,word,position(origin),position(word),g.baseline,g.threshold);
    const potentialCache=new Map();
    function after(s,word){const destination=position(word),backtrack=g.allow_backtracking!==false&&destination+1e-7<position(s.current)&&s.route.includes(word);return {current:word,route:s.route.includes(word)?s.route:[...s.route,word],best:backtrack?destination:Math.max(s.best,destination)};}
    const options=s=>{
      const contact=this.row(s.current),current=position(s.current),reached=new Set(s.route),list=[],rescueTolerance=Math.max(g.plural_rescue?g.plural_tolerance:0,g.family_rescue?.025:0);
      const probe=Object.assign(Object.create(g),{current:s.current,route:s.route,best_progress:s.best});
      for(let i=0;i<e.words.length;i++){
        const word=e.words[i];if(word===s.current)continue;
        let destination=target[i],required=g.requirement(s.current,word,current,destination).required,connection=contact[i],finished=g.finishesFrom(word,destination);
        if(rescueTolerance>0&&((connection<required&&required-connection<=rescueTolerance+1e-7)||(!finished&&g.finishShortfall(word,destination)<=rescueTolerance+1e-7))){
          const shot=probe.pluralShot(word);
          if(shot.scoring_word){destination=shot.destination;required=shot.required;connection=shot.launch;finished=shot.won;}
        }
        const backtrack=g.allow_backtracking!==false&&destination+1e-7<current&&reached.has(word);
        if(connection+1e-7<required||(!backtrack&&destination+1e-7<s.best-g.backward_allowance))continue;
        // Strength is a bounded measure of contact surplus, not a probability.
        list.push({word,destination,contact:connection,required,strength:clamp(connection/(2*required)),p:g.finish_mode==='range'&&finished?1:progress(destination)});
      }
      return list;
    };
    const potential=s=>{
      if(g.finishesFrom(s.current,position(s.current)))return {value:1,good_moves:0,green_moves:0};
      const key=JSON.stringify([s.current,s.best,[...s.route].sort()]);
      if(potentialCache.has(key))return potentialCache.get(key);
      const p=progress(position(s.current)),top=Array(TOP).fill(0);let good=0,green=0;
      for(const move of options(s)){
        if(move.destination<=position(s.current)+1e-7)continue;
        good++;if(g.finishesFrom(move.word,move.destination))green++;
        const gain=move.p-p;
        if(gain>top[0]){top[0]=gain;top.sort((a,b)=>a-b);}
      }
      const result={value:p+DISCOUNT*(.8*top[TOP-1]+.2*top.reduce((a,b)=>a+b,0)/TOP),good_moves:good,green_moves:green};potentialCache.set(key,result);return result;
    };
    const shots=[];let totalLoss=0;
    for(const recorded of saved.history){
      const before={current:g.current,route:[...g.route],best:g.best_progress},beforeValue=potential(before),event=g.submit(recorded.word);
      const intended=after(before,event.word),intendedValue=potential(intended),moves=options(before);
      // Broad bounded search: progress leaders, strong contacts and progress bands.
      // Each shortlisted lie gets an exhaustive vocabulary scan one shot ahead.
      const shortlist=new Map(),add=move=>{if(move)shortlist.set(move.word,move);};
      [...moves].sort((a,b)=>b.p-a.p||b.strength-a.strength).slice(0,12).forEach(add);
      [...moves].sort((a,b)=>(b.p-progress(position(before.current)))*b.strength-(a.p-progress(position(before.current)))*a.strength).slice(0,8).forEach(add);
      for(let band=0;band<8;band++)add(moves.filter(m=>Math.min(7,Math.floor(m.p*8))===band).sort((a,b)=>b.contact-a.contact)[0]);
      moves.filter(m=>before.route.includes(m.word)).forEach(add);
      // Success mode now rewards connection quality as well as passing the cutoff.
      // Compare a finish against other finishes; setup shots against equally useful setups.
      // A direct hole shot is compared only with one-shot finishes (the hole word).
      // Two-link bridges are compared with other bridges, not cheaper direct finishes.
      const strength=move=>linkStrength(move.contact,move.destination,move.word!==g.target&&g.finishesFrom(move.word,move.destination));
      const linkCandidates=saved.challenge&&event.success?moves.filter(move=>event.word===g.target?move.word===g.target:event.won?move.word!==g.target&&g.finishesFrom(move.word,move.destination):shortlist.has(move.word)).filter(move=>potential(after(before,move.word)).value+1e-7>=intendedValue.value).map(strength):[];
      const links=connectionRegret(strength({word:event.word,contact:event.launch,destination:event.destination}),linkCandidates);
      const specific=specificityAt(event.origin,event.word);
      // Small non-finishing setups retain their opportunity-only assessment.
      if(!saved.challenge||!event.success||(!event.won&&specific.forward_fraction<=.5))links.connection_loss=0;
      if(!event.success)specific.specificity_loss=0;
      let best=intendedValue.value-specific.specificity_loss;const alternatives=[];
      for(const move of shortlist.values()){
        const next=potential(after(before,move.word)),specificity_loss=specificityAt(before.current,move.word).specificity_loss;
        const value=next.value-specificity_loss;best=Math.max(best,value);
        alternatives.push({word:move.word,value,setup_value:next.value,specificity_loss,contact:move.contact,required:move.required,destination:move.destination,good_moves:next.good_moves});
      }
      alternatives.sort((a,b)=>b.value-a.value||b.contact-a.contact||a.word.localeCompare(b.word));
      const contactLoss=clamp((event.required-event.launch)/event.required);
      const directionLoss=event.backtrack?0:clamp((before.best-g.backward_allowance-event.destination)/gap);
      const choiceLoss=clamp(best-intendedValue.value);
      const setupLoss=event.success?clamp(beforeValue.value-intendedValue.value):0;
      // Revisiting an unchanged or worse position spends a decision without a setup benefit.
      const loopLoss=event.success&&before.route.includes(event.word)&&intendedValue.value<=beforeValue.value+1e-7 ? .05 : 0;
      const primaryLoss=Math.max(contactLoss,directionLoss,choiceLoss,setupLoss);
      const loss=primaryLoss+loopLoss+specific.specificity_loss+links.connection_loss;totalLoss+=loss;
      const actual=event.success?intendedValue:beforeValue;
      shots.push({attempt:event.attempt,origin:event.origin,word:event.word,outcome:event.outcome,
        contact:event.launch,required:event.required,contact_shortfall:Math.max(0,event.required-event.launch),contact_score:Math.round(100*(1-contactLoss)),
        direction_shortfall:event.backtrack?0:Math.max(0,before.best-g.backward_allowance-event.destination),direction_loss:directionLoss,
        choice_score:Math.round(100*(1-choiceLoss)),choice_gap:choiceLoss,compared_choices:shortlist.size,
        setup_before:beforeValue.value,setup_after:actual.value,setup_change:actual.value-beforeValue.value,intended_setup:intendedValue.value,
        good_moves_before:beforeValue.good_moves,good_moves_after:actual.good_moves,green_moves_after:actual.green_moves,
        ...specific,...links,setup_loss:setupLoss,primary_loss:primaryLoss,loop_loss:loopLoss,loss,score:skillScore(loss),cumulative_score:skillScore(totalLoss),alternatives:alternatives.filter(a=>a.word!==event.word).slice(0,3)});
    }
    return {version:SKILL_VERSION,history_key:skillHistoryKey(saved),score:shots.length?skillScore(totalLoss):null,total_loss:totalLoss,shots,complete:g.won,
      approximate:true,lookahead:1,opportunity_slots:TOP,lookahead_discount:DISCOUNT,opportunity_best_weight:.8,opportunity_breadth_weight:.2,comparison:'progress, connection and progress-band shortlist; exhaustive onward options',
      specificity_max_loss:.1,specificity_free_fraction:.5,
      connection_comparison:saved.challenge?'long advances and finishing bridges only; strongest legal link preserving onward opportunity; geometric mean of both sides for a finishing bridge':'legacy round, no connection-surplus cost',
      formula:'1000 / (1 + Σ(max(contact deficit, direction deficit, choice gap, setup decline) + loop cost + specificity cost + connection regret))'};
  }
}

import {STROKE_PLAY,maximumStrokes,attemptLimit} from './stroke-play.mjs?v=golf-v88';
import { failedShotSummary } from './round-summary.mjs?v=golf-v88';
import {successTitle,challengeFailure} from './success-mode.mjs?v=golf-v88';
import { skillFeedbackKey, currentSkillFeedback, validSkillFeedback } from './skill-feedback.mjs?v=golf-v88';
import { bridgeKey, puzzleKey, puzzleSettings, bridgeMetrics, validBridgeFeedback, bridgeComparison, bridgeFeedbackText } from './bridge-feedback.mjs?v=golf-v88';
/** Device-local playtest history. No guesses are sent to a server. */
export const LOG_KEY = 'escape-velocity.flight-log.v1';
export const RESET_BACKUP_KEY = 'escape-velocity.flight-log.reset-backup.v1';
export const RULES_VERSION = 'fixed-threshold-v1';
export class FlightLog {
  constructor(storage, now = () => new Date().toISOString(), makeId = () => crypto.randomUUID()) {
    this.storage = storage;
    this.now = now;
    this.makeId = makeId;
    this.warning = '';
    this.data = {version:1, activeId:null, journeys:[]};
    let raw;
    try {
      raw = storage?.getItem(LOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version !== 1 || !Array.isArray(parsed.journeys) || !parsed.journeys.every(j => typeof j.id === 'string' && j.state && Array.isArray(j.entries))) throw Error('Invalid saved log');
        this.data = parsed;
      }
    } catch {
      this.unreadableRaw = raw;
      this.warning = 'Saved scorecards could not be read. New shots will be kept for this visit; download them before leaving.';
    }
    for(const j of this.data.journeys){if(j.skill_feedback)j.skill_feedback=Array.isArray(j.skill_feedback)?j.skill_feedback.filter(validSkillFeedback):[];}
    delete this.data.bridge_comparison;
    this.data.bridgeFeedback=Array.isArray(this.data.bridgeFeedback)?this.data.bridgeFeedback.filter(validBridgeFeedback):[];
    this.data.bridgeViews=Array.isArray(this.data.bridgeViews)?this.data.bridgeViews.filter(v=>v&&typeof v.puzzle_key==='string'&&typeof v.at==='string'):[];
    try {
      const backup=JSON.parse(storage?.getItem(RESET_BACKUP_KEY)||'null');
      if(backup?.version===1&&Array.isArray(backup.journeys)&&backup.journeys.every(j=>typeof j.id==='string'&&j.state&&Array.isArray(j.entries))){
        backup.bridgeFeedback=Array.isArray(backup.bridgeFeedback)?backup.bridgeFeedback.filter(validBridgeFeedback):[];
        backup.bridgeViews=Array.isArray(backup.bridgeViews)?backup.bridgeViews.filter(v=>v&&typeof v.puzzle_key==='string'&&typeof v.at==='string'):[];
        this.backup=backup;
      }
    }catch{}
  }
  get active() { return this.data.journeys.find(j => j.id === this.data.activeId); }
  save() {
    try {
      if (!this.storage || this.unreadableRaw) throw Error('Storage unavailable');
      this.storage.setItem(LOG_KEY, JSON.stringify(this.data));
      this.warning = '';
    } catch {
      this.warning = 'This browser could not save your scorecard. Download it before leaving this page.';
    }
  }
  makeJourney(state, model, modelSha=null) {
    const timestamp = this.now();
    return {id:this.makeId(), model_sha:modelSha,bridge_tracking_version:1,startedAt:timestamp, updatedAt:timestamp, rules:state.rules??RULES_VERSION, model, completion:state.challenge?.version===STROKE_PLAY?'stroke-play-with-curated-eagles':state.automatic_shots?'holed-with-auto-finish':'arrival-zone', state:structuredClone(state), entries:[]};
  }
  begin(state, model, modelSha=null) {
    const journey = this.makeJourney(state,model,modelSha);
    this.data.journeys.push(journey);
    this.data.activeId = journey.id;
    this.save();
    return journey;
  }
  reset(state,model,modelSha=null) {
    const journey=this.makeJourney(state,model,modelSha);
    const next={version:1,activeId:journey.id,batchStartedAt:journey.startedAt,journeys:[journey],bridgeFeedback:[],bridgeViews:[]};
    const backup=JSON.parse(this.exportJSON());delete backup.bridge_comparison;
    let previousRaw,wroteNext=false;
    try {
      if(!this.storage)throw Error('Storage unavailable');
      previousRaw=this.storage.getItem(LOG_KEY);
      // Free the old batch's space first: duplicating it can exceed localStorage's
      // quota. These synchronous writes either finish with a recovery copy or
      // restore the original log; setItem itself is atomic on quota failure.
      this.storage.setItem(LOG_KEY,JSON.stringify(next));wroteNext=true;
      this.storage.setItem(RESET_BACKUP_KEY,JSON.stringify(backup));
    }catch{
      try{if(wroteNext)this.storage.setItem(LOG_KEY,previousRaw??'null');}catch{}
      throw Error('Could not safely reset scorecards. Your current scorecards are unchanged. Download them first or check browser storage.');
    }
    this.data=next;this.backup=backup;this.unreadableRaw=undefined;this.warning='';
    return journey;
  }
  restorePrevious() {
    if(!this.backup?.journeys?.length&&!this.backup?.bridgeFeedback?.length)return false;
    const currentIds=new Set(this.data.journeys.map(j=>j.id));
    // Keep rounds played since the reset too; restoring must not discard new play.
    const reviews=new Map((this.backup.bridgeFeedback??[]).filter(validBridgeFeedback).map(r=>[r.key,r]));
    for(const r of this.data.bridgeFeedback)reviews.set(r.key,r);
    const views=new Map([...(this.backup.bridgeViews??[]),...this.data.bridgeViews].map(v=>[v.id,v]));
    const next={...this.data,bridgeFeedback:[...reviews.values()],bridgeViews:[...views.values()],...(this.backup.unreadableOriginal?{unreadableOriginal:this.backup.unreadableOriginal}:{}),journeys:[...this.backup.journeys.filter(j=>!currentIds.has(j.id)),...this.data.journeys]};
    let previousBackup,clearedBackup=false;
    try{
      if(!this.storage)throw Error('Storage unavailable');
      previousBackup=this.storage.getItem(RESET_BACKUP_KEY);
      this.storage.setItem(RESET_BACKUP_KEY,'null');clearedBackup=true;
      this.storage.setItem(LOG_KEY,JSON.stringify(next));
    }catch{
      try{if(clearedBackup)this.storage.setItem(RESET_BACKUP_KEY,previousBackup??'null');}catch{}
      throw Error('Could not restore previous scorecards. Your current scorecards are unchanged.');
    }
    this.data=next;this.backup=null;this.warning='';
    return true;
  }
  record(word, state, event = null, error = null) {
    const journey = this.active;
    if (!journey) throw Error('No active scorecard');
    const timestamp = this.now();
    journey.completion ??= 'arrival-zone';
    journey.entries.push({submittedAt:timestamp, word, origin:event?.origin ?? state.current,
      chargedAttempt:!!event, completion:journey.completion, threshold:event?.required??state.threshold, arrival_threshold:state.threshold, event:structuredClone(event), error});
    if(event?.automatic_shot){
      journey.entries.push({submittedAt:timestamp,word:event.automatic_shot.word,origin:event.automatic_shot.origin,chargedAttempt:true,completion:journey.completion,event:structuredClone(event.automatic_shot),error:null});
    }
    delete journey.skill;
    journey.state = structuredClone(state);
    if(state.challenge?.version===STROKE_PLAY){journey.attempt_limit=attemptLimit(state.challenge.par);journey.maximum_strokes=maximumStrokes(state.challenge.par);journey.scored_strokes=state.won?state.attempts:state.challenge_failed?journey.maximum_strokes:null;journey.score_to_par=journey.scored_strokes===null?null:journey.scored_strokes-state.challenge.par;}
    if(state.challenge)journey.challenge_result=state.won?'success':state.challenge_failed?'failed':'in-progress';
    journey.updatedAt = timestamp;
    this.save();
  }
  markBridgeView(settings,source,modelSha=null) {
    const key=puzzleKey(settings),id=JSON.stringify([key,source,this.data.activeId,modelSha]);
    if(this.data.bridgeViews.some(v=>v.id===id))return;
    this.data.bridgeViews.push({id,puzzle_key:key,puzzle:puzzleSettings(settings),source,model_sha:modelSha,journey_id:this.data.activeId,at:this.now()});this.save();
  }
  flagBridge(result,bridge,{model,model_sha=null,source='active'}={}) {
    const puzzle=puzzleSettings(result.settings),key=bridgeKey(puzzle,bridge.word,model_sha);
    const existing=this.data.bridgeFeedback.find(r=>r.key===key);if(existing)return existing;
    const review={key,puzzle,word:bridge.word,model,model_sha,source,flagged_at:this.now(),note:'',
      journey_id:source==='active'?this.data.activeId:null,baseline:result.connection,opening_bridges:result.green_bridges,direct:bridge.direct,
      metrics:bridgeMetrics(bridge.contact,bridge.required,bridge.destination,result.green_threshold)};
    if(!validBridgeFeedback(review))throw Error('This bridge could not be recorded. Reopen the bridge list and try again.');
    this.data.bridgeFeedback.push(review);this.save();return review;
  }
  unflagBridge(key){this.data.bridgeFeedback=this.data.bridgeFeedback.filter(r=>r.key!==key);this.save();}
  noteBridge(key,note){const r=this.data.bridgeFeedback.find(r=>r.key===key);if(r){r.note=String(note).trim().slice(0,500);r.updated_at=this.now();this.save();}}
  recordSkill(id, report) {
    const journey=this.data.journeys.find(j=>j.id===id);
    if(!journey||!journey.state.won||!report.complete)return false;
    const s=journey.state,key=JSON.stringify([s.start,s.target,s.threshold,s.mode,s.rules,s.launch_min,s.launch_max,s.history.map(h=>h.word),...(s.finish_mode==='range'?['range']:[]),...(s.headwind?[s.headwind]:[]),...(s.word_model?[s.word_model]:[]),...(report.version==='vector-skill-v4'&&s.challenge?['successful-path-connections']:[]),...(s.plural_rescue?['plural-rescue-v1',...(s.plural_tolerance>.02?[s.plural_tolerance]:[])]:[])]);
    if(report.history_key!==key)return false;
    journey.skill=structuredClone(report);this.save();return true;
  }
  recordSkillFeedback(id,rating,note) {
    const journey=this.data.journeys.find(j=>j.id===id);
    if(!journey?.state.won||!journey.skill)throw Error('Wait for the skill assessment to finish.');
    const report=journey.skill,key=skillFeedbackKey(report);
    journey.skill_feedback??=[];
    if(rating===null){journey.skill_feedback=journey.skill_feedback.filter(f=>f.key!==key);this.save();return;}
    if(!['too_harsh','too_generous'].includes(rating))throw Error('Unknown skill feedback.');
    const existing=currentSkillFeedback(journey),at=this.now();
    const feedback={key,rating,note:String(note??existing?.note??'').trim().slice(0,500),submitted_at:existing?.submitted_at??at,updated_at:at,
      score:report.score,
      assessment:existing?.assessment??structuredClone(report)};
    journey.skill_feedback=journey.skill_feedback.filter(f=>f.key!==key);journey.skill_feedback.push(feedback);this.save();
  }
  noteSkillFeedback(id,note){const j=this.data.journeys.find(j=>j.id===id),f=currentSkillFeedback(j);if(f)this.recordSkillFeedback(id,f.rating,note);}
  exportJSON() { return JSON.stringify({...this.data,bridge_comparison:bridgeComparison(this.data),...(this.unreadableRaw?{unreadableOriginal:this.unreadableRaw}:{})},null,2); }
}
export function outcome(entry) {
  if(entry.event?.waypoint_reached)return 'Waypoint reached';
  if(!entry.event)return `Unscored: ${entry.error}`;
  const e=entry.event;
  if(e.automatic)return 'Automatic finish — one shot counted';
  if(e.outcome==='backtrack')return 'Backtrack — previous lie revisited';
  if(e.finish_reason==='range')return 'Chip-in range reached — automatic finish follows';
  if(entry.completion==='holed-with-auto-finish'&&e.won)return e.automatic_shot?'Green reached — automatic finish follows':'Holed directly';
  if(e.outcome==='water')return 'Water hazard — ball returned';
  if(e.outcome==='miss')return 'Miss — ball stayed put';
  if(e.outcome==='recovery')return 'Recovery shot — ball landed';
  if(e.won)return entry.completion==='arrival-zone'?'On the green — hole complete':'Green reached — old final tap-in';
  if(e.success)return 'Ball landed';
  if(e.forward===false)return 'Backward shot stopped — previous rules';
  return e.boundary?'Miss — not enough connection':'Outside previous course boundary';
}

export function journeyText(journey,feedback=[]) {
  const s = journey.state;
  const lines = ['WORD GOLF — scorecard', `${s.start.toUpperCase()} → ${s.waypoint?s.waypoint.word.toUpperCase()+' → ':''}${(s.final_target??s.target).toUpperCase()}`,
    `Started: ${journey.startedAt}`, `Model: ${journey.model}`, `Rules: ${journey.rules}`,
    s.mode==='distance'?`Shot strength: ${s.launch_min}–${s.launch_max}, scaled by trip length; green threshold: ${s.threshold}`:`Shot / green threshold: ${s.threshold}`, ...(s.headwind?[`Headwind: ${s.headwind.word} · strength ${s.headwind.strength} · ${s.headwind.version}`]:[]), ...(s.word_model?[`Word model: ${s.word_model}`]:[]), `Result: ${s.won ? 'Completed' : s.challenge_failed?'Attempt ended':'In progress'} · ${s.attempts} shots`, ''];
  if(['distance-v3','golf-distance-v1','golf-distance-v2','golf-distance-v3'].includes(s.rules))lines.push('Finishing shots measure only to the green edge.', '');
  if(s.finish_mode==='range')lines.push('Finish mode: automatic chip-in range (one counted finishing shot).', '');
  if(s.resumed_from)lines.push(`Retry: ${s.resumed_from.through} earlier shots carried forward from attempt ${s.resumed_from.attempt}.`, '');
  if(s.challenge)lines.push(`Success mode: par ${s.challenge.par} · attempt ${s.challenge.attempt} · challenge ${s.challenge.id}`,s.won?successTitle(s):s.challenge_failed?challengeFailure(s):'Attempt in progress.','');
  if(journey.skill){lines.push(`Skill: ${Math.round(journey.skill.score/10)}% (${journey.skill.version})`, 'Automatic finishes are excluded from skill.');for(const shot of journey.skill.shots)lines.push(`  #${shot.attempt} ${shot.origin} → ${shot.word}: contact ${shot.contact_score}/100; choice ${shot.choice_score}/100; setup ${shot.setup_change>=0?'+':''}${shot.setup_change.toFixed(3)}; onward moves ${shot.good_moves_before} → ${shot.good_moves_after}`);lines.push('');}
  for(const f of journey.skill_feedback??[])lines.push(`Skill feedback: ${f.rating==='too_harsh'?'Too harsh':'Too generous'} · score ${f.score}/1000 · ${f.assessment.version}${f.note?' · '+f.note:''}`);
  for (const entry of journey.entries) {
    const e = entry.event;
    lines.push(`${e ? `Shot ${e.attempt}` : 'No shot used'}: ${entry.origin} → ${entry.word}`,
      `  ${entry.assumed?'Carried forward · ':''}${outcome(entry)} · ${entry.submittedAt}`);
    if (e && !e.automatic) lines.push(`  Contact cosine: ${e.launch.toFixed(6)} / required ${e.required??entry.threshold}; destination cosine: ${e.destination.toFixed(6)}; green: ${e.inside ? 'yes' : 'no'}`);
  }
  lines.push('', `Played lies: ${s.route.join(' → ')}${s.won && !['arrival-zone','holed-with-auto-finish'].includes(journey.completion) && s.route.at(-1) !== s.target ? ` → ${s.target} (free)` : ''}`);
  if(s.won&&journey.completion==='holed-with-auto-finish')lines.push(`Holed in ${s.attempts} shots${s.automatic_shots?.length?' (includes one automatic finishing shot)':''}.`);
  if(s.won&&journey.completion==='arrival-zone')lines.push(`Finished on ${s.current}, on the ${s.target} green.`);
  if(failedShotSummary(s))lines.push(failedShotSummary(s));
  if(feedback.length)lines.push('',bridgeFeedbackText(feedback));
  return lines.join('\n');
}

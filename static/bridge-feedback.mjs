/** Device-local evidence for a future opening-shot cutoff experiment. */
export function puzzleSettings(s){return {start:s.start,target:s.target,threshold:s.threshold,mode:s.mode,launch_min:s.launch_min,launch_max:s.launch_max,rules:s.rules,...(s.finish_mode==='range'?{finish_mode:'range'}:{})};}
export function puzzleKey(s){return JSON.stringify([s.start,s.target,s.threshold,s.mode,s.launch_min,s.launch_max,s.rules,...(s.finish_mode==='range'?['range']:[])]);}
export function bridgeKey(settings,word,sha){return JSON.stringify([puzzleKey(settings),word,sha??null]);}
export function bridgeMetrics(contact,required,destination,threshold){return {contact,required,destination,green_threshold:threshold,tee_margin:contact-required,green_margin:destination-threshold,bottleneck_margin:Math.min(contact-required,destination-threshold)};}
export function validBridgeFeedback(r){return !!r&&typeof r.key==='string'&&typeof r.word==='string'&&r.puzzle&&typeof r.puzzle.start==='string'&&typeof r.puzzle.target==='string'&&typeof r.note==='string'&&r.metrics&&['contact','required','destination','green_threshold','tee_margin','green_margin','bottleneck_margin'].every(k=>Number.isFinite(r.metrics[k]));}
export function openingGreenShots(data){
 const shots=[];
 for(const j of data.journeys){
  const event=j.state.history?.[0];
  if(!event?.success||(!event.inside&&!(j.state.finish_mode==='range'&&event.automatic_shot))||typeof j.state.rules!=='string'||!j.state.rules.startsWith('golf-')||!['launch','required','destination'].every(k=>Number.isFinite(event[k]))||!Number.isFinite(j.state.threshold))continue;
  const entry=j.entries.find(e=>e.event?.attempt===1&&!e.event.automatic),at=entry?.submittedAt;
  const views=(data.bridgeViews??[]).filter(v=>(v.puzzle?.start===j.state.start&&v.puzzle?.target===j.state.target||v.puzzle_key===puzzleKey(j.state))&&at&&v.at<=at);
  shots.push({journey_id:j.id,puzzle:puzzleSettings(j.state),word:event.word,direct:event.word===j.state.target,submitted_at:at??null,
    model:j.model,model_sha:j.model_sha??null,metrics:bridgeMetrics(event.launch,event.required,event.destination,j.state.threshold),
    baseline:j.state.baseline,spoiler_status:views.length?'seen':j.bridge_tracking_version===1&&at?'not_recorded_in_batch':'unknown',
    flagged_poor:(data.bridgeFeedback??[]).some(r=>r.key===bridgeKey(j.state,event.word,j.model_sha))});
 }
 return shots;
}
export function bridgeComparison(data){return {version:1,description:'Flagged poor examples versus played first-shot greens. Played shots are observations, not user endorsements. Compare matched model/settings; spoiler exposure is recorded when known. No recorded view means only no earlier view in this export batch; prior batches, other devices and outside knowledge are unknown.',flagged_poor:data.bridgeFeedback??[],played_opening_greens:openingGreenShots(data)};}
export function bridgeFeedbackText(feedback=[]){
 if(!feedback.length)return '';
 return ['OPENING BRIDGE FEEDBACK — flagged poor',...feedback.map(r=>`${r.puzzle.start} → ${r.word} → ${r.puzzle.target}\n  Tee ${r.metrics.contact.toFixed(6)} / needs ${r.metrics.required.toFixed(6)}; hole ${r.metrics.destination.toFixed(6)} / green ${r.metrics.green_threshold.toFixed(6)}\n  Tee margin ${r.metrics.tee_margin.toFixed(6)}; green margin ${r.metrics.green_margin.toFixed(6)}\n  Settings ${JSON.stringify(r.puzzle)}; model ${r.model_sha??r.model}; source ${r.source}; flagged ${r.flagged_at}${r.note?'\n  Note: '+r.note:''}`)].join('\n');
}

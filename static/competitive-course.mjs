import {TourCourse,compareTourScores} from './tour-course.mjs?v=golf-v179';
export const CATEGORIES=[{id:'competitive',name:'Competitive',icon:'🏆',max:25},{id:'social',name:'Social',icon:'🏌️',max:Infinity}];
export const categoryFor=attempts=>CATEGORIES[attempts>25?1:0];
export function competitiveStatus(attempts,social=false){
 const tour=social?CATEGORIES[1]:categoryFor(attempts),left=tour.max-attempts,next=tour.id==='competitive'?CATEGORIES[1]:null;
 return {tour,left,next,detail:next?(left?`${left} ${left===1?'attempt':'attempts'} left in Competitive`:'Next attempt moves to Social'):'Unlimited attempts · hypothetical placement on submission'};
}
// Social scorecards never enter the official field, including exact ties and better scores.
export function competitiveStandings(scores,day){
 const entries=scores.filter(s=>s.date===day&&s.category==='competitive'&&s.totalAttempts<=25).sort(compareTourScores);
 let rank=0;return entries.map((s,i)=>{if(!i||compareTourScores(s,entries[i-1])!==0)rank=i+1;return {...s,rank};});
}
export function hypotheticalPlacement(score,scores){
 const field=competitiveStandings(scores,score.date);
 return {rank:1+field.filter(s=>compareTourScores(s,score)<0).length,fieldSize:field.length};
}
export const ordinal=n=>`${n}${n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]??'th')}`;
export function socialPlacementText(score,scores){
 const {rank,fieldSize}=hypotheticalPlacement(score,scores);
 return fieldSize?`Your score would have placed ${ordinal(rank)} in today’s Competitive tournament.`:'No Competitive submissions are available on this device to calculate your hypothetical placement yet.';
}
/** Independent daily trial: shared five-hole mechanics, with a single competitive field. */
export class CompetitiveCourse extends TourCourse{
 qualification(){return competitiveStatus(this.totalAttempts(),!!this.store.socialDays?.[this.day]);}
 needsBoundaryConsent(state){return this.qualification().tour.id==='competitive'&&this.totalAttempts()===25&&this.wouldSpendAttempt(state)&&!this.store.boundaryConsent?.[this.day]?.includes(25);}
 record(state,...args){
  super.record(state,...args);
  if(!this.hasExternalChanges()&&!this.current.finished&&this.totalAttempts()>25&&!this.store.socialDays?.[this.day]){(this.store.socialDays??={})[this.day]=true;this.save();}
 }
 submissionIdentity(){return {category:this.qualification().tour.id};}
 exportData(){return {...super.exportData(),mode:'daily-five-competitive-social'};}
}

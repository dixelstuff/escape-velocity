/** Raw semantic gain, independent of the distorted map distance. */
export function intendedGain(event,state){
 if(!Number.isFinite(event?.destination))return 0;
 const previous=state?.history?.filter(h=>h.attempt<event.attempt&&h.success&&h.word===event.origin&&(!state?.waypoint||h.stage===event.stage)).at(-1);
 const origin=event.origin===state?.start?(event.leg_baseline??state.baseline):previous?.destination??(state?.waypoint?event.leg_baseline:event.origin===state?.current?state.progress:undefined);
 return Number.isFinite(origin)?event.destination-origin:0;
}
export function usefulForwardMiss(event,state){
 const gap=(state?.threshold??0)-(state?.baseline??0),gain=intendedGain(event,state);
 return event?.outcome==='miss'&&gap>1e-6&&gain>1e-7&&gain+1e-7>=.1*gap;
}
/** Short feedback describes the failed connection, independent of retry timing. */
export function attemptNotice(event,target,state){
 const gain=intendedGain(event,state),near=.1*Math.max(0,(state?.threshold??0)-(state?.baseline??0));
 if(event?.outcome==='water'||event?.outcome==='miss'&&gain<-1e-7&&-gain+1e-7>=near)return `Miss! ${event.word.toUpperCase()} took you away from ${target.toUpperCase()}.`;
 if(event?.outcome==='miss')return usefulForwardMiss(event,state)?`Miss! ${event.word.toUpperCase()} needed a stronger link to ${event.origin.toUpperCase()}.`:'Miss! The connection was too weak.';
 return 'Par was out of reach. Try again.';
}
export function entryNotice(error,current){
 const message=String(error?.message??error);
 if(message.startsWith('That word is outside the supported vocabulary.'))return 'Word not allowed. Try another.';
 if(message.startsWith('The ball is already on that word.'))return `You’re already on ${current.toUpperCase()}. Try another word.`;
 return message;
}

/** A landed second shot outside finishing range explains an unreachable par. */
export function shortSecondShot(state,inRange){
 const history=state?.history??[],last=history.at(-1);
 return !state?.waypoint&&state?.finish_mode==='range'&&history.length===2&&last?.attempt===2&&!!last.success&&!state.won&&!inRange;
}
/** Approved copy for the later per-hole vocabulary filter. */
export function vagueWordNotice(word){return `${String(word).trim().toUpperCase()} is too vague for this hole. Try again.`;}

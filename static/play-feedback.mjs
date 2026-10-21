/** Short feedback describes the failed connection, independent of retry timing. */
export function attemptNotice(event,target){
 if(event?.outcome==='miss')return `Miss! ${event.word.toUpperCase()} needs a stronger link to ${event.origin.toUpperCase()}.`;
 if(event?.outcome==='water')return `Backwards! ${event.word.toUpperCase()} is less related to ${target.toUpperCase()} than ${event.origin.toUpperCase()}.`;
 return 'Par is out of reach. Try again.';
}

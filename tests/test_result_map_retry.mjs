import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('static/app.js','utf8');
const handlers={},map={addEventListener:(type,fn)=>handlers[type]=fn};
let result=true,busy=false,restarts=0,activations=0;
const label={dataset:{resumeThrough:'1'},hasAttribute:()=>true};
const context={Math,simpleDaily:true,get busy(){return busy;},holeResult:()=>result,courseResult:()=>false,$:id=>id==='map'?map:{hidden:true},tappedWord:()=>label,activateWord:()=>activations++,retryFromWord(){},resultControlNavigation:action=>{assert.equal(action,context.retryResultHole);restarts++;},retryResultHole(){}};
vm.runInNewContext(source.slice(source.indexOf('let pendingWordTap=null;'),source.indexOf('function syncControlTrees()')),context);
const event=(extra={})=>({isPrimary:true,button:0,pointerId:1,clientX:10,clientY:10,detail:1,preventDefault(){},stopPropagation(){},target:{closest:()=>label},...extra});
function tap(end={}){handlers.pointerdown(event());handlers.pointerup(event(end));handlers.click(event());}
tap();assert.equal(restarts,1,'results label/background uses Try Again action');assert.equal(activations,0);
tap({clientY:40});assert.equal(restarts,1,'scrolling must not restart');
handlers.pointerdown(event());handlers.pointercancel();handlers.click(event());assert.equal(restarts,1,'cancelled touch must not restart');
busy=true;tap();assert.equal(restarts,1,'animation blocks restart');busy=false;
handlers.keydown(event({key:'Enter'}));assert.equal(restarts,2);
result=false;tap();assert.equal(activations,1,'normal play keeps existing word selection');assert.equal(restarts,2);
console.log('Results map retry passed: tap uses Try Again; scroll, cancelled touch and busy state do not restart; normal word selection stays intact.');

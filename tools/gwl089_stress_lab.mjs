// Offline seeded operational stress test of GWL v0.8.9 media safety gate.
// No HTTP ports, Windows media APIs, ADB, watch, browser or system commands.
import assert from 'node:assert/strict';
import {MediaSafetyGuard} from '../motion/media_safety_guard.mjs';
const commandSet=['NEXT','PREVIOUS','PLAY_PAUSE','VOLUME_UP','VOLUME_DOWN'];
function randomGen(seed){let state=seed>>>0;return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296}}
export async function runStress({cases=2048,seed=89013}={}){
 if(!Number.isSafeInteger(cases)||cases<1||cases>10000)throw new RangeError('bad case count');
 const rand=randomGen(seed);let attempted=0,accepted=0,blocked=0,failures=0,externalCalls=0,unsafeCalls=0;
 for(let i=0;i<cases;i++){
  let clock=100000+i*100000, used=0;
  const expectedFailure=i%13===0;
  const executor=async command=>{used++;externalCalls++;if(!commandSet.includes(command))unsafeCalls++;
    if(expectedFailure)throw new Error('injected synthetic process failure');};
  const guard=new MediaSafetyGuard({executor,clock:()=>clock,maxCommands:3});
  for(let j=0;j<6;j++){
   attempted++;const action=j===5?'MALICIOUS_ACTION':commandSet[Math.floor(rand()*commandSet.length)];
   try{await guard.dispatch(action);accepted++}catch(e){blocked++;if(!e?.code)throw e;}
   clock+=(j%2===0)?250:1100;
  }
  assert.ok(used<=3,'guard must enforce 3 sends / simulated window');
  if(expectedFailure){assert.equal(used,1,'uncertain error must block all subsequent sends');failures++;
   assert.equal(guard.snapshot().locked,true);}
  else assert.equal(guard.snapshot().locked,false);
 }
 assert.equal(unsafeCalls,0,'never invoke unallowlisted commands');
 assert.equal(attempted,accepted+blocked);
 return {kind:'SYNTHETIC_OPERATIONAL_STRESS_ONLY',seed,cases,attempted,accepted,blocked,
         injected_failures:failures,external_calls_faked:externalCalls,unsafe_calls:unsafeCalls,
         live_media_actions:0,adb_actions:0,watch_actions:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/tools/gwl089_stress_lab.mjs')){
 const summary=await runStress();console.log(JSON.stringify(summary,null,2));
}

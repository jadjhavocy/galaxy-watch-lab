import assert from 'node:assert/strict';
import {MediaSafetyGuard,MediaGuardError,MEDIA_ACTIONS} from '../motion/media_safety_guard.mjs';
import {createMediaBridge} from '../tools/gwl088_media_bridge.mjs';

assert.equal(MEDIA_ACTIONS.length,5);
const mk=(executor,opts={})=>new MediaSafetyGuard({executor,clock:()=>fakeNow,...opts});
let fakeNow=100000;
const outgoing=[];
const guard=mk(async cmd=>{outgoing.push(cmd);},{maxCommands:2});
assert.equal((await guard.dispatch('PLAY_PAUSE')).status,'SENT');
assert.equal(outgoing.length,1);
await assert.rejects(guard.dispatch('PLAY_PAUSE'),e=>e.code==='media_guard_cooldown');
fakeNow+=1000;
assert.equal((await guard.dispatch('NEXT')).status,'SENT');
fakeNow+=1000;
await assert.rejects(guard.dispatch('NEXT'),e=>e.code==='media_guard_rate_limit');
assert.equal(outgoing.length,2);
fakeNow+=61000;
assert.equal((await guard.dispatch('PREVIOUS')).status,'SENT');
assert.equal(guard.snapshot().sent,3);
await assert.rejects(guard.dispatch('COMMAND_INJECTION'),e=>e.code==='not_allowlisted');
assert.equal(outgoing.length,3);

// Never send a second key during an unresolved first send.
let release;
const unresolved=mk(()=>new Promise(resolve=>{release=resolve}),{gapMs:0});
const first=unresolved.dispatch('NEXT');
await new Promise(resolve=>setImmediate(resolve));
await assert.rejects(unresolved.dispatch('PREVIOUS'),e=>e.code==='dispatch_in_progress');
release();
await first;
assert.equal(unresolved.snapshot().sent,1);

// A rejected execution is ambiguous: suppress all later attempts until explicit restart.
let tries=0;
const failed=mk(async()=>{tries++;throw new Error('fake process failed')},{gapMs:0});
await assert.rejects(failed.dispatch('NEXT'),e=>e.code==='dispatch_uncertain_restart_required');
assert.equal(failed.snapshot().locked,true);
fakeNow+=10000;
await assert.rejects(failed.dispatch('NEXT'),e=>e.code==='guard_locked_restart_required');
assert.equal(tries,1);

// Timeout must similarly prevent silent retry, even if the underlying operation is still pending.
const hanging=mk(()=>new Promise(()=>{}),{timeoutMs:200});
await assert.rejects(hanging.dispatch('NEXT'),e=>e.code==='dispatch_uncertain_restart_required');
assert.equal(hanging.snapshot().reason,'timeout_uncertain');

assert.throws(()=>new MediaSafetyGuard({executor:async()=>{},maxCommands:99}),/invalid media safety/);

// HTTP dry-run verifies v0.8.8 compatibility without touching the actual Windows media backend.
const dry=createMediaBridge({port:0});
await new Promise((yes,no)=>{dry.once('error',no);dry.listen(0,'127.0.0.1',yes)});
try{
 const root='http://127.0.0.1:'+dry.address().port;
 let response=await fetch(root+'/api/diagnostics');assert.equal(response.status,200);
 let diagnostic=await response.json();assert.equal(diagnostic.live,false);assert.equal(diagnostic.media_guard.locked,false);
 const page=await (await fetch(root+'/')).text();
 assert.match(page,/id="guardStatus"/);
 assert.match(page,/v0\.8\.9/);
 const nonce=page.match(/const sessionNonce='([a-f0-9]{48})'/)?.[1];assert.ok(nonce);
 const post=(route,body={})=>fetch(root+route,{method:'POST',headers:{origin:root,'x-gwl-session':nonce,'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post('/api/arm')).status,200);
 response=await post('/api/command',{command:'PLAY_PAUSE'});
 assert.equal((await response.json()).status,'DRY_RUN');
 assert.equal((await (await fetch(root+'/api/diagnostics')).json()).media_guard.attempts,0);
}finally{await new Promise(yes=>dry.close(yes))}

// LIVE HTTP path uses INJECTED FAKE executor ONLY; never invokes Python, SendInput or OS keys.
let mediaCalls=[];
const live=createMediaBridge({live:true,platform:'win32',port:0,mediaExecutor:async cmd=>{mediaCalls.push(cmd)}});
await new Promise((yes,no)=>{live.once('error',no);live.listen(0,'127.0.0.1',yes)});
try{
 const root='http://127.0.0.1:'+live.address().port;
 const nonce=(await (await fetch(root+'/')).text()).match(/const sessionNonce='([a-f0-9]{48})'/)?.[1];assert.ok(nonce);
 const post=(route,body={})=>fetch(root+route,{method:'POST',headers:{origin:root,'x-gwl-session':nonce,'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post('/api/arm')).status,200);
 let result=await post('/api/command',{command:'NEXT'});
 assert.equal(result.status,200);assert.equal((await result.json()).status,'OS_KEY_SENT');
 assert.deepEqual(mediaCalls,['NEXT']);
 const diag=await (await fetch(root+'/api/diagnostics')).json();assert.equal(diag.media_guard.sent,1);
 assert.equal((await post('/api/command',{command:'NEXT'})).status,403);
}finally{await new Promise(yes=>live.close(yes))}

// LIVE failure path remains fail-closed and has no real media side effects.
let failureCalls=0;
const failureServer=createMediaBridge({live:true,platform:'win32',port:0,mediaExecutor:async()=>{failureCalls++;throw Error('fake error')}});
await new Promise((yes,no)=>{failureServer.once('error',no);failureServer.listen(0,'127.0.0.1',yes)});
try{
 const root='http://127.0.0.1:'+failureServer.address().port;
 const nonce=(await (await fetch(root+'/')).text()).match(/const sessionNonce='([a-f0-9]{48})'/)?.[1];
 const post=(route,body={})=>fetch(root+route,{method:'POST',headers:{origin:root,'x-gwl-session':nonce,'content-type':'application/json'},body:JSON.stringify(body)});
 await post('/api/arm');
 const failedResponse=await post('/api/command',{command:'PLAY_PAUSE'});
 assert.equal(failedResponse.status,503);
 assert.equal((await failedResponse.json()).error,'dispatch_uncertain_restart_required');
 assert.equal(failureCalls,1);
 const status=await (await fetch(root+'/api/diagnostics')).json();assert.equal(status.media_guard.locked,true);
 const blocked=await post('/api/arm');
 assert.equal(blocked.status,503);
 assert.equal(failureCalls,1);
}finally{await new Promise(yes=>failureServer.close(yes))}
console.log('GWL_V089_MEDIA_RELIABILITY_TESTS=PASS');
console.log('SAFE_GUARD=PASS SINGLE_FLIGHT=PASS AMBIGUOUS_FAILURE_FAIL_CLOSED=PASS');
console.log('HTTP_DRY_RUN=PASS HTTP_LIVE_FAKE_EXECUTOR=PASS');
console.log('REAL_WINDOWS_MEDIA_KEYS_NOT_SENT=YES');

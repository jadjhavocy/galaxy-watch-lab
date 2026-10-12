import assert from 'node:assert/strict';
import http from 'node:http';
import {GestureEngine} from '../motion/engine.mjs';
import {ControlRouter} from '../motion/control_router.mjs';
import {VirtualPlayer} from '../motion/virtual_player.mjs';
import {GestureProfileRouter,GESTURES,PRESETS,validateMapping,CANCEL_GESTURE} from '../motion/gesture_profile_router.mjs';
import {createProfilePlayground} from '../tools/gwl087_playground.mjs';
const event=(n,axis='X',direction='positive')=>({type:'wrist_flick',timestamp_ns:n,axis,direction});
assert.equal(CANCEL_GESTURE,'Z:negative');
assert.equal(GESTURES.length,5);
for(const p of Object.values(PRESETS))assert.deepEqual(validateMapping(p),p);
assert.throws(()=>validateMapping({'Z:negative':'NEXT'}),/invalid mapping keys/);
assert.throws(()=>validateMapping({...PRESETS.classic,'Z:negative':'NEXT'}),/invalid mapping keys/);
assert.throws(()=>validateMapping({...PRESETS.classic,'X:positive':'EXEC'}),/not allowlisted/);
assert.throws(()=>validateMapping([]),/invalid mapping object/);
assert.throws(()=>validateMapping(null),/invalid mapping object/);
assert.throws(()=>validateMapping(JSON.parse('{"X:positive":"NEXT","X:negative":"PREVIOUS","Y:positive":"VOLUME_UP","Y:negative":"VOLUME_DOWN","Z:positive":"PLAY_PAUSE","__proto__":"NEXT"}')),/invalid mapping keys/);
const r=new GestureProfileRouter();
assert.equal(r.accept(event(1),500).reason,'not_armed');
r.arm(1000);
assert.equal(r.accept(event(2),1100).command,'NEXT');
assert.equal(r.accept(event(3),1200).reason,'not_armed');
r.arm(2000);
assert.equal(r.selectPreset('mirrored',2100).status,'profile_selected');
assert.equal(r.accept(event(4),2150).reason,'not_armed');
r.arm(3000);
assert.equal(r.accept(event(5),3100).command,'PREVIOUS');
assert.throws(()=>r.selectPreset('nonexistent',3200),/unknown profile/);
r.selectPreset('minimal',4000);
r.arm(4100);
assert.equal(r.accept(event(6,'Y','positive'),4200).reason,'gesture_disabled');
assert.equal(r.accept(event(7,'X','positive'),4300).reason,'not_armed');
r.arm(5200);
assert.equal(r.accept(event(8,'Z','negative'),5300).status,'cancelled');
assert.equal(r.accept(event(9,'X','positive'),5400).reason,'not_armed');
assert.throws(()=>r.selectCustom({...PRESETS.classic,'X:positive':'CMD'},5500),/not allowlisted/);
assert.equal(r.snapshot().name,'minimal');
r.selectCustom({...PRESETS.classic,'X:positive':'PLAY_PAUSE'},6000);
r.arm(6100);
assert.equal(r.accept(event(10),6200).command,'PLAY_PAUSE');
assert.equal(r.dispatched,3);
// Crosses original classifier + safety layer + profile mapping + virtual player.
const e=new GestureEngine(), controller=new GestureProfileRouter(), player=new VirtualPlayer();
controller.selectPreset('classic',100);
controller.arm(2000);
const pkt=(ms,g)=>({schema:1,timestamp_ns:ms*1e6,gyro_rads:g,quat_xyzw:[0,0,0,1]});
e.process(pkt(1000,[3,0,0]));const actual=e.process(pkt(1200,[3.4,0,0]));
assert.equal(actual?.axis,'X');
const choice=controller.accept(actual,2200);assert.equal(choice.command,'NEXT');
assert.equal(player.apply(choice.command).track_number,2);
assert.equal(controller.accept(actual,2300).reason,'duplicate_or_stale');
assert.throws(()=>new ControlRouter({armWindowMs:20}),/invalid router timing/);
// Local static server whitelist/localhost, never mutates files.
const server=createProfilePlayground();
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
try{
 const url='http://127.0.0.1:'+server.address().port;
 for(const route of ['/','/motion/gesture_profile_router.mjs','/motion/control_router.mjs','/motion/engine.mjs','/motion/virtual_player.mjs']){
  const res=await fetch(url+route);assert.equal(res.status,200,route);
  assert.equal(res.headers.get('x-content-type-options'),'nosniff');
  assert.equal(res.headers.get('cache-control'),'no-store');
  const contents=await res.text();assert.ok(contents.length>100);
 }
 const unknown=await fetch(url+'/api/execute');assert.equal(unknown.status,404);
 const post=await fetch(url+'/',{method:'POST'});assert.equal(post.status,404);
}finally{await new Promise(resolve=>server.close(resolve));}
console.log('GWL_V087_PROFILES_TESTS=PASS');
console.log('PRESETS=3 CUSTOM=YES Z_MINUS_RESERVED=YES');
console.log('LOCAL_HTTP=PASS REAL_MEDIA=NO WATCH=NO ADB=NO');

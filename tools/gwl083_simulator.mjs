import {GestureEngine} from '../motion/engine.mjs';

// Deterministic fixtures mimic up to five delivered IMU packets per second.
const packetStepMs = 200;
const identityQuaternion = [0,0,0,1];
const packet = (ms, gyro) => ({
  schema:1, seq:Math.round(ms/packetStepMs), timestamp_ns:ms*1e6,
  gyro_rads:gyro, quat_xyzw:identityQuaternion
});
const noise = i => [Math.sin(i*1.7)*.12, Math.cos(i*1.1)*.15, Math.sin(i*.7)*.08];
export const scenarios = ['still','typing','walking','raise','spike','flick','duplicates'];
export const thresholds = [1.5,2.4,3,4];

export function scenario(kind, durationMs=14000) {
  if (!scenarios.includes(kind)) throw new Error('Unknown scenario: '+kind);
  if (!Number.isFinite(durationMs) || durationMs<=0 || durationMs>60000) throw new Error('Invalid duration');
  const result=[];
  for(let ms=0,i=0;ms<durationMs;ms+=packetStepMs,i++){
    let g=noise(i);
    if(kind==='typing') g=[.55*Math.sin(i), .5*Math.cos(i), .3*Math.sin(i/2)];
    if(kind==='walking') g=[.8*Math.sin(i*.9), .7*Math.cos(i*.9), .4*Math.sin(i*.6)];
    if(kind==='raise') g=[1.4*Math.sin(i*.35), 1.0*Math.cos(i*.3), .7*Math.sin(i*.25)];
    if(kind==='spike'&&i===25) g=[6,0,0];
    if(kind==='flick'&&[25,26,45,46].includes(i)) g=[3.8,0,0];
    if(kind==='duplicates'&&i===20){
      result.push(packet(ms,g)); result.push(packet(ms,g)); continue;
    }
    result.push(packet(ms,g));
  }
  return result;
}

export function evaluate(kind, threshold=2.4) {
  if (!Number.isFinite(threshold) || threshold<=0) throw new Error('Invalid threshold');
  const engine=new GestureEngine({threshold});
  const items=scenario(kind);
  let events=0;
  for(const p of items) if(engine.process(p)) events++;
  return {name:kind,packets:items.length,events,stale:engine.stats.stale,invalid:engine.stats.invalid};
}

export function thresholdSweep() {
  const results=thresholds.map(threshold=>({
    threshold_rads:threshold,
    scenarios:scenarios.map(name=>evaluate(name,threshold))
  }));
  return {
    type:'SYNTHETIC_ONLY',
    packet_rate_hz:5,
    case_duration_s:14,
    note:'Illustrative deterministic fixtures, not measured accuracy or clinical/user gesture validation',
    results
  };
}

if (process.argv[1]?.replaceAll('\\','/').endsWith('/tools/gwl083_simulator.mjs')) {
  console.log(JSON.stringify(thresholdSweep(),null,2));
}

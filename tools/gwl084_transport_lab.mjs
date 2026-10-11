// Deterministic, offline transport impairments for the existing browser GestureEngine.
// No network, ADB, watch, or media actions. Transport arrival time is test-only metadata.
import { GestureEngine } from '../motion/engine.mjs';
import { scenario, scenarios, thresholds } from './gwl083_simulator.mjs';

export const profiles = Object.freeze([
  {name:'pristine',drop:0,jitter_ms:0,duplicate:0},
  {name:'wifi_light',drop:.05,jitter_ms:80,duplicate:.02},
  {name:'wifi_noisy',drop:.20,jitter_ms:350,duplicate:.10},
  {name:'wifi_severe',drop:.45,jitter_ms:750,duplicate:.18},
  {name:'blackhole',drop:1,jitter_ms:0,duplicate:0},
]);

function randomGenerator(seed) {
  if(!Number.isSafeInteger(seed)) throw new TypeError('seed must be a safe integer');
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}

export function impair(packets, profile, seed=12345) {
  if(!Array.isArray(packets) || !profile ||
     ![profile.drop,profile.duplicate].every(x=>Number.isFinite(x)&&x>=0&&x<=1) ||
     !Number.isFinite(profile.jitter_ms) || profile.jitter_ms<0 || profile.jitter_ms>10000) {
    throw new TypeError('invalid impairment input');
  }
  const random=randomGenerator(seed);
  let lost=0, duplicated=0;
  const deliveries=[];
  for(let i=0;i<packets.length;i++) {
    const pkt=packets[i];
    if(random()<profile.drop) { lost++; continue; }
    const sensorMs=pkt.timestamp_ns/1e6;
    const arrival_ms=sensorMs+40+random()*profile.jitter_ms;
    deliveries.push({packet:pkt,arrival_ms,source_index:i});
    if(random()<profile.duplicate) {
      duplicated++;
      deliveries.push({packet:pkt,arrival_ms:arrival_ms+10+random()*profile.jitter_ms,source_index:i});
    }
  }
  deliveries.sort((a,b)=>a.arrival_ms-b.arrival_ms || a.source_index-b.source_index);
  let reordered=0, maxSeen=-Infinity;
  for(const item of deliveries){
    if(item.source_index<maxSeen)reordered++;
    maxSeen=Math.max(maxSeen,item.source_index);
  }
  return {deliveries,lost,duplicated,reordered};
}

export function measure(kind, threshold, profile, seed=12345) {
  const pkts=scenario(kind);
  const result=impair(pkts,profile,seed);
  const engine=new GestureEngine({threshold});
  const gestStarts=[5000,9000]; // fixture-specific intent markers; never presented as measured human motion.
  const delays=[];
  let detected=0;
  for(const {packet,arrival_ms} of result.deliveries){
    const event=engine.process(packet);
    if(!event)continue;
    detected++;
    if(kind==='flick'){
      const sensorMs=event.timestamp_ns/1e6;
      const onset=gestStarts.filter(ms=>ms<=sensorMs).at(-1);
      if(onset!==undefined && sensorMs-onset<700) delays.push(Math.round(arrival_ms-onset));
    }
  }
  return {
    profile:profile.name,scenario:kind,threshold_rads:threshold,
    source_packets:pkts.length,lost:result.lost,duplicate_packets:result.duplicated,
    arrival_reorders:result.reordered,received:result.deliveries.length,
    accepted:engine.stats.accepted,discarded_stale:engine.stats.stale,
    events:detected,fixture_detection_lags_ms:delays,
  };
}

export function runMatrix() {
  const results=[];
  for(let p=0;p<profiles.length;p++){
    for(const threshold of thresholds){
      for(let i=0;i<scenarios.length;i++){
        results.push(measure(scenarios[i],threshold,profiles[p],10000+p*100+i));
      }
    }
  }
  return {
    schema:1,type:'SYNTHETIC_TRANSPORT_ONLY',
    engine:'existing-v0.8-no-algorithm-changes',
    source_rate_hz:5,fixture_duration_s:14,
    limitations:'Synthetic scenario events are NOT real precision, recall, or Wi-Fi availability measurements. Arrival is simulated, not a live socket test.',
    profiles,results
  };
}

export function reportCsv(report){
  const fields=['profile','scenario','threshold_rads','source_packets','lost','duplicate_packets','arrival_reorders','received','accepted','discarded_stale','events'];
  return [fields.join(','),...report.results.map(r=>fields.map(f=>r[f]).join(','))].join('\n')+'\n';
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/tools/gwl084_transport_lab.mjs')){
  console.log(JSON.stringify(runMatrix(),null,2));
}

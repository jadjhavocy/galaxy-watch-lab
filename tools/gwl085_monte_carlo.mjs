// GWL v0.8.5 — offline Monte Carlo benchmark; no watch, network, media or ADB.
import { GestureEngine } from '../motion/engine.mjs';
import { scenario, scenarios, thresholds } from './gwl083_simulator.mjs';
import { impair, profiles } from './gwl084_transport_lab.mjs';

export const strategies = Object.freeze([
  { name: 'arrival_order', hold_ms: 0 },
  { name: 'reorder_250ms', hold_ms: 250 },
  { name: 'reorder_500ms', hold_ms: 500 },
]);
export const gestureOnsetsMs = Object.freeze([5000, 9000]);

// Deterministic, bounded *windowed* reorder prototype, NOT installed in production.
// A packet is emitted at the end of its arrival-time bucket. Thus buffering adds
// less than hold_ms of latency, except for the implicit simulation epoch boundary.
// Within each completed bucket, packet sequence is reconstructed by sensor time.
// Packets that arrive in later buckets cannot be recovered retroactively.
export function schedule(deliveries, holdMs) {
  if (!Array.isArray(deliveries) || !Number.isSafeInteger(holdMs) || holdMs < 0 || holdMs > 2000)
    throw new TypeError('invalid delivery schedule');
  if (holdMs === 0) return deliveries.map(d => ({...d, processed_ms: d.arrival_ms}));
  const buckets = new Map();
  for (const d of deliveries) {
    if (!Number.isFinite(d.arrival_ms) || !Number.isFinite(d.packet?.timestamp_ns))
      throw new TypeError('invalid packet clock');
    const index = Math.floor(d.arrival_ms / holdMs);
    if (!buckets.has(index)) buckets.set(index, []);
    buckets.get(index).push(d);
  }
  const output = [];
  for (const index of [...buckets.keys()].sort((a,b) => a-b)) {
    const current = buckets.get(index).sort((a,b) =>
      a.packet.timestamp_ns-b.packet.timestamp_ns || a.arrival_ms-b.arrival_ms || a.source_index-b.source_index);
    const processed_ms = (index+1)*holdMs;
    for (const d of current) output.push({...d,processed_ms});
  }
  return output;
}

function detectFromScheduled(deliveries, kind, threshold) {
  const engine = new GestureEngine({threshold});
  const events = [];
  let extraDelay = 0;
  for (const {packet, arrival_ms, processed_ms} of deliveries) {
    extraDelay += processed_ms - arrival_ms;
    const detected = engine.process(packet);
    if (detected) events.push({event:detected, detected_ms:processed_ms});
  }
  const matched = new Set();
  const delays = [];
  let falseEvents = 0;
  for (const item of events) {
    const sensor_ms = item.event.timestamp_ns / 1e6;
    const eligible = kind === 'flick' ? gestureOnsetsMs.find((onset, i) =>
      !matched.has(i) && sensor_ms >= onset && sensor_ms <= onset + 650) : undefined;
    if (eligible === undefined) { falseEvents++; continue; }
    const index = gestureOnsetsMs.indexOf(eligible);
    matched.add(index);
    delays.push(Math.max(0, item.detected_ms - eligible));
  }
  return {
    events: events.length, true_fixture_windows:matched.size,
    missed_fixture_windows:kind==='flick' ? gestureOnsetsMs.length-matched.size : 0,
    false_fixture_events:falseEvents,
    accepted:engine.stats.accepted, discarded_stale:engine.stats.stale,
    detection_delays_ms:delays,
    average_added_buffer_ms:deliveries.length ? +(extraDelay/deliveries.length).toFixed(1):0,
  };
}

export function benchmarkOne(kind, threshold, profile, seed, strategy) {
  if (!scenarios.includes(kind) || !thresholds.includes(threshold) ||
      !profiles.includes(profile) || !strategies.includes(strategy)) throw new TypeError('unknown benchmark dimension');
  const source = scenario(kind);
  const impaired = impair(source,profile,seed);
  const scheduled = schedule(impaired.deliveries,strategy.hold_ms);
  const r = detectFromScheduled(scheduled,kind,threshold);
  return {
    profile:profile.name, scenario:kind, threshold_rads:threshold, strategy:strategy.name,
    source_packets:source.length,lost:impaired.lost,arrival_reorders:impaired.reordered,
    duplicate_packets:impaired.duplicated,received:impaired.deliveries.length,...r,
  };
}

function percentile(xs,p) {
  if (!xs.length) return null;
  const sorted=[...xs].sort((a,b)=>a-b);
  return sorted[Math.ceil((p/100)*sorted.length)-1];
}

// Default 64 independently seeded impairments / row. 5 profiles x 4 thresholds
// x 7 motion cases x 3 strategies = 420 aggregated rows; 26,880 runs overall.
export function runStudy(options={}) {
  const runs = options.seeds ?? 64;
  if(!Number.isSafeInteger(runs) || runs < 1 || runs > 256) throw new RangeError('seeds must be 1..256');
  const results=[];
  for (let pi=0;pi<profiles.length;pi++) {
    for (const threshold of thresholds) {
      for (let si=0;si<scenarios.length;si++) {
        const kind=scenarios[si];
        const stats=strategies.map(strategy=>({strategy,sum:{events:0,true_fixture_windows:0,
          missed_fixture_windows:0,false_fixture_events:0,discarded_stale:0,lost:0,
          arrival_reorders:0,received:0,added_buffer_ms:0},lags:[]}));
        for (let iteration=0;iteration<runs;iteration++) {
          const seed = 10729 + iteration*7919 + pi*100003 + si*577;
          for(let st=0;st<strategies.length;st++) {
            const row=benchmarkOne(kind,threshold,profiles[pi],seed,strategies[st]);
            const target=stats[st];
            for (const [src,dst] of [['events','events'],['true_fixture_windows','true_fixture_windows'],
              ['missed_fixture_windows','missed_fixture_windows'],['false_fixture_events','false_fixture_events'],
              ['discarded_stale','discarded_stale'],['lost','lost'],['arrival_reorders','arrival_reorders'],
              ['received','received']]) target.sum[dst]+=row[src];
            target.sum.added_buffer_ms+=row.average_added_buffer_ms;
            target.lags.push(...row.detection_delays_ms);
          }
        }
        for(const x of stats){
          const expected=kind==='flick'?runs*gestureOnsetsMs.length:0;
          results.push({profile:profiles[pi].name,scenario:kind,threshold_rads:threshold,
            strategy:x.strategy.name,seeds:runs,expected_fixture_windows:expected,
            detected_fixture_windows:x.sum.true_fixture_windows,
            missed_fixture_windows:x.sum.missed_fixture_windows,
            false_fixture_events:x.sum.false_fixture_events,
            events_total:x.sum.events,stale_total:x.sum.discarded_stale,
            dropped_total:x.sum.lost,reordered_arrivals_total:x.sum.arrival_reorders,
            received_total:x.sum.received,
            avg_extra_buffer_ms:+(x.sum.added_buffer_ms/runs).toFixed(1),
            p95_fixture_detection_lag_ms:percentile(x.lags,95),
          });
        }
      }
    }
  }
  return {schema:1,kind:'SYNTHETIC_MONTE_CARLO_ONLY',version:'0.8.5',
    seed_count:runs,profiles:profiles.map(x=>x.name),thresholds,
    scenarios,strategies,conditions:profiles.length*thresholds.length*scenarios.length,
    experimental_variants:results.length,total_simulations:results.length*runs,
    limitations:'Deterministic synthetic fixtures, not real-world accuracy. Windowed buffering is experimental and has not been installed on devices or servers.',results};
}
export function reportCsv(report) {
  const columns=['profile','scenario','threshold_rads','strategy','seeds','expected_fixture_windows',
    'detected_fixture_windows','missed_fixture_windows','false_fixture_events','events_total',
    'stale_total','dropped_total','reordered_arrivals_total','received_total',
    'avg_extra_buffer_ms','p95_fixture_detection_lag_ms'];
  return [columns.join(','),...report.results.map(row=>columns.map(k=>row[k]??'').join(','))].join('\n')+'\n';
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/tools/gwl085_monte_carlo.mjs')) {
  const n=process.argv[2]?Number(process.argv[2]):64;
  console.log(JSON.stringify(runStudy({seeds:n}),null,2));
}

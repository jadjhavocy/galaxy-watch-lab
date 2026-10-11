import assert from 'node:assert/strict';
import {scenario,evaluate} from '../tools/gwl083_simulator.mjs';
import {profiles} from '../tools/gwl084_transport_lab.mjs';
import {schedule,strategies,benchmarkOne,runStudy,reportCsv} from '../tools/gwl085_monte_carlo.mjs';

// A bounded reorder window recovers an inverted pair only if both arrive
// in the same time bucket. This specifically tests non-oracular behavior.
const first={packet:{timestamp_ns:0},arrival_ms:325,source_index:0};
const second={packet:{timestamp_ns:200e6},arrival_ms:250,source_index:1};
const raw=schedule([second,first],0);
const buffered=schedule([second,first],250);
assert.deepEqual(raw.map(x=>x.packet.timestamp_ns),[200e6,0]);
assert.deepEqual(buffered.map(x=>x.packet.timestamp_ns),[0,200e6]);
assert.deepEqual(schedule([],500),[]);
assert.throws(()=>schedule([], -1),/invalid delivery/);

for(const kind of ['still','typing','walking','raise','spike','flick','duplicates']) {
  for(const threshold of [1.5,2.4,3,4]) {
    const current=benchmarkOne(kind,threshold,profiles[0],2026,strategies[0]);
    assert.equal(current.events,evaluate(kind,threshold).events,`baseline parity ${kind} ${threshold}`);
    assert.equal(current.dropped_total,undefined);
    assert.equal(current.lost,0);
    const win=benchmarkOne(kind,threshold,profiles[0],2026,strategies[2]);
    assert.equal(win.events,current.events,`pristine buffer parity ${kind} ${threshold}`);
  }
}
const a=runStudy({seeds:3}), b=runStudy({seeds:3});
assert.deepEqual(a,b,'repeatable seeds');
assert.equal(a.conditions,140);
assert.equal(a.experimental_variants,420);
assert.equal(a.total_simulations,1260);
assert.equal(a.results.length,420);
assert.ok(a.results.some(x=>x.reordered_arrivals_total>0));
assert.ok(a.results.some(x=>x.missed_fixture_windows>0));
assert.ok(a.results.some(x=>x.false_fixture_events>0));
assert.equal(reportCsv(a).trim().split('\n').length,421);
const blackout=a.results.filter(x=>x.profile==='blackhole');
assert.ok(blackout.every(x=>x.detected_fixture_windows===0 && x.events_total===0));
for(const row of a.results){
  assert.equal(row.detected_fixture_windows+row.missed_fixture_windows,row.expected_fixture_windows);
  assert.ok(row.avg_extra_buffer_ms>=0);
  assert.ok(row.p95_fixture_detection_lag_ms===null || row.p95_fixture_detection_lag_ms>=0);
}
assert.throws(()=>runStudy({seeds:0}),/seeds/);
console.log('GWL_V085_MONTE_CARLO_TESTS=PASS');
console.log('AGGREGATE_ROWS=420');
console.log('SYNTHETIC_ONLY=YES');

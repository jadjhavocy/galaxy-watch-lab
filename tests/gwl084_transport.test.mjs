import assert from 'node:assert/strict';
import {impair,measure,runMatrix,reportCsv,profiles} from '../tools/gwl084_transport_lab.mjs';
import {scenario,evaluate,scenarios,thresholds} from '../tools/gwl083_simulator.mjs';

const pristine=profiles.find(x=>x.name==='pristine');
const blackhole=profiles.find(x=>x.name==='blackhole');
assert.ok(pristine&&blackhole);
for(const kind of scenarios){
  for(const threshold of thresholds){
    const baseline=evaluate(kind,threshold);
    const clean=measure(kind,threshold,pristine);
    assert.equal(clean.events,baseline.events,`pristine must equal existing engine: ${kind}/${threshold}`);
    assert.equal(clean.lost,0);
    assert.equal(clean.arrival_reorders,0);
    assert.equal(clean.received,clean.source_packets);
    assert.equal(measure(kind,threshold,blackhole).events,0);
  }
}
const noisy=profiles.find(x=>x.name==='wifi_noisy');
const p=scenario('flick');
assert.deepEqual(impair(p,noisy,123),impair(p,noisy,123),'seeded corruption reproducible');
const impaired=impair(p,noisy,123);
assert.ok(impaired.lost>0 && impaired.duplicated>0,'fixture must exercise packet corruption');
const severe=measure('flick',2.4,profiles.find(x=>x.name==='wifi_severe'),123);
assert.ok(severe.received<=severe.source_packets+severe.duplicate_packets);
assert.ok(severe.discarded_stale>=0);
assert.throws(()=>impair(p,{drop:-1,duplicate:0,jitter_ms:0}),/invalid impairment/);
assert.throws(()=>impair(p,{drop:0,duplicate:2,jitter_ms:0}),/invalid impairment/);
assert.throws(()=>impair(p,{drop:0,duplicate:0,jitter_ms:-1}),/invalid impairment/);
const m=runMatrix();
assert.equal(m.type,'SYNTHETIC_TRANSPORT_ONLY');
assert.equal(m.results.length,scenarios.length*thresholds.length*profiles.length);
assert.ok(m.results.every(x=>Number.isInteger(x.events)&&x.events>=0));
assert.equal(reportCsv(m).trim().split('\n').length,m.results.length+1);
assert.ok(m.results.some(x=>x.arrival_reorders>0),'jitter must reorder at least one stream');
assert.ok(m.results.some(x=>x.discarded_stale>0),'out-of-order/duplicate samples rejected');
console.log('GWL_V084_TRANSPORT_TESTS=PASS');
console.log(`TRANSPORT_MATRIX_CASES=${m.results.length}`);
console.log(`SEVERE_FLICK_EVENTS=${severe.events}`);

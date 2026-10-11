import assert from 'node:assert/strict';
import {evaluate,scenario,thresholdSweep,thresholds} from '../tools/gwl083_simulator.mjs';
import {GestureEngine} from '../motion/engine.mjs';

const negativeCases=['still','typing','walking','raise','spike'];

// The v0.8 production-default threshold is the regression gate for these synthetic fixtures.
for(const name of negativeCases) {
  assert.equal(evaluate(name,2.4).events,0,'default-threshold false detection: '+name);
}
assert.ok(evaluate('flick',2.4).events>=1,'default threshold misses synthetic flick');
assert.equal(evaluate('duplicates',2.4).stale,1,'duplicate stamp not rejected');

// Sensitivity sweep reports trade-offs instead of claiming *all* thresholds are safe.
const matrix=thresholdSweep();
assert.equal(matrix.type,'SYNTHETIC_ONLY');
assert.deepEqual(matrix.results.map(x=>x.threshold_rads),thresholds);
for(const row of matrix.results) {
  assert.equal(row.scenarios.length,7);
  assert.ok(row.scenarios.every(x=>Number.isInteger(x.events)&&x.events>=0));
}
// The low threshold intentionally detects non-gesture arm raising in this fixture.
assert.ok(evaluate('raise',1.5).events>0,'low-threshold false positives should be documented');
// A high threshold can reject deliberate synthetic flicks; do not mask missed gestures.
assert.equal(evaluate('flick',4).events,0,'expected high-threshold false negative');
for(const t of [2.4,3,4]) {
  for(const name of negativeCases) {
    assert.equal(evaluate(name,t).events,0,`negative case=${name} threshold=${t}`);
  }
}
{
  const engine=new GestureEngine();
  const frames=scenario('flick');
  const events=frames.map(p=>engine.process(p)).filter(Boolean);
  assert.ok(events.length>=1 && events.length<=2,'unexpected synthetic flick event count');
  const accepted=engine.stats.accepted;
  assert.equal(engine.process(frames.at(-1)),null,'repeated last sample must not emit');
  assert.equal(engine.stats.accepted,accepted,'repeated last sample counted twice');
}
console.log('GWL_V083_RELIABILITY_TESTS=PASS');
console.log('LOW_THRESHOLD_RAISE_FALSE_EVENTS='+evaluate('raise',1.5).events);
console.log('HIGH_THRESHOLD_FLICK_EVENTS='+evaluate('flick',4).events);

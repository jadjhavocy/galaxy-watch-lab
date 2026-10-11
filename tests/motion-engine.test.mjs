import assert from 'node:assert/strict';
import {GestureEngine,parseJsonl} from '../motion/engine.mjs';
const base=(ms,g=[0,0,0])=>({schema:1,timestamp_ns:ms*1e6,
  gyro_rads:g,quat_xyzw:[0,0,0,1]});
{
 const e=new GestureEngine();
 for(let i=0;i<100;i++)assert.equal(e.process(base(1000+i*100,[.2,.1,0])),null);
 assert.equal(e.events.length,0);
 assert.equal(e.stats.accepted,100);
}
{
 const e=new GestureEngine();
 assert.equal(e.process(base(1000,[3,0,0])),null);
 const gesture=e.process(base(1100,[3.2,0,0]));
 assert.equal(gesture?.type,'wrist_flick');
 assert.equal(gesture.axis,'X');
 assert.equal(e.process(base(1200,[4,0,0])),null);
 assert.equal(e.process(base(1300,[4,0,0])),null);
 assert.equal(e.events.length,1);
 assert.equal(e.process(base(2050,[3,0,0])),null);
 assert.equal(e.process(base(2150,[3,0,0]))?.type,'wrist_flick');
}
{
 const e=new GestureEngine();
 e.process(base(1000,[3,0,0]));
 assert.equal(e.process(base(1000,[3,0,0])),null);
 assert.equal(e.stats.stale,1);
 assert.equal(e.process({gyro_rads:[4,0,0]}),null);
 assert.equal(e.stats.invalid,1);
 assert.equal(e.process(base(1200,[0,3,0])),null);
 assert.equal(e.process(base(1300,[0,3,0]))?.axis,'Y');
}
{
 const items=parseJsonl([JSON.stringify(base(1000,[3,0,0])),
 JSON.stringify(base(1100,[3.5,0,0]))].join('\n'));
 const e=new GestureEngine();
 assert.equal(items.map(x=>e.process(x)).filter(Boolean).length,1);
 assert.throws(()=>parseJsonl('{bad'),/Invalid JSONL/);
}
console.log('GWL_V08_ENGINE_TESTS=PASS');

import {GestureEngine} from '../motion/engine.mjs';
import {ControlRouter} from '../motion/control_router.mjs';
import {VirtualPlayer} from '../motion/virtual_player.mjs';
const e=new GestureEngine(),router=new ControlRouter({minCommandGapMs:0}),player=new VirtualPlayer(),log=[];
let sensor=1000,host=1000;
const packet=(ms,g)=>({schema:1,timestamp_ns:ms*1e6,gyro_rads:g,quat_xyzw:[0,0,0,1]});
function simulate(axis,sign){
 sensor+=1500;host+=1500;
 const g=[0,0,0];g[['X','Y','Z'].indexOf(axis)]=sign*3.5;
 e.process(packet(sensor,g));const event=e.process(packet(sensor+200,g));
 if(!event)throw new Error('upstream synthetic gesture missed');
 const decision=router.accept(event,host);
 if(decision.status==='command')player.apply(decision.command);
 log.push({gesture:axis+(sign>0?'+':'-'),decision:decision.status,command:decision.command??null,player:player.snapshot()});
}
simulate('X',1); // Deliberately unarmed.
router.arm(host+=1000);simulate('X',1);
router.arm(host+=1000);simulate('Y',1);
router.arm(host+=1000);simulate('Z',1);
router.arm(host+=1000);simulate('Z',-1);
if(router.stats.commands!==3||log[0].decision!=='ignored'||log[4].decision!=='cancelled')throw new Error('demo safety failure');
console.log(JSON.stringify({kind:'SYNTHETIC_OFFLINE_ONLY',commands:router.stats.commands,log,final:player.snapshot()},null,2));

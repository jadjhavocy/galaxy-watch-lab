// v0.8.6: Explicit one-command arming. Offline only, no media/system side-effects.
// Sensor nanoseconds and host monotonic milliseconds are DIFFERENT clock domains.
export const MUSIC_COMMANDS=Object.freeze(['NEXT','PREVIOUS','VOLUME_UP','VOLUME_DOWN','PLAY_PAUSE']);
const TABLE=Object.freeze({'X:positive':'NEXT','X:negative':'PREVIOUS','Y:positive':'VOLUME_UP','Y:negative':'VOLUME_DOWN','Z:positive':'PLAY_PAUSE','Z:negative':'CANCEL'});
const result=(status,reason,extra={})=>({status,reason,...extra});
const isClock=x=>Number.isFinite(x)&&x>=0;
const validEvent=e=>e && typeof e==='object' && e.type==='wrist_flick' &&
 ['X','Y','Z'].includes(e.axis)&&['positive','negative'].includes(e.direction)&&isClock(e.timestamp_ns);
export class ControlRouter {
 constructor(options={}){
  this.armWindowMs=options.armWindowMs??10000;
  this.minCommandGapMs=options.minCommandGapMs??900;
  if(!Number.isSafeInteger(this.armWindowMs)||this.armWindowMs<1000||this.armWindowMs>30000||
    !Number.isSafeInteger(this.minCommandGapMs)||this.minCommandGapMs<0||this.minCommandGapMs>10000)
   throw new RangeError('invalid router timing');
  this.reset();
 }
 reset(){this.armedUntilMs=null;this.lastHostMs=-Infinity;this.lastStamp=-Infinity;this.lastCommandMs=-Infinity;this.stats={armed:0,commands:0,ignored:0,cancelled:0};}
 checkClock(nowMs){if(!isClock(nowMs)||nowMs<this.lastHostMs)throw new RangeError('non-monotonic host time');this.lastHostMs=nowMs;}
 arm(nowMs,context='music'){
  this.checkClock(nowMs);
  if(context!=='music')return result('ignored','wrong_context');
  this.armedUntilMs=nowMs+this.armWindowMs;this.stats.armed++;
  return result('armed','explicit_activation',{expires_ms:this.armedUntilMs});
 }
 disarm(nowMs){this.checkClock(nowMs);this.armedUntilMs=null;return result('disarmed','manual');}
 accept(event,nowMs,context='music'){
  this.checkClock(nowMs);
  if(!validEvent(event)){this.stats.ignored++;return result('ignored','invalid_event');}
  if(event.timestamp_ns<=this.lastStamp){this.stats.ignored++;return result('ignored','duplicate_or_stale');}
  this.lastStamp=event.timestamp_ns; // Also discard events received while not armed.
  if(context!=='music'){this.stats.ignored++;return result('ignored','wrong_context');}
  if(this.armedUntilMs===null){this.stats.ignored++;return result('ignored','not_armed');}
  if(nowMs>this.armedUntilMs){this.armedUntilMs=null;this.stats.ignored++;return result('ignored','arm_expired');}
  const command=TABLE[event.axis+':'+event.direction];
  if(command==='CANCEL'){this.armedUntilMs=null;this.stats.cancelled++;return result('cancelled','gesture_cancel');}
  if(!MUSIC_COMMANDS.includes(command)){this.stats.ignored++;return result('ignored','not_allowlisted');}
  if(nowMs-this.lastCommandMs<this.minCommandGapMs){this.stats.ignored++;return result('ignored','cooldown');}
  this.armedUntilMs=null;this.lastCommandMs=nowMs;this.stats.commands++;
  return result('command','allowed',{command,sensor_timestamp_ns:event.timestamp_ns});
 }
}

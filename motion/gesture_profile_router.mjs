// v0.8.7 - strict allowlisted profiles layered on the v0.8.6 one-shot safety router.
// Local/offline: no watch, ring, network or real media side effects.
import {ControlRouter, MUSIC_COMMANDS} from './control_router.mjs';

export const GESTURES = Object.freeze(['X:positive','X:negative','Y:positive','Y:negative','Z:positive']);
export const CANCEL_GESTURE = 'Z:negative'; // Hard-wired safety action, never remappable.
export const MAPPING_CHOICES = Object.freeze([...MUSIC_COMMANDS,'OFF']);
const profile = map => Object.freeze({...map});
export const PRESETS = Object.freeze({
  classic: profile({'X:positive':'NEXT','X:negative':'PREVIOUS','Y:positive':'VOLUME_UP','Y:negative':'VOLUME_DOWN','Z:positive':'PLAY_PAUSE'}),
  mirrored: profile({'X:positive':'PREVIOUS','X:negative':'NEXT','Y:positive':'VOLUME_DOWN','Y:negative':'VOLUME_UP','Z:positive':'PLAY_PAUSE'}),
  minimal: profile({'X:positive':'NEXT','X:negative':'PREVIOUS','Y:positive':'OFF','Y:negative':'OFF','Z:positive':'PLAY_PAUSE'}),
});
export function validateMapping(map) {
  if(map===null||typeof map!=='object'||Array.isArray(map)) throw new TypeError('invalid mapping object');
  const keys=Object.keys(map);
  if(keys.length!==GESTURES.length||keys.some(k=>!GESTURES.includes(k)))throw new TypeError('invalid mapping keys');
  for(const key of GESTURES){
    if(!Object.prototype.hasOwnProperty.call(map,key)||!MAPPING_CHOICES.includes(map[key])){
      throw new TypeError('not allowlisted mapping: '+key);
    }
  }
  return Object.fromEntries(GESTURES.map(k=>[k,map[k]]));
}
export class GestureProfileRouter {
  constructor(options={}) {
    this.safety=new ControlRouter(options);
    this.mapping=validateMapping(PRESETS.classic);
    this.profileName='classic';
    this.dispatched=0;
  }
  arm(ms,context='music'){return this.safety.arm(ms,context);}
  disarm(ms){return this.safety.disarm(ms);}
  selectPreset(name,ms){
    if(!Object.prototype.hasOwnProperty.call(PRESETS,name)) throw new RangeError('unknown profile');
    const map=validateMapping(PRESETS[name]);
    this.safety.disarm(ms); // Changing profile always disables active control.
    this.mapping=map;this.profileName=name;
    return {status:'profile_selected',profile:name,mapping:{...map}};
  }
  selectCustom(map,ms){
    const accepted=validateMapping(map); // Validate before changing state.
    this.safety.disarm(ms);
    this.mapping=accepted;this.profileName='custom';
    return {status:'profile_selected',profile:'custom',mapping:{...accepted}};
  }
  snapshot(){return {name:this.profileName,mapping:{...this.mapping},dispatched:this.dispatched};}
  accept(event,ms,context='music'){
    const gate=this.safety.accept(event,ms,context);
    if(gate.status!=='command')return gate;
    const key=event.axis+':'+event.direction;
    // Underlying safety router knows only the allowed gesture set and prevents Z:-
    // from becoming anything but CANCEL. Never use profile settings to bypass it.
    if(!Object.prototype.hasOwnProperty.call(this.mapping,key)) return {status:'ignored',reason:'unknown_key'};
    const command=this.mapping[key];
    if(command==='OFF')return {status:'ignored',reason:'gesture_disabled'};
    if(!MUSIC_COMMANDS.includes(command))return {status:'ignored',reason:'not_allowlisted'};
    this.dispatched++;
    return {status:'command',reason:'profile_allowed',command,profile:this.profileName,
      sensor_timestamp_ns:gate.sensor_timestamp_ns};
  }
}

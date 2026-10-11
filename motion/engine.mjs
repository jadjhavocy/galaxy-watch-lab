// GWL v0.8 motion classifier. No network access, no media-control side effects.
export class GestureEngine {
  constructor(options={}) {
    this.threshold=options.threshold ?? 2.4; // rad/s, tuned later using labelled recordings
    this.cooldownMs=options.cooldownMs ?? 900;
    this.reset();
  }
  reset() {
    this.lastStamp=-1; this.lastEvent=-Infinity; this.lastMotionAt=-Infinity;
    this.candidate=null; this.events=[]; this.stats={accepted:0,stale:0,invalid:0,quiet:0};
  }
  process(packet) {
    const stamp=packet?.timestamp_ns;
    const g=packet?.gyro_rads;
    const q=packet?.quat_xyzw;
    if (!Number.isFinite(stamp) || !Array.isArray(g) || g.length!==3 ||
        !g.every(Number.isFinite) || !Array.isArray(q) || q.length!==4 ||
        !q.every(Number.isFinite)) { this.stats.invalid++; return null; }
    if (stamp<=this.lastStamp) { this.stats.stale++; return null; }
    this.lastStamp=stamp; this.stats.accepted++;
    const ms=stamp/1e6;  // sensor clock, not PC wall clock
    const mag=Math.hypot(...g);
    if(mag<this.threshold) { this.stats.quiet++; if(ms-this.lastMotionAt>300) this.candidate=null; return null; }
    this.lastMotionAt=ms;
    if(ms-this.lastEvent<this.cooldownMs) return null;
    // Only classify lateral wrist flicks, avoid inventing finger gestures or world-axis mapping.
    const axis=Math.abs(g[0])>=Math.abs(g[1]) && Math.abs(g[0])>=Math.abs(g[2])?0:
               Math.abs(g[1])>=Math.abs(g[2])?1:2;
    // Two consecutive qualifying packets, temporally close, protect against isolated spikes.
    const direction=g[axis]>=0?1:-1;
    const key=`${axis}:${direction}`;
    if(!this.candidate || this.candidate.key!==key || ms-this.candidate.ms>350) {
      this.candidate={key,ms};return null;
    }
    if(ms-this.candidate.ms<30) return null;
    const event={type:'wrist_flick',axis:['X','Y','Z'][axis],
                 direction:direction>0?'positive':'negative',
                 timestamp_ns:stamp,peak_rads:Math.round(mag*100)/100};
    this.lastEvent=ms;this.candidate=null;this.events.push(event);
    if(this.events.length>100)this.events.shift();
    return event;
  }
}
export function parseJsonl(text) {
  if(typeof text!=='string' || text.length>10_000_000) throw new Error('Bad or oversized recording');
  return text.split(/\r?\n/).filter(Boolean).map((line,i)=>{
    try {return JSON.parse(line)} catch {throw new Error('Invalid JSONL line '+(i+1))}
  });
}

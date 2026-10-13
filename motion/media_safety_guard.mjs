// GWL v0.8.9: last-line defense for REAL global media-key dispatch.
// This module is inert until its dispatch() method is explicitly called.
// Failed or timed-out dispatches are ambiguous: never retry within this server process.
export const MEDIA_ACTIONS = Object.freeze(['NEXT', 'PREVIOUS', 'PLAY_PAUSE', 'VOLUME_UP', 'VOLUME_DOWN']);
const allowed = new Set(MEDIA_ACTIONS);

export class MediaGuardError extends Error {
  constructor(code) { super(code); this.name = 'MediaGuardError'; this.code = code; }
}

export class MediaSafetyGuard {
  constructor({executor, clock = () => Date.now(), timeoutMs = 3500,
               maxCommands = 12, periodMs = 60000, gapMs = 900} = {}) {
    if(typeof executor !== 'function' || typeof clock !== 'function' ||
       !Number.isSafeInteger(timeoutMs) || timeoutMs < 200 || timeoutMs > 10000 ||
       !Number.isSafeInteger(maxCommands) || maxCommands < 1 || maxCommands > 30 ||
       !Number.isSafeInteger(periodMs) || periodMs < 1000 || periodMs > 600000 ||
       !Number.isSafeInteger(gapMs) || gapMs < 0 || gapMs > 10000) {
      throw new TypeError('invalid media safety guard configuration');
    }
    Object.assign(this, {executor,clock,timeoutMs,maxCommands,periodMs,gapMs});
    this.inflight = false;
    this.locked = false;
    this.lastDispatchAt = -Infinity;
    this.sentAt = [];
    this.attempts = 0;
    this.sent = 0;
    this.rejected = 0;
    this.failures = 0;
    this.lockReason = null;
  }
  snapshot() {
    return {locked:this.locked,inflight:this.inflight,attempts:this.attempts,
            sent:this.sent,rejected:this.rejected,failures:this.failures,
            reason:this.lockReason,limit_per_minute:this.maxCommands};
  }
  async dispatch(command) {
    const reject = code => {this.rejected++;throw new MediaGuardError(code);};
    if(!allowed.has(command))reject('not_allowlisted');
    if(this.locked)reject('guard_locked_restart_required');
    if(this.inflight)reject('dispatch_in_progress');
    const now = this.clock();
    if(!Number.isFinite(now) || now < 0 || now < this.lastDispatchAt)reject('bad_dispatch_clock');
    this.sentAt = this.sentAt.filter(t => now-t < this.periodMs);
    if(now-this.lastDispatchAt < this.gapMs)reject('media_guard_cooldown');
    if(this.sentAt.length >= this.maxCommands)reject('media_guard_rate_limit');
    // Reserve budget BEFORE invoking an external process. Never release a send slot on error.
    this.attempts++;
    this.sentAt.push(now);
    this.lastDispatchAt = now;
    this.inflight = true;
    let timer;
    try {
      await Promise.race([
        Promise.resolve().then(() => this.executor(command)),
        new Promise((_,rejectTimeout) => {
          timer = setTimeout(() => rejectTimeout(new MediaGuardError('media_guard_timeout')),this.timeoutMs);
        })
      ]);
      this.sent++;
      return {status:'SENT',command};
    }catch(err){
      // Even a raised error can occur AFTER the key was delivered. No automatic retries.
      this.failures++;
      this.locked=true;
      this.lockReason=err?.code === 'media_guard_timeout' ? 'timeout_uncertain' : 'executor_uncertain';
      throw new MediaGuardError('dispatch_uncertain_restart_required');
    }finally{
      clearTimeout(timer);
      this.inflight=false;
    }
  }
}

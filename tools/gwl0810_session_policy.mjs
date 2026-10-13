// GWL 0.8.10: pure analysis of read-only OS session labels, not a control adapter.
const KNOWN = new Set(['YANDEX_APP_CANDIDATE_UNVERIFIED','SOUNDCLOUD_APP_CANDIDATE_UNVERIFIED']);
export function analyzeInventory(report) {
  if(!report || report.kind!=='READ_ONLY_WINDOWS_MEDIA_SESSION_INVENTORY' || !Array.isArray(report.sessions))
    throw new TypeError('invalid read-only session inventory');
  if(report.sessions.length>100) throw new RangeError('too many sessions');
  const classes=new Map();
  for(const s of report.sessions){
    if(!s || typeof s.source_class!=='string' || typeof s.playback!=='string')
      throw new TypeError('invalid session row');
    classes.set(s.source_class,(classes.get(s.source_class)||0)+1);
  }
  const browserUnresolved=classes.get('BROWSER_TAB_UNRESOLVED')||0;
  const namedCandidates=[...classes.entries()]
    .filter(([name])=>KNOWN.has(name))
    .map(([name,count])=>({name,count,requiresExplicitVerification:true}));
  return {
    kind:'READ_ONLY_POLICY_RESULT',
    session_count:report.sessions.length,
    browser_unresolved:browserUnresolved,
    named_app_candidates:namedCandidates,
    provider_targeting_ready:false,
    recommended_next_step:browserUnresolved>0?'Confirm which browser tab plays music manually':'Validate source app identity on actual Windows',
    note:'Candidate status never proves provider-specific command routing.',
  };
}

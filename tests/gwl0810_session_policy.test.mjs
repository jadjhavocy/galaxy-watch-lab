import assert from 'node:assert/strict';
import {analyzeInventory} from '../tools/gwl0810_session_policy.mjs';
const data={kind:'READ_ONLY_WINDOWS_MEDIA_SESSION_INVENTORY',sessions:[
 {source_class:'BROWSER_TAB_UNRESOLVED',playback:'PLAYING'},
 {source_class:'YANDEX_APP_CANDIDATE_UNVERIFIED',playback:'PAUSED'},
 {source_class:'YANDEX_APP_CANDIDATE_UNVERIFIED',playback:'PLAYING'},
 {source_class:'OTHER_APP',playback:'PAUSED'},
]};
const r=analyzeInventory(data);
assert.equal(r.provider_targeting_ready,false);
assert.equal(r.browser_unresolved,1);
assert.equal(r.named_app_candidates[0].count,2);
assert.equal(r.named_app_candidates[0].requiresExplicitVerification,true);
assert.match(r.recommended_next_step,/browser tab/);
assert.throws(()=>analyzeInventory({sessions:[]}),/invalid/);
assert.throws(()=>analyzeInventory({...data,sessions:Array.from({length:101},()=>data.sessions[0])}),/too many/);
assert.throws(()=>analyzeInventory({...data,sessions:[{playback:'PAUSED'}]}),/invalid/);
// No media command dispatcher in this module.
assert.equal(typeof r.command,'undefined');
console.log('GWL_V0810_SESSION_POLICY_TESTS=PASS');
console.log('PROVIDER_TARGETING_READY=NO');
console.log('ACTUAL_MEDIA_KEYS_SENT=NO');

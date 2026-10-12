import assert from 'node:assert/strict';
import {createMediaBridge} from '../tools/gwl088_media_bridge.mjs';
const server=createMediaBridge({port:0});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
try {
 const root='http://127.0.0.1:'+server.address().port;
 const response=await fetch(root+'/');
 assert.equal(response.status,200);
 const html=await response.text();
 const ids=new Set([...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(x=>x[1]));
 const jsRefs=[...html.matchAll(/\$\('([A-Za-z][A-Za-z0-9]*)'\)/g)].map(x=>x[1]);
 for(const id of jsRefs) assert.ok(ids.has(id),'JS expects missing DOM element: '+id);
 for(const id of ['bridgeStatus','liveConsent','liveAgree','arm','disarm'])
   assert.ok(ids.has(id),'Required UI element absent: '+id);
 assert.match(html, /id="liveAgree"\s+type="checkbox"/);
 assert.match(html, /Яндекс Музыку или SoundCloud/);
 assert.ok(!html.includes('__GWL_SESSION_NONCE__'),'nonce must be injected');
 const status=await (await fetch(root+'/api/status')).json();
 assert.equal(status.mode,'DRY_RUN','default must always be safe');
} finally {await new Promise(resolve=>server.close(resolve));}
console.log('GWL_V0881_BROWSER_CONTRACT_TESTS=PASS');

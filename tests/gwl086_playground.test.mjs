import assert from 'node:assert/strict';
import {createPlayground} from '../tools/gwl086_playground.mjs';
const server=createPlayground();
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const base='http://127.0.0.1:'+server.address().port;
 for(const [route,type] of [['/','text/html'],['/motion/engine.mjs','text/javascript'],
  ['/motion/control_router.mjs','text/javascript'],['/motion/virtual_player.mjs','text/javascript']]){
  const resp=await fetch(base+route);assert.equal(resp.status,200);
  assert.ok(resp.headers.get('content-type').includes(type));assert.ok((await resp.text()).length>50);
 }
 assert.equal((await fetch(base+'/config')).status,404);
 assert.equal((await fetch(base+'/%2e%2e/secret')).status,404);
 assert.equal((await fetch(base+'/',{method:'POST'})).status,404);
 console.log('GWL_V086_LOCAL_PLAYGROUND_TESTS=PASS');
}finally{await new Promise(resolve=>server.close(resolve))}

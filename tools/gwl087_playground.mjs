// Local-only demo server on a separate port (8771). Static whitelist only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const thisFile=fileURLToPath(import.meta.url);
const root=path.resolve(path.dirname(thisFile),'..');
const routes=new Map([
  ['/',{file:path.join(root,'tools/gwl087_playground.html'),mime:'text/html; charset=utf-8'}],
  ['/motion/engine.mjs',{file:path.join(root,'motion/engine.mjs'),mime:'text/javascript; charset=utf-8'}],
  ['/motion/control_router.mjs',{file:path.join(root,'motion/control_router.mjs'),mime:'text/javascript; charset=utf-8'}],
  ['/motion/gesture_profile_router.mjs',{file:path.join(root,'motion/gesture_profile_router.mjs'),mime:'text/javascript; charset=utf-8'}],
  ['/motion/virtual_player.mjs',{file:path.join(root,'motion/virtual_player.mjs'),mime:'text/javascript; charset=utf-8'}],
]);
export function createProfilePlayground(){
  return http.createServer((req,res)=>{
    const route=req.url?.split('?')[0];
    if(req.method!=='GET'||!routes.has(route)){res.writeHead(404);res.end('Not found');return;}
    const item=routes.get(route);
    try{
      const content=fs.readFileSync(item.file);
      res.writeHead(200,{
        'Content-Type':item.mime,'Content-Length':content.byteLength,
        'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
        'X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
        'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
      });res.end(content);
    }catch{res.writeHead(500);res.end('Missing demo asset');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===thisFile){
  const port=Number(process.env.GWL_PROFILE_PORT||8771);
  if(!Number.isSafeInteger(port)||port<1024||port>65535)throw new RangeError('bad demo port');
  const server=createProfilePlayground();
  server.on('error',err=>{console.error('V087_DEMO_ERROR='+err.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>{
    console.log('GWL_V087_DEMO=READY');console.log('OPEN_BROWSER=http://127.0.0.1:'+port);
    console.log('WATCH_NOT_TOUCHED=YES');console.log('STOP=Ctrl+C');
  });
}

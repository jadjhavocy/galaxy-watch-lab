// Local-only static demo server, fixed allowlisted routes. No external networking.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const file=fileURLToPath(import.meta.url),toolsDir=path.dirname(file),root=path.resolve(toolsDir,'..');
const pages=new Map([
 ['/',{file:path.join(toolsDir,'gwl086_playground.html'),type:'text/html; charset=utf-8'}],
 ['/motion/engine.mjs',{file:path.join(root,'motion/engine.mjs'),type:'text/javascript; charset=utf-8'}],
 ['/motion/control_router.mjs',{file:path.join(root,'motion/control_router.mjs'),type:'text/javascript; charset=utf-8'}],
 ['/motion/virtual_player.mjs',{file:path.join(root,'motion/virtual_player.mjs'),type:'text/javascript; charset=utf-8'}]
]);
export function createPlayground(){return http.createServer((req,res)=>{
 const route=req.url?.split('?')[0];
 if(req.method!=='GET'||!pages.has(route)){res.writeHead(404);res.end('Not found');return;}
 const item=pages.get(route);
 try{const bytes=fs.readFileSync(item.file);
  res.writeHead(200,{'Content-Type':item.type,'Content-Length':bytes.length,'Cache-Control':'no-store',
   'X-Content-Type-Options':'nosniff',
   'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'"});
  res.end(bytes);
 }catch{res.writeHead(500);res.end('Local demo asset unavailable');}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===file){
 const port=Number(process.env.GWL_DEMO_PORT||8770);
 if(!Number.isSafeInteger(port)||port<1024||port>65535)throw new RangeError('bad local demo port');
 const server=createPlayground();
 server.on('error',e=>{console.error('LOCAL_DEMO_ERROR='+e.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>{console.log('GWL_V086_DEMO=READY');console.log('OPEN_BROWSER=http://127.0.0.1:'+port);console.log('STOP=Ctrl+C');});
}

// GWL v0.8.8 — opt-in localhost media bridge, dry-run by default.
// No ADB, smartwatch, ring, Yandex/SoundCloud APIs, or auto-start.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MUSIC_COMMANDS} from '../motion/control_router.mjs';
const thisFile=fileURLToPath(import.meta.url);
const repo=path.resolve(path.dirname(thisFile),'..');
const routes=new Map([
 ['/',{file:'tools/gwl088_playground.html',type:'text/html; charset=utf-8'}],
 ['/motion/engine.mjs',{file:'motion/engine.mjs',type:'text/javascript; charset=utf-8'}],
 ['/motion/control_router.mjs',{file:'motion/control_router.mjs',type:'text/javascript; charset=utf-8'}],
 ['/motion/gesture_profile_router.mjs',{file:'motion/gesture_profile_router.mjs',type:'text/javascript; charset=utf-8'}],
 ['/motion/virtual_player.mjs',{file:'motion/virtual_player.mjs',type:'text/javascript; charset=utf-8'}],
]);
const allowed=new Set(MUSIC_COMMANDS);
function nativeKey(command){
 return new Promise((resolve,reject)=>{
  const launcher=process.env.GWL_PYTHON_EXE||'py';
  const params=process.env.GWL_PYTHON_EXE?[]:['-3'];
  params.push(path.join(repo,'tools/gwl088_media_key.py'),'--command',command,'--execute');
  const proc=spawn(launcher,params,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let error=''; const timeout=setTimeout(()=>proc.kill(),3000);
  proc.stderr.on('data',chunk=>{error+=chunk.toString('utf8').slice(0,512)});
  proc.once('error',err=>{clearTimeout(timeout);reject(err)});
  proc.once('close',code=>{clearTimeout(timeout);if(code===0)resolve();else reject(new Error('media key helper exit '+code+' '+error.slice(0,100)))});
 });
}
function respond(res,status,json){const body=Buffer.from(JSON.stringify(json),'utf8');res.writeHead(status,{
 'Content-Type':'application/json; charset=utf-8','Content-Length':body.length,
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});res.end(body);}
export function createMediaBridge({live=false,mediaExecutor=nativeKey,port=8772,clock=()=>Date.now()}={}){
 if(!Number.isSafeInteger(port)||(port!==0&&(port<1024||port>65535)))throw new RangeError('invalid media port');
 const expectedOrigin=()=> 'http://127.0.0.1:'+(server.address()?.port ?? port);
 const nonce=crypto.randomBytes(24).toString('hex');
 let armedUntil=0, lastCommandAt=-Infinity, busy=false;
 const server=http.createServer(async(req,res)=>{
  const route=req.url?.split('?')[0];
  if(req.method==='GET'&&route==='/api/status'){
   return respond(res,200,{mode:live?'LIVE_OPT_IN':'DRY_RUN',armed:armedUntil>clock(),target:'WINDOWS_SELECTED_MEDIA_SESSION_NOT_GUARANTEED'});
  }
  if(req.method==='GET'&&routes.has(route)){
   const item=routes.get(route);
   try{
    let data=fs.readFileSync(path.join(repo,item.file));
    if(route==='/')data=Buffer.from(data.toString('utf8').replaceAll('__GWL_SESSION_NONCE__',nonce));
    res.writeHead(200,{'Content-Type':item.type,'Content-Length':data.length,'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    return res.end(data);
   }catch{return respond(res,500,{error:'missing_demo_asset'})}
  }
  if(req.method!=='POST'||!['/api/arm','/api/disarm','/api/command'].includes(route))return respond(res,404,{error:'not_found'});
  if(req.headers.origin!==expectedOrigin()||req.headers['x-gwl-session']!==nonce||
     !/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return respond(res,403,{error:'origin_or_session_rejected'});
  const length=Number(req.headers['content-length']);
  if(!Number.isSafeInteger(length)||length<2||length>512)return respond(res,413,{error:'invalid_body_size'});
  let body='';
  try{
   for await(const chunk of req){body+=chunk.toString('utf8');if(body.length>512)throw new Error('too large')}
   const parsed=JSON.parse(body);
   if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw new Error('bad JSON object');
   if(route==='/api/disarm'){armedUntil=0;return respond(res,200,{status:'disarmed'});}
   if(route==='/api/arm'){
    if(Object.keys(parsed).length!==0)return respond(res,400,{error:'bad_arm_payload'});
    armedUntil=clock()+10000;
    return respond(res,200,{status:'armed',expires_in_ms:10000,mode:live?'LIVE_OPT_IN':'DRY_RUN'});
   }
   if(Object.keys(parsed).length!==1||!allowed.has(parsed.command))return respond(res,400,{error:'command_not_allowlisted'});
   if(busy)return respond(res,409,{error:'busy'});
   const now=clock();
   if(!armedUntil||now>armedUntil){armedUntil=0;return respond(res,403,{error:'not_armed_or_expired'});}
   armedUntil=0; // Atomic single-use arm, consumed BEFORE any side effect.
   if(now-lastCommandAt<900)return respond(res,429,{error:'cooldown'});
   lastCommandAt=now;
   if(!live)return respond(res,200,{status:'DRY_RUN',command:parsed.command,target:'VIRTUAL_ONLY'});
   if(process.platform!=='win32')return respond(res,501,{error:'Windows_only'});
   busy=true;
   try{await mediaExecutor(parsed.command);return respond(res,200,{status:'OS_KEY_SENT',command:parsed.command,target:'WINDOWS_SELECTED_SESSION'});}
   catch{return respond(res,502,{error:'media_helper_failed'})}
   finally{busy=false;}
  }catch{return respond(res,400,{error:'invalid_payload'});}
 });
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===thisFile){
 const flags=process.argv.slice(2);
 const live=flags.includes('--enable-os-media-keys')&&flags.includes('--acknowledge-global-session');
 if(flags.some(x=>!['--enable-os-media-keys','--acknowledge-global-session'].includes(x)))throw new Error('unknown flags');
 if(flags.length>0&&!live)throw new Error('Live mode requires BOTH explicit terminal flags');
 const port=8772;
 const server=createMediaBridge({live,port});
 server.on('error',e=>{console.error('MEDIA_BRIDGE_ERROR='+e.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>{
  console.log('GWL_V088_MEDIA_BRIDGE=READY');console.log('MODE='+(live?'LIVE_GLOBAL_OS_MEDIA_KEYS':'DRY_RUN'));
  console.log('WARNING=Windows chooses target media session; not app-specific');
  console.log('OPEN_BROWSER=http://127.0.0.1:'+port);console.log('WATCH_NOT_USED=YES');console.log('STOP=Ctrl+C');
 });
}

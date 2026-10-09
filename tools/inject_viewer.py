from pathlib import Path
p=Path(__file__).resolve().parents[1]/'index.html'
s=p.read_text(encoding='utf-8-sig')
if 'gwlLivePoll' in s:
    print('VIEWER_ALREADY_PATCHED'); raise SystemExit
if 'function loop(t)' not in s:
    raise SystemExit('Missing expected v0.3 scene loop function; abort')
# The model root is a shared Three.js object. Sensor packets carry XYZW quaternion.
addon='''
// Sensor Bridge v0.4: localhost receiver over ADB reverse. Visualization frame not calibrated.
let gwlLive=false;
const gwlToggle=document.createElement('button');gwlToggle.textContent='LIVE: OFF';
const gwlStatus=document.createElement('div');gwlStatus.className='small';gwlStatus.textContent='Receiver disconnected / no data';
const gwlActions=document.getElementById('demo').parentElement;
gwlActions.appendChild(gwlToggle);gwlActions.appendChild(gwlStatus);
gwlToggle.onclick=()=>{gwlLive=!gwlLive;playing=false;document.getElementById('demo').textContent='▶ Демо';gwlToggle.textContent='LIVE: '+(gwlLive?'ON':'OFF');};
async function gwlLivePoll(){
 try{
  const res=await fetch('/state',{cache:'no-store'});if(!res.ok)throw Error(res.status);
  const data=await res.json();
  gwlStatus.textContent=data.connected?'LIVE seq='+data.seq+' age='+data.age_ms+'ms':'Waiting for watch telemetry';
  if(gwlLive && data.connected && data.quat_xyzw){
   const q=data.quat_xyzw;
   motion.rotation.set(0,0,0);
   motion.quaternion.set(q[0],q[1],q[2],q[3]).normalize();
  }
 }catch(e){gwlStatus.textContent='Receiver offline: run python tools/receiver.py';}
}
setInterval(gwlLivePoll,100);
'''
s=s.replace('function loop(t)',addon+'\nfunction loop(t)',1)
# Existing scene frame doesn't overwrite live quaternion when playing=false; but slider change should deactivate live.
s=s.replace("playing=false;document.getElementById('demo').textContent='▶ Демо';update();", "playing=false;gwlLive=false;gwlToggle.textContent='LIVE: OFF';document.getElementById('demo').textContent='▶ Демо';update();")
p.write_text(s,encoding='utf-8')
print('VIEWER_PATCHED=YES')

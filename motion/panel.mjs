import {GestureEngine,parseJsonl} from './engine.mjs';
const engine=new GestureEngine();
const aside=document.querySelector('aside');
const panel=document.createElement('div');
panel.innerHTML=`<hr><h2>Motion Engine v0.8 — эксперимент</h2>
<p class="small">Только обнаружение резких движений кисти; управление музыкой выключено.
Алгоритм пока не откалиброван на реальных записях.</p>
<div id="gwlV08Status" class="status">Ожидание свежего потока IMU</div>
<div class="actions"><button id="gwlV08Arm">Распознавание: ВЫКЛ</button>
<button id="gwlV08Clear">Очистить</button></div>
<label>Порог гироскопа, рад/с <output id="gwlV08ThresholdOut">2.4</output></label>
<input id="gwlV08Threshold" type="range" min="1" max="8" step=".2" value="2.4">
<label>Воспроизвести JSONL запись</label>
<input id="gwlV08File" type="file" accept=".jsonl,.txt" style="width:100%">
<div id="gwlV08Events" class="small" aria-live="polite">Жестов пока нет</div>`;
aside.appendChild(panel);
const $=id=>document.getElementById(id);
let armed=false,lastSeq=null,pollBusy=false;
function log(event, source) {
 const line=document.createElement('div');
 line.textContent=`${source}: ${event.type}, ${event.axis}, ${event.direction}, ${event.peak_rads} рад/с`;
 $('gwlV08Events').prepend(line);
 while($('gwlV08Events').children.length>20)$('gwlV08Events').lastElementChild.remove();
}
$('gwlV08Arm').onclick=()=>{armed=!armed; engine.reset();lastSeq=null;
 $('gwlV08Arm').textContent='Распознавание: '+(armed?'ВКЛ':'ВЫКЛ');
 $('gwlV08Arm').classList.toggle('active',armed);};
$('gwlV08Clear').onclick=()=>{engine.reset();lastSeq=null;$('gwlV08Events').textContent='Жестов пока нет';};
$('gwlV08Threshold').oninput=e=>{
 engine.threshold=Number(e.target.value);$('gwlV08ThresholdOut').textContent=engine.threshold.toFixed(1);
 engine.reset();lastSeq=null;
};
$('gwlV08File').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
   if(file.size>10_000_000)throw new Error('Файл больше 10 МБ');
   const packets=parseJsonl(await file.text());const offline=new GestureEngine({threshold:engine.threshold});
   let hits=0;
   for(const p of packets){const event=offline.process(p);if(event){log(event,'REPLAY');hits++;}}
   $('gwlV08Status').textContent=`REPLAY: ${packets.length} кадров, ${hits} срабатываний`;
 }catch(err){$('gwlV08Status').textContent='Ошибка записи: '+err.message;}
 e.target.value='';
};
async function tick(){
 if(!armed||pollBusy)return;pollBusy=true;
 try {
  const r=await fetch('/state',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(!data.connected || !data.sensor_fresh || !Array.isArray(data.gyro_rads)){
    engine.reset();lastSeq=null;$('gwlV08Status').textContent='Нет свежих данных';return;
  }
  // Do not treat repeated HTTP snapshots as new sensor samples.
  if(lastSeq===data.seq)return;
  lastSeq=data.seq;
  const event=engine.process(data);
  $('gwlV08Status').textContent=`LIVE ${data.target_hz??'?'} Гц | пакетов ${engine.stats.accepted} | жестов ${engine.events.length}`;
  if(event)log(event,'LIVE');
 } catch(err){engine.reset();lastSeq=null;$('gwlV08Status').textContent='Приёмник недоступен';}
 finally {pollBusy=false;}
}
setInterval(tick,200);

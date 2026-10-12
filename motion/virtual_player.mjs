// Memory-only virtual player. No OS media keys, no playback APIs.
const ALLOWED=new Set(['NEXT','PREVIOUS','VOLUME_UP','VOLUME_DOWN','PLAY_PAUSE']);
export class VirtualPlayer {
 constructor(options={}){
  const tracks=options.tracks??['Demo Track A','Demo Track B','Demo Track C'];
  if(!Array.isArray(tracks)||!tracks.length||tracks.length>50||!tracks.every(x=>typeof x==='string'&&x.length>0&&x.length<=80))
   throw new RangeError('invalid tracks');
  this.tracks=[...tracks];this.index=0;this.volume=50;this.playing=false;this.history=[];
 }
 snapshot(){return {title:this.tracks[this.index],track_number:this.index+1,track_count:this.tracks.length,volume:this.volume,playing:this.playing};}
 apply(command){
  if(!ALLOWED.has(command))throw new RangeError('non-allowlisted command');
  switch(command){
   case 'NEXT':this.index=(this.index+1)%this.tracks.length;break;
   case 'PREVIOUS':this.index=(this.index+this.tracks.length-1)%this.tracks.length;break;
   case 'VOLUME_UP':this.volume=Math.min(100,this.volume+5);break;
   case 'VOLUME_DOWN':this.volume=Math.max(0,this.volume-5);break;
   case 'PLAY_PAUSE':this.playing=!this.playing;break;
  }
  this.history.push(command);if(this.history.length>100)this.history.shift();
  return this.snapshot();
 }
}

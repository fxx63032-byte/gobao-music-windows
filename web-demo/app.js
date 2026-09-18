(() => {
  const audio=document.getElementById('audio');
  const file=document.getElementById('audioFile');
  const importBtn=document.getElementById('importBtn');
  const playBtn=document.getElementById('playBtn');
  const fullBtn=document.getElementById('fullBtn');
  const resetBtn=document.getElementById('resetBtn');
  const status=document.getElementById('status');
  const trackName=document.getElementById('trackName');
  const trackSub=document.getElementById('trackSub');
  const seek=document.getElementById('seek');
  const cur=document.getElementById('cur');
  const dur=document.getElementById('dur');
  const controls={lens:document.getElementById('lens'),disk:document.getElementById('disk'),dust:document.getElementById('dust'),react:document.getElementById('react'),ui:document.getElementById('ui')};
  window.GoBaoControls=controls;

  ['lens','disk','dust','react','ui'].forEach(key=>{
    const out=document.getElementById(key+'Out');
    controls[key].addEventListener('input',()=>{
      out.textContent=controls[key].value+'%';
      if(key==='ui') document.documentElement.style.setProperty('--panel-alpha',Math.max(.35,Number(controls.ui.value)/100));
    });
  });

  let ctx=null,analyser=null,sourceNode=null,freq=null,objectUrl=null;

  function ensureAudioGraph(){
    if(ctx) return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    analyser=ctx.createAnalyser();
    analyser.fftSize=2048;
    analyser.smoothingTimeConstant=.78;
    freq=new Uint8Array(analyser.frequencyBinCount);
    sourceNode=ctx.createMediaElementSource(audio);
    sourceNode.connect(analyser);
    analyser.connect(ctx.destination);
    window.GoBaoAudio={ctx,analyser,freq,audio};
  }

  async function unlock(){
    ensureAudioGraph();
    if(ctx.state==='suspended') await ctx.resume();
  }

  importBtn.addEventListener('click',()=>file.click());

  file.addEventListener('change',async()=>{
    const f=file.files&&file.files[0];
    if(!f) return;
    if(objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(f);
    audio.pause();
    audio.src=objectUrl;
    audio.load();
    trackName.textContent=f.name.replace(/\.[^/.]+$/,'');
    trackSub.textContent='本地音乐 · 浏览器 FFT 实时驱动';
    status.textContent='文件已载入。点击“播放”或播放器里的 ▶。';
    try{await unlock();}catch(e){}
  });

  playBtn.addEventListener('click',async()=>{
    if(!audio.src){status.textContent='当前是模拟节拍。要测试自己的音乐，请先点“导入本地音乐”。';return;}
    try{
      await unlock();
      if(audio.paused) await audio.play(); else audio.pause();
    }catch(e){
      status.textContent='浏览器没有播放这个文件。请优先使用标准 MP3 或 WAV。';
    }
  });

  audio.addEventListener('play',async()=>{
    try{await unlock();}catch(e){}
    playBtn.textContent='暂停';
    status.textContent='正在播放，本地音乐 FFT 正在驱动黑洞与星球。';
  });
  audio.addEventListener('pause',()=>playBtn.textContent='播放');
  audio.addEventListener('ended',()=>playBtn.textContent='播放');
  audio.addEventListener('error',()=>status.textContent='这个文件的编码浏览器不支持。网页测试请换标准 MP3 / WAV；正式 Windows 版会用 FFmpeg 自动兼容。');

  fullBtn.addEventListener('click',async()=>{
    const stage=document.getElementById('stage');
    try{
      if(!document.fullscreenElement) await stage.requestFullscreen();
      else await document.exitFullscreen();
    }catch(e){}
  });

  resetBtn.addEventListener('click',()=>{
    const vals={lens:72,disk:78,dust:82,react:88,ui:82};
    Object.entries(vals).forEach(([k,v])=>{controls[k].value=v;document.getElementById(k+'Out').textContent=v+'%';});
    document.documentElement.style.setProperty('--panel-alpha',.82);
  });

  function fmt(sec){
    if(!Number.isFinite(sec)) return '--:--';
    sec=Math.max(0,Math.floor(sec));
    return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  }
  audio.addEventListener('loadedmetadata',()=>dur.textContent=fmt(audio.duration));
  audio.addEventListener('timeupdate',()=>{
    if(!audio.duration) return;
    seek.value=Math.round(audio.currentTime/audio.duration*1000);
    cur.textContent=fmt(audio.currentTime);
    dur.textContent=fmt(audio.duration);
  });
  seek.addEventListener('input',()=>{if(audio.duration) audio.currentTime=audio.duration*Number(seek.value)/1000;});
})();
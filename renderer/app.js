(() => {
  const audio=document.getElementById('audio');
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

  let ctx,analyser,sourceNode,freq;
  function ensureAudioGraph(){
    if(ctx) return;
    ctx=new AudioContext();
    analyser=ctx.createAnalyser();
    analyser.fftSize=2048;
    analyser.smoothingTimeConstant=.78;
    freq=new Uint8Array(analyser.frequencyBinCount);
    sourceNode=ctx.createMediaElementSource(audio);
    sourceNode.connect(analyser);
    analyser.connect(ctx.destination);
    window.GoBaoAudio={ctx,analyser,freq,audio};
  }
  async function unlockAudio(){ensureAudioGraph();if(ctx.state==='suspended') await ctx.resume();}

  importBtn.addEventListener('click',async()=>{
    importBtn.disabled=true;
    status.textContent='正在准备音乐… 后台会自动解码，用户不需要处理格式。';
    try{
      const result=await window.goBaoDesktop.chooseMusic();
      if(!result||result.canceled){status.textContent='已取消导入。';return;}
      if(!result.ok){
        if(result.errorCode==='FFMPEG_NOT_BUNDLED') status.textContent='播放器组件未完整安装，请重新安装 GO宝音乐。';
        else if(result.errorCode==='PROTECTED_FORMAT') status.textContent='这首歌是其他音乐平台的受保护下载文件。GO宝音乐不会破解它；接入正版曲库后会自动匹配可播放版本。';
        else status.textContent='这首音乐暂时无法播放。你可以直接换一首，不需要处理格式。';
        return;
      }
      await unlockAudio();
      audio.src=result.track.playbackUrl;
      audio.load();
      trackName.textContent=result.track.title;
      trackSub.textContent='已自动兼容 · 48kHz PCM · FFT 实时驱动';
      status.textContent='音乐准备完成，点击“播放”。';
    }catch(_e){status.textContent='导入失败，请重试。';}
    finally{importBtn.disabled=false;}
  });

  playBtn.addEventListener('click',async()=>{
    if(!audio.src){status.textContent='先点“导入音乐”，其余格式处理由后台自动完成。';return;}
    try{await unlockAudio();if(audio.paused) await audio.play();else audio.pause();}
    catch(_e){status.textContent='播放失败，请重新导入这首音乐。';}
  });

  audio.addEventListener('play',()=>{playBtn.textContent='暂停';status.textContent='正在播放 · FFT 正在驱动黑洞与周围星体。';});
  audio.addEventListener('pause',()=>{playBtn.textContent='播放';});
  audio.addEventListener('ended',()=>{playBtn.textContent='播放';});
  audio.addEventListener('error',()=>{status.textContent='这首音乐暂时无法播放。请换一首重试。';});

  fullBtn.addEventListener('click',()=>window.goBaoDesktop.toggleFullscreen());
  resetBtn.addEventListener('click',()=>{
    const vals={lens:72,disk:78,dust:82,react:88,ui:82};
    Object.entries(vals).forEach(([k,v])=>{controls[k].value=v;document.getElementById(k+'Out').textContent=v+'%';});
    document.documentElement.style.setProperty('--panel-alpha',.82);
  });

  function fmt(sec){if(!Number.isFinite(sec)) return '--:--';sec=Math.max(0,Math.floor(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
  audio.addEventListener('loadedmetadata',()=>{dur.textContent=fmt(audio.duration);});
  audio.addEventListener('timeupdate',()=>{if(!audio.duration)return;seek.value=Math.round(audio.currentTime/audio.duration*1000);cur.textContent=fmt(audio.currentTime);dur.textContent=fmt(audio.duration);});
  seek.addEventListener('input',()=>{if(audio.duration) audio.currentTime=audio.duration*Number(seek.value)/1000;});
})();

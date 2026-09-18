(() => {
  const audioA=document.getElementById('audio');
  const audioB=document.getElementById('audioB');
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
  const controls={
    lens:document.getElementById('lens'),
    disk:document.getElementById('disk'),
    dust:document.getElementById('dust'),
    react:document.getElementById('react'),
    ui:document.getElementById('ui')
  };
  window.GoBaoControls=controls;

  ['lens','disk','dust','react','ui'].forEach(key=>{
    const out=document.getElementById(key+'Out');
    controls[key].addEventListener('input',()=>{
      out.textContent=controls[key].value+'%';
      if(key==='ui') document.documentElement.style.setProperty('--panel-alpha',Math.max(.35,Number(controls.ui.value)/100));
    });
  });

  let ctx=null,analyser=null,freq=null;
  let sourceA=null,sourceB=null,gainA=null,gainB=null;
  let active='A';
  let transitioning=false;

  const deckAudio=name=>name==='B'?audioB:audioA;
  const deckGain=name=>name==='B'?gainB:gainA;
  const otherDeck=name=>name==='A'?'B':'A';
  const activeAudio=()=>deckAudio(active);

  function dispatchDeckEvent(type,detail={}){
    document.dispatchEvent(new CustomEvent(type,{detail:{
      active,
      transitioning,
      a:{src:audioA.src,paused:audioA.paused,currentTime:audioA.currentTime,duration:audioA.duration},
      b:{src:audioB.src,paused:audioB.paused,currentTime:audioB.currentTime,duration:audioB.duration},
      ...detail
    }}));
  }

  function ensureAudioGraph(){
    if(ctx) return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    analyser=ctx.createAnalyser();
    analyser.fftSize=2048;
    analyser.smoothingTimeConstant=.78;
    freq=new Uint8Array(analyser.frequencyBinCount);

    sourceA=ctx.createMediaElementSource(audioA);
    sourceB=ctx.createMediaElementSource(audioB);
    gainA=ctx.createGain();
    gainB=ctx.createGain();

    sourceA.connect(gainA);
    sourceB.connect(gainB);
    gainA.connect(analyser);
    gainB.connect(analyser);
    analyser.connect(ctx.destination);

    gainA.gain.value=1;
    gainB.gain.value=0;

    window.GoBaoAudio={
      ctx,analyser,freq,audioA,audioB,gainA,gainB,
      get audio(){ return activeAudio(); }
    };
  }

  async function unlockAudio(){
    ensureAudioGraph();
    if(ctx.state==='suspended') await ctx.resume();
  }

  function updateTrackUI(meta={}){
    if(meta.title) trackName.textContent=meta.title;
    if(meta.sub) trackSub.textContent=meta.sub;
  }

  function setActiveDeck(name){
    if(name!=='A'&&name!=='B') return;
    active=name;
    dispatchDeckEvent('gobao:deckchange');
    updateTimeUI();
  }

  function resetGains(){
    ensureAudioGraph();
    const now=ctx.currentTime;
    [gainA,gainB].forEach(g=>g.gain.cancelScheduledValues(now));
    gainA.gain.setValueAtTime(active==='A'?1:0,now);
    gainB.gain.setValueAtTime(active==='B'?1:0,now);
  }

  async function loadAsCurrent(url,meta={}){
    await unlockAudio();
    const current=activeAudio();
    const other=deckAudio(otherDeck(active));
    other.pause();
    other.removeAttribute('src');
    other.load();
    current.pause();
    current.src=url;
    current.load();
    resetGains();
    updateTrackUI(meta);
    dispatchDeckEvent('gobao:deckstate',{action:'load-current'});
    return current;
  }

  async function prepareDeck(name,url){
    await unlockAudio();
    const deck=deckAudio(name);
    deck.pause();
    deck.src=url;
    deck.currentTime=0;
    deck.load();
    const g=deckGain(name);
    const now=ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(name===active?1:0,now);
    dispatchDeckEvent('gobao:deckstate',{action:'prepare',deck:name});
    return deck;
  }

  async function crossfadeToPrepared(targetName,seconds=3){
    await unlockAudio();
    if(transitioning) return false;
    if(targetName===active) return false;

    const fromName=active;
    const from=deckAudio(fromName);
    const to=deckAudio(targetName);
    if(!to.src) throw new Error('TARGET_DECK_EMPTY');

    transitioning=true;
    const fromGain=deckGain(fromName);
    const toGain=deckGain(targetName);
    const duration=Math.max(.5,Math.min(12,Number(seconds)||3));
    const now=ctx.currentTime;

    fromGain.gain.cancelScheduledValues(now);
    toGain.gain.cancelScheduledValues(now);
    fromGain.gain.setValueAtTime(Math.max(0.0001,fromGain.gain.value),now);
    toGain.gain.setValueAtTime(0.0001,now);

    to.currentTime=0;
    await to.play();

    fromGain.gain.linearRampToValueAtTime(0.0001,now+duration);
    toGain.gain.exponentialRampToValueAtTime(1,now+duration);

    dispatchDeckEvent('gobao:crossfade-start',{from:fromName,to:targetName,seconds:duration});

    await new Promise(resolve=>setTimeout(resolve,duration*1000));

    from.pause();
    from.currentTime=0;
    fromGain.gain.cancelScheduledValues(ctx.currentTime);
    fromGain.gain.setValueAtTime(0,ctx.currentTime);
    toGain.gain.cancelScheduledValues(ctx.currentTime);
    toGain.gain.setValueAtTime(1,ctx.currentTime);

    active=targetName;
    transitioning=false;
    dispatchDeckEvent('gobao:crossfade-end',{from:fromName,to:targetName});
    updateTimeUI();
    return true;
  }

  async function playActive(){
    await unlockAudio();
    const a=activeAudio();
    if(!a.src) throw new Error('NO_ACTIVE_SOURCE');
    await a.play();
  }

  function pauseActive(){ activeAudio().pause(); }

  async function toggleActive(){
    const a=activeAudio();
    if(!a.src) throw new Error('NO_ACTIVE_SOURCE');
    if(a.paused) await playActive(); else pauseActive();
  }

  function updateTimeUI(){
    const a=activeAudio();
    if(!a.duration){
      seek.value=0;
      cur.textContent='00:00';
      dur.textContent='--:--';
      return;
    }
    seek.value=Math.round(a.currentTime/a.duration*1000);
    cur.textContent=fmt(a.currentTime);
    dur.textContent=fmt(a.duration);
  }

  function fmt(sec){
    if(!Number.isFinite(sec)) return '--:--';
    sec=Math.max(0,Math.floor(sec));
    return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  }

  window.GoBaoPlayer={
    ensureAudioGraph,
    unlockAudio,
    activeAudio,
    activeDeck:()=>active,
    inactiveDeck:()=>otherDeck(active),
    deckAudio,
    deckGain,
    isTransitioning:()=>transitioning,
    setActiveDeck,
    loadAsCurrent,
    prepareDeck,
    crossfadeToPrepared,
    playActive,
    pauseActive,
    toggleActive,
    updateTrackUI
  };

  importBtn.addEventListener('click',async()=>{
    importBtn.disabled=true;
    status.textContent='正在准备音乐… 后台会自动解码，用户不需要处理格式。';
    try{
      const result=await window.goBaoDesktop.chooseMusic();
      if(!result||result.canceled){status.textContent='已取消导入。';return;}
      if(!result.ok){
        if(result.errorCode==='FFMPEG_NOT_BUNDLED') status.textContent='播放器组件未完整安装，请重新安装 Go宝音乐。';
        else if(result.errorCode==='PROTECTED_FORMAT') status.textContent='这首歌是其他音乐平台的受保护下载文件。Go宝音乐不会破解它；接入正版曲库后会自动匹配可播放版本。';
        else status.textContent='这首音乐暂时无法播放。你可以直接换一首，不需要处理格式。';
        return;
      }
      await loadAsCurrent(result.track.playbackUrl,{
        title:result.track.title,
        sub:'已自动兼容 · 48kHz PCM · 双 Deck / FFT 就绪'
      });
      status.textContent='音乐准备完成，点击“播放”。';
    }catch(_e){status.textContent='导入失败，请重试。';}
    finally{importBtn.disabled=false;}
  });

  playBtn.addEventListener('click',async()=>{
    try{
      await toggleActive();
    }catch(_e){
      status.textContent='先导入音乐或从本地音乐库选择歌曲。';
    }
  });

  function onPlay(e){
    if(e.target!==activeAudio()) return;
    playBtn.textContent='暂停';
    status.textContent=transitioning?'双 Deck 正在重叠混音…':'正在播放 · FFT 正在驱动黑洞与周围星体。';
  }
  function onPause(e){
    if(e.target!==activeAudio()||transitioning) return;
    playBtn.textContent='播放';
  }

  [audioA,audioB].forEach(a=>{
    a.addEventListener('play',onPlay);
    a.addEventListener('pause',onPause);
    a.addEventListener('loadedmetadata',updateTimeUI);
    a.addEventListener('timeupdate',()=>{ if(a===activeAudio()) updateTimeUI(); });
    a.addEventListener('error',()=>{ if(a===activeAudio()) status.textContent='这首音乐暂时无法播放。请换一首重试。'; });
  });

  document.addEventListener('gobao:crossfade-start',()=>{
    playBtn.textContent='混音中';
    status.textContent='双 Deck 真 AutoMix：两首音乐正在重叠交叉淡化。';
  });
  document.addEventListener('gobao:crossfade-end',()=>{
    playBtn.textContent='暂停';
    status.textContent='AutoMix 过渡完成 · 当前 Deck 已切换。';
  });

  seek.addEventListener('input',()=>{
    const a=activeAudio();
    if(a.duration) a.currentTime=a.duration*Number(seek.value)/1000;
  });

  fullBtn.addEventListener('click',()=>window.goBaoDesktop.toggleFullscreen());
  resetBtn.addEventListener('click',()=>{
    const vals={lens:72,disk:78,dust:82,react:88,ui:82};
    Object.entries(vals).forEach(([k,v])=>{
      controls[k].value=v;
      document.getElementById(k+'Out').textContent=v+'%';
    });
    document.documentElement.style.setProperty('--panel-alpha',.82);
  });
})();
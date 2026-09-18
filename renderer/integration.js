(() => {
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const audio=$('#audio');
  const state={
    library:[],
    queue:[],
    queueIndex:-1,
    lrc:[],
    automix:false,
    mixSeconds:3,
    wallpaperItems:[],
    currentPreset:'cosmic'
  };

  const fmt=s=>{
    s=Math.max(0,Math.floor(Number(s)||0));
    return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
  };

  function toast(msg){
    const el=$('#integrationToast');
    if(!el)return;
    el.textContent=msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t=setTimeout(()=>el.classList.remove('show'),1800);
  }

  function showFeature(name){
    $$('.featurePanel').forEach(p=>p.classList.toggle('active',p.dataset.feature===name));
    $$('.featureTab').forEach(b=>b.classList.toggle('active',b.dataset.feature===name));
  }

  function renderLibrary(){
    const wrap=$('#libraryList');
    if(!wrap)return;
    if(!state.library.length){
      wrap.innerHTML='<div class="emptyState">还没有扫描本地音乐。点击“扫描音乐文件夹”。</div>';
      return;
    }
    wrap.innerHTML=state.library.map((t,i)=>`
      <button class="libRow" data-index="${i}">
        <span class="libIndex">${String(i+1).padStart(2,'0')}</span>
        <span class="libMeta"><b>${t.title}</b><small>${t.ext.toUpperCase()} · ${t.path}</small></span>
        <span class="libAction">▶</span>
      </button>`).join('');
    $$('#libraryList .libRow').forEach(btn=>btn.addEventListener('click',()=>playLibraryIndex(Number(btn.dataset.index))));
    renderShelf();
  }

  function renderQueue(){
    const wrap=$('#queueList');
    if(!wrap)return;
    if(!state.queue.length){
      wrap.innerHTML='<div class="emptyState">播放队列为空。</div>';
      return;
    }
    wrap.innerHTML=state.queue.map((t,i)=>`
      <div class="queueRow ${i===state.queueIndex?'active':''}">
        <span>${i+1}</span><div><b>${t.title}</b><small>${t.ext.toUpperCase()}</small></div>
        <button data-q="${i}">播放</button>
      </div>`).join('');
    $$('#queueList [data-q]').forEach(b=>b.addEventListener('click',()=>playQueueIndex(Number(b.dataset.q))));
  }

  function renderShelf(){
    const shelf=$('#playlistShelf');
    if(!shelf)return;
    const items=state.library.slice(0,12);
    if(!items.length){
      shelf.innerHTML='<div class="emptyState">扫描本地音乐后，这里会生成 3D 歌单架。</div>';
      return;
    }
    shelf.innerHTML=items.map((t,i)=>`
      <button class="shelfCard" data-shelf="${i}" style="--i:${i}">
        <span class="shelfDisc"></span>
        <b>${t.title}</b>
        <small>${t.ext.toUpperCase()}</small>
      </button>`).join('');
    $$('#playlistShelf [data-shelf]').forEach(b=>b.addEventListener('click',()=>playLibraryIndex(Number(b.dataset.shelf))));
  }

  async function prepareAndPlay(track){
    const result=await window.goBaoDesktop.prepareMusicPath(track.path);
    if(!result?.ok){
      toast('这首音乐暂时无法准备');
      return;
    }
    audio.src=result.track.playbackUrl;
    audio.load();
    $('#trackName').textContent=result.track.title;
    $('#trackSub').textContent='本地音乐库 · 自动解码 · FFT / 歌词 / 镜头同步';
    try{
      if(window.GoBaoAudio?.ctx?.state==='suspended') await window.GoBaoAudio.ctx.resume();
      await audio.play();
    }catch(_e){
      toast('点击主播放器“播放”开始');
    }
  }

  async function playLibraryIndex(index){
    if(!state.library[index])return;
    state.queue=state.library.slice();
    state.queueIndex=index;
    renderQueue();
    await prepareAndPlay(state.library[index]);
  }

  async function playQueueIndex(index){
    if(!state.queue[index])return;
    state.queueIndex=index;
    renderQueue();
    await prepareAndPlay(state.queue[index]);
  }

  async function scanMusic(){
    const result=await window.goBaoDesktop.chooseMusicFolder();
    if(!result||result.canceled)return;
    if(!result.ok){toast('扫描音乐文件夹失败');return;}
    state.library=result.tracks||[];
    state.queue=state.library.slice();
    state.queueIndex=-1;
    renderLibrary();
    renderQueue();
    $('#libraryPath').textContent=result.root||'';
    toast(`找到 ${state.library.length} 首音乐`);
  }

  function parseLrc(text){
    const out=[];
    String(text||'').split(/\r?\n/).forEach(line=>{
      const m=line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/);
      if(!m)return;
      const ms=Number(('0.'+(m[3]||'0')));
      out.push({time:Number(m[1])*60+Number(m[2])+ms,text:(m[4]||'').trim()||'♪'});
    });
    return out.sort((a,b)=>a.time-b.time);
  }

  function renderLyrics(){
    const stage=$('#lyricsLines');
    if(!stage)return;
    if(!state.lrc.length){
      stage.innerHTML='<div class="lyricLine current">导入 LRC 歌词后，这里会跟随播放时间滚动。</div>';
      return;
    }
    stage.innerHTML=state.lrc.map((x,i)=>`<div class="lyricLine" data-lyric="${i}">${x.text}</div>`).join('');
  }

  async function chooseLyrics(){
    const r=await window.goBaoDesktop.chooseLyrics();
    if(!r||r.canceled)return;
    if(!r.ok){toast('歌词读取失败');return;}
    state.lrc=parseLrc(r.content);
    renderLyrics();
    toast(`已载入 ${state.lrc.length} 行歌词`);
  }

  function syncLyrics(){
    if(!state.lrc.length)return;
    const t=audio.currentTime||0;
    let idx=0;
    for(let i=0;i<state.lrc.length;i++){
      if(state.lrc[i].time<=t)idx=i;else break;
    }
    $$('.lyricLine').forEach((el,i)=>el.classList.toggle('current',i===idx));
    const active=$('.lyricLine.current');
    active?.scrollIntoView({block:'center',behavior:'smooth'});
  }

  async function scanWallpaper(){
    const r=await window.goBaoDesktop.chooseWallpaperFolder();
    if(!r||r.canceled)return;
    state.wallpaperItems=r.items||[];
    const wrap=$('#wallpaperList');
    wrap.innerHTML=state.wallpaperItems.length
      ? state.wallpaperItems.map(x=>`<div class="wallRow"><b>${x.title||'未命名素材'}</b><small>${x.type||'project'} · ${x.projectPath}</small></div>`).join('')
      : '<div class="emptyState">这个文件夹里没有找到 project.json。</div>';
    toast(`识别到 ${state.wallpaperItems.length} 个素材项目`);
  }

  const presets={
    cosmic:{lens:72,disk:86,dust:70,react:88,label:'寰宇黑洞'},
    dream:{lens:58,disk:64,dust:95,react:72,label:'梦幻星云'},
    pulse:{lens:82,disk:92,dust:54,react:100,label:'强节拍'},
    calm:{lens:46,disk:52,dust:60,react:52,label:'治愈夜空'}
  };

  function applyPreset(name){
    const p=presets[name];
    if(!p)return;
    state.currentPreset=name;
    ['lens','disk','dust','react'].forEach(k=>{
      const el=$('#'+k);
      if(!el)return;
      el.value=p[k];
      el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    $('#presetName').textContent=p.label;
    toast('视觉预设：'+p.label);
  }

  function aiDJ(){
    const q=($('#aiDjPrompt').value||'').trim();
    if(!state.library.length){
      $('#aiDjResult').textContent='先扫描本地音乐库，AI DJ 才能从你的音乐里生成队列。';
      return;
    }
    const mode=/睡|安静|治愈|放松/.test(q)?'calm':/运动|健身|跑|燃|嗨/.test(q)?'pulse':/梦|宇宙|氛围/.test(q)?'dream':'cosmic';
    applyPreset(mode);
    const items=[...state.library].sort(()=>Math.random()-.5).slice(0,Math.min(12,state.library.length));
    state.queue=items;state.queueIndex=-1;renderQueue();
    $('#aiDjResult').textContent=`已根据“${q||'自由推荐'}”生成 ${items.length} 首队列，并切换到「${presets[mode].label}」视觉。`;
  }

  async function toggleDesktopMode(){
    const r=await window.goBaoDesktop.toggleDesktopMode();
    if(r?.enabled){
      $('#desktopModeStatus').textContent='桌面沉浸预览已开启（F8 可退出）';
      toast('桌面沉浸模式已开启');
    }else{
      $('#desktopModeStatus').textContent='当前为普通窗口模式';
      toast('已退出桌面沉浸模式');
    }
  }

  function toggleAutoMix(){
    state.automix=!state.automix;
    $('#automixBtn').classList.toggle('active',state.automix);
    $('#automixBtn').textContent=state.automix?'AutoMix 已开启':'开启 AutoMix';
    toast(state.automix?'AutoMix 已开启':'AutoMix 已关闭');
  }

  async function autoNext(){
    if(!state.automix||!state.queue.length)return;
    const next=state.queueIndex+1;
    if(next>=state.queue.length)return;
    const total=Math.max(8,Number(state.mixSeconds)||3)*100;
    for(let i=10;i>=0;i--){
      audio.volume=i/10;
      await new Promise(r=>setTimeout(r,total/10));
    }
    await playQueueIndex(next);
    for(let i=0;i<=10;i++){
      audio.volume=i/10;
      await new Promise(r=>setTimeout(r,total/10));
    }
  }

  function init(){
    $$('.featureTab').forEach(b=>b.addEventListener('click',()=>showFeature(b.dataset.feature)));
    $('#scanMusicBtn')?.addEventListener('click',scanMusic);
    $('#chooseLyricsBtn')?.addEventListener('click',chooseLyrics);
    $('#wallpaperScanBtn')?.addEventListener('click',scanWallpaper);
    $('#desktopModeBtn')?.addEventListener('click',toggleDesktopMode);
    $('#automixBtn')?.addEventListener('click',toggleAutoMix);
    $('#aiDjBtn')?.addEventListener('click',aiDJ);
    $('#mixSeconds')?.addEventListener('input',e=>state.mixSeconds=Number(e.target.value)||3);
    $$('.presetBtn').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.preset)));
    audio.addEventListener('timeupdate',syncLyrics);
    audio.addEventListener('ended',autoNext);
    renderLibrary();renderQueue();renderShelf();renderLyrics();
    applyPreset('cosmic');
  }

  init();
})();
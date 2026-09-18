(() => {
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const player=window.GoBaoPlayer;

  const state={
    library:[],
    queue:[],
    queueIndex:-1,
    lrc:[],
    lyricOffset:0,
    automix:false,
    mixSeconds:3,
    wallpaperItems:[],
    currentPreset:'cosmic',
    preloadedIndex:-1,
    preloadedDeck:null,
    preloadedTrack:null,
    crossfadeBusy:false,
    coverDataUrl:null
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

  function activeAudio(){
    return player?.activeAudio?.() || $('#audio');
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
        <span class="libMeta"><b>${escapeHtml(t.title)}</b><small>${String(t.ext||'').toUpperCase()} · ${escapeHtml(t.path)}</small></span>
        <span class="libAction">▶</span>
      </button>`).join('');
    $$('#libraryList .libRow').forEach(btn=>btn.addEventListener('click',()=>playLibraryIndex(Number(btn.dataset.index))));
    renderShelf();
  }

  function escapeHtml(s){
    return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
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
        <span>${i+1}</span>
        <div><b>${escapeHtml(t.title)}</b><small>${String(t.ext||'').toUpperCase()}</small></div>
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
        <b>${escapeHtml(t.title)}</b>
        <small>${String(t.ext||'').toUpperCase()}</small>
      </button>`).join('');
    $$('#playlistShelf [data-shelf]').forEach(b=>b.addEventListener('click',()=>playLibraryIndex(Number(b.dataset.shelf))));
  }

  async function prepareTrack(track){
    const result=await window.goBaoDesktop.prepareMusicPath(track.path);
    if(!result?.ok) throw new Error(result?.errorCode||'PREPARE_FAILED');
    return result.track;
  }

  async function prepareAndPlay(track){
    try{
      const prepared=await prepareTrack(track);
      await player.loadAsCurrent(prepared.playbackUrl,{
        title:prepared.title,
        sub:'本地音乐库 · 双 Deck · FFT / 歌词 / 镜头同步'
      });
      await player.playActive();
      return true;
    }catch(_e){
      toast('这首音乐暂时无法准备');
      return false;
    }
  }

  async function playLibraryIndex(index){
    if(!state.library[index])return;
    state.queue=state.library.slice();
    state.queueIndex=index;
    resetPreload();
    renderQueue();
    if(await prepareAndPlay(state.library[index])) await preloadNext();
  }

  async function playQueueIndex(index){
    if(!state.queue[index])return;
    state.queueIndex=index;
    resetPreload();
    renderQueue();
    if(await prepareAndPlay(state.queue[index])) await preloadNext();
  }

  function resetPreload(){
    state.preloadedIndex=-1;
    state.preloadedDeck=null;
    state.preloadedTrack=null;
    state.crossfadeBusy=false;
  }

  async function preloadNext(){
    if(!state.automix||!state.queue.length||!player)return;
    const nextIndex=state.queueIndex+1;
    if(nextIndex<0||nextIndex>=state.queue.length)return;
    if(state.preloadedIndex===nextIndex)return;
    try{
      const prepared=await prepareTrack(state.queue[nextIndex]);
      const deck=player.inactiveDeck();
      await player.prepareDeck(deck,prepared.playbackUrl);
      state.preloadedIndex=nextIndex;
      state.preloadedDeck=deck;
      state.preloadedTrack=prepared;
      refreshDeckStatus();
    }catch(_e){
      state.preloadedIndex=-1;
      state.preloadedDeck=null;
    }
  }

  async function maybeAutoMix(){
    if(!state.automix||state.crossfadeBusy||player.isTransitioning())return;
    const a=activeAudio();
    if(!a||!Number.isFinite(a.duration)||a.duration<=0)return;

    const remaining=a.duration-a.currentTime;
    if(remaining>Math.max(.6,state.mixSeconds))return;

    const nextIndex=state.queueIndex+1;
    if(state.preloadedIndex!==nextIndex||!state.preloadedDeck){
      await preloadNext();
      if(state.preloadedIndex!==nextIndex)return;
    }

    state.crossfadeBusy=true;
    const nextTrack=state.queue[nextIndex];
    const nextMeta=state.preloadedTrack;
    try{
      await player.crossfadeToPrepared(state.preloadedDeck,state.mixSeconds);
      state.queueIndex=nextIndex;
      player.updateTrackUI({
        title:nextMeta?.title||nextTrack?.title||'下一首',
        sub:'双 Deck AutoMix · 真正重叠交叉淡化 · FFT 同步'
      });
      state.preloadedIndex=-1;
      state.preloadedDeck=null;
      state.preloadedTrack=null;
      state.crossfadeBusy=false;
      renderQueue();
      await preloadNext();
    }catch(_e){
      state.crossfadeBusy=false;
      toast('AutoMix 过渡失败，已保持当前播放');
    }
  }

  async function fallbackNextOnEnded(){
    if(!state.automix||state.crossfadeBusy||player.isTransitioning())return;
    const next=state.queueIndex+1;
    if(next<state.queue.length) await playQueueIndex(next);
  }

  async function scanMusic(){
    const result=await window.goBaoDesktop.chooseMusicFolder();
    if(!result||result.canceled)return;
    if(!result.ok){toast('扫描音乐文件夹失败');return;}
    state.library=result.tracks||[];
    state.queue=state.library.slice();
    state.queueIndex=-1;
    resetPreload();
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
      const fraction=(m[3]||'0').padEnd(3,'0').slice(0,3);
      out.push({
        time:Number(m[1])*60+Number(m[2])+Number(fraction)/1000,
        text:(m[4]||'').trim()||'♪'
      });
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
    stage.innerHTML=state.lrc.map((x,i)=>`<div class="lyricLine" data-lyric="${i}">${escapeHtml(x.text)}</div>`).join('');
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
    const a=activeAudio();
    const t=(a?.currentTime||0)+state.lyricOffset;
    let idx=0;
    for(let i=0;i<state.lrc.length;i++){
      if(state.lrc[i].time<=t)idx=i;else break;
    }
    $$('.lyricLine').forEach((el,i)=>el.classList.toggle('current',i===idx));
    $('.lyricLine.current')?.scrollIntoView({block:'center',behavior:'smooth'});
  }

  function updateLyricOffset(value){
    state.lyricOffset=Number(value)||0;
    $('#lyricOffsetOut').textContent=(state.lyricOffset>=0?'+':'')+state.lyricOffset.toFixed(1)+'s';
    syncLyrics();
  }

  async function chooseCover(){
    const r=await window.goBaoDesktop.chooseCover();
    if(!r||r.canceled)return;
    if(!r.ok){toast('封面读取失败');return;}
    state.coverDataUrl=r.dataUrl;
    const cover=$('.cover');
    cover.style.backgroundImage=`url("${r.dataUrl}")`;
    cover.style.backgroundSize='cover';
    cover.style.backgroundPosition='center';
    $('#coverStatus').textContent='自定义封面';
    toast('封面已更新');
  }

  function clearCover(){
    state.coverDataUrl=null;
    const cover=$('.cover');
    cover.style.backgroundImage='';
    cover.style.backgroundSize='';
    cover.style.backgroundPosition='';
    $('#coverStatus').textContent='默认封面';
  }

  async function scanWallpaper(){
    const r=await window.goBaoDesktop.chooseWallpaperFolder();
    if(!r||r.canceled)return;
    state.wallpaperItems=r.items||[];
    const wrap=$('#wallpaperList');
    wrap.innerHTML=state.wallpaperItems.length
      ? state.wallpaperItems.map(x=>`<div class="wallRow"><b>${escapeHtml(x.title||'未命名素材')}</b><small>${escapeHtml(x.type||'project')} · ${escapeHtml(x.projectPath)}</small></div>`).join('')
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
    $$('.presetBtn').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));
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
    state.queue=items;
    state.queueIndex=-1;
    resetPreload();
    renderQueue();
    $('#aiDjResult').textContent=`已根据“${q||'自由推荐'}”生成 ${items.length} 首队列，并切换到「${presets[mode].label}」视觉。`;
    if(state.automix) preloadNext();
  }

  async function toggleDesktopMode(){
    const r=await window.goBaoDesktop.toggleDesktopMode();
    if(r?.enabled){
      const label=r.mode==='workerw'?'WorkerW 真桌面壁纸':'全屏回退模式';
      $('#desktopModeStatus').textContent=`${label} 已开启（F8 可退出）`;
      toast(label+' 已开启');
    }else{
      $('#desktopModeStatus').textContent=r?.error?`桌面模式未启用：${r.error}`:'当前为普通窗口模式';
      toast(r?.error?'WorkerW 启动失败，已安全回退':'已退出桌面模式');
    }
  }

  function toggleAutoMix(){
    state.automix=!state.automix;
    $('#automixBtn').classList.toggle('active',state.automix);
    $('#automixBtn').textContent=state.automix?'AutoMix 已开启':'开启 AutoMix';
    toast(state.automix?'双 Deck AutoMix 已开启':'AutoMix 已关闭');
    if(state.automix) preloadNext();
    else resetPreload();
  }

  function refreshDeckStatus(){
    if(!player)return;
    const active=player.activeDeck();
    const trans=player.isTransitioning();
    const a=$('#deckAState');
    const b=$('#deckBState');
    if(a)a.textContent=`Deck A · ${active==='A'?(trans?'混音中':'主播放'):(state.preloadedDeck==='A'?'已预载':'待机')}`;
    if(b)b.textContent=`Deck B · ${active==='B'?(trans?'混音中':'主播放'):(state.preloadedDeck==='B'?'已预载':'待机')}`;
  }

  async function refreshProviders(){
    const box=$('#providerRuntimeStatus');
    try{
      const s=await window.goBaoDesktop.providerStatus();
      const tme=s?.tme||{};
      const tuned=s?.tuned||{};
      $('#tmeProviderState').textContent=tme.configured&&tme.searchConfigured?'凭证/搜索已配置':'等待正式配置';
      $('#tunedProviderState').textContent=tuned.configured&&tuned.searchConfigured?'StoreId/搜索已配置':'等待正式配置';
      $('#tmeProviderCard').classList.toggle('ready',Boolean(tme.configured&&tme.searchConfigured));
      $('#tunedProviderCard').classList.toggle('ready',Boolean(tuned.configured&&tuned.searchConfigured));
      box.textContent=`TME：${tme.configured?'凭证已装载':'未配置'} · Tuned Global：${tuned.configured?'StoreId 已装载':'未配置'}。Secret 不会发送到渲染层。`;
    }catch(_e){
      box.textContent='Provider 状态读取失败。';
    }
  }

  async function testProviderSearch(){
    const provider=$('#providerSelect')?.value||'tuned';
    const query=($('#providerSearchInput')?.value||'').trim();
    const out=$('#providerSearchResults');
    if(!query){
      out.textContent='请输入歌名或歌手。';
      return;
    }
    out.textContent='正在请求 '+provider+'…';
    try{
      const result=await window.goBaoDesktop.providerSearch(provider,query,{count:10});
      out.textContent=JSON.stringify(result,null,2).slice(0,12000);
    }catch(err){
      out.textContent='请求失败：'+(err?.message||String(err));
    }
  }

  function runCinematicCamera(){
    const fft=window.GoBaoFFT||{bass:0,mid:0,treble:0,energy:0};
    const pulse=1+Math.min(.016,(fft.bass||0)*.012);
    document.documentElement.style.setProperty('--cinema-scale',pulse.toFixed(4));
    document.documentElement.style.setProperty('--cinema-x',((fft.mid||0)-.25)*2.2+'px');
    document.documentElement.style.setProperty('--cinema-y',((fft.energy||0)-.25)*1.5+'px');
    const lyric=$('.lyricsOverlay');
    if(lyric){
      lyric.style.opacity=String(.58+Math.min(.42,(fft.energy||0)*.55));
      lyric.style.filter='drop-shadow(0 0 '+(8+(fft.treble||0)*22)+'px rgba(176,99,255,.18))';
    }
    requestAnimationFrame(runCinematicCamera);
  }

  function bindDeckTiming(){
    if(!player)return;
    ['A','B'].forEach(name=>{
      const deck=player.deckAudio(name);
      deck.addEventListener('timeupdate',()=>{
        if(deck===player.activeAudio()){
          syncLyrics();
          void maybeAutoMix();
        }
      });
      deck.addEventListener('ended',()=>{
        if(deck===player.activeAudio()) void fallbackNextOnEnded();
      });
    });
    document.addEventListener('gobao:deckchange',refreshDeckStatus);
    document.addEventListener('gobao:deckstate',refreshDeckStatus);
    document.addEventListener('gobao:crossfade-start',refreshDeckStatus);
    document.addEventListener('gobao:crossfade-end',refreshDeckStatus);
  }

  function init(){
    $$('.featureTab').forEach(b=>b.addEventListener('click',()=>showFeature(b.dataset.feature)));
    $('#scanMusicBtn')?.addEventListener('click',scanMusic);
    $('#chooseLyricsBtn')?.addEventListener('click',chooseLyrics);
    $('#chooseCoverBtn')?.addEventListener('click',chooseCover);
    $('#clearCoverBtn')?.addEventListener('click',clearCover);
    $('#wallpaperScanBtn')?.addEventListener('click',scanWallpaper);
    $('#desktopModeBtn')?.addEventListener('click',toggleDesktopMode);
    $('#automixBtn')?.addEventListener('click',toggleAutoMix);
    $('#aiDjBtn')?.addEventListener('click',aiDJ);
    $('#providerRefreshBtn')?.addEventListener('click',refreshProviders);
    $('#providerSearchBtn')?.addEventListener('click',testProviderSearch);
    $('#providerSearchInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')void testProviderSearch();});
    $('#mixSeconds')?.addEventListener('input',e=>state.mixSeconds=Number(e.target.value)||3);
    $('#lyricOffset')?.addEventListener('input',e=>updateLyricOffset(e.target.value));
    $$('.presetBtn').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.preset)));

    bindDeckTiming();
    renderLibrary();
    renderQueue();
    renderShelf();
    renderLyrics();
    applyPreset('cosmic');
    refreshDeckStatus();
    void refreshProviders();
    runCinematicCamera();
  }

  init();
})();
(() => {
  const S=window.GoBaoServices;
  const {provider,library,aiDJ,tracks,playlists,serviceStatus}=S;
  const audio=document.getElementById('audio');
  const toastEl=document.getElementById('toast');
  const state={page:'home',current:null,queue:tracks.map(t=>t.id),local:[],demoUrls:new Map(),libraryTab:'favorites'};

  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const fmt=sec=>{if(!Number.isFinite(sec))return'--:--';sec=Math.max(0,Math.floor(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')};
  const toast=msg=>{toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toastEl.classList.remove('show'),1800)};

  const controls={
    lens:$('#lens'),disk:$('#disk'),dust:$('#dust'),react:$('#react'),ui:$('#ui')
  };
  window.GoBaoControls=controls;

  let actx=null,analyser=null,sourceNode=null,freq=null;
  function ensureAudioGraph(){
    if(actx)return;
    actx=new (window.AudioContext||window.webkitAudioContext)();
    analyser=actx.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.78;
    freq=new Uint8Array(analyser.frequencyBinCount);
    sourceNode=actx.createMediaElementSource(audio);sourceNode.connect(analyser);analyser.connect(actx.destination);
    window.GoBaoAudio={ctx:actx,analyser,freq,audio};
  }
  async function unlock(){ensureAudioGraph();if(actx.state==='suspended')await actx.resume()}

  function makeDemoWav(track){
    if(state.demoUrls.has(track.id))return state.demoUrls.get(track.id);
    const sr=22050, seconds=18, count=sr*seconds, buf=new ArrayBuffer(44+count*2), v=new DataView(buf);
    const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
    w(0,'RIFF');v.setUint32(4,36+count*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,count*2,true);
    const base=[110,123.47,130.81,146.83,164.81][track.seed%5], scale=[1,1.122,1.26,1.335,1.498,1.682];
    const beatSec=60/track.bpm;
    for(let i=0;i<count;i++){
      const t=i/sr, beatPos=(t%beatSec)/beatSec, beat=Math.exp(-beatPos*16);
      const step=Math.floor(t/(beatSec*.5))%scale.length, f=base*scale[(step+track.seed)%scale.length];
      const pad=Math.sin(2*Math.PI*base*t)*.11+Math.sin(2*Math.PI*base*1.5*t)*.06;
      const lead=Math.sin(2*Math.PI*f*t)*(.05+.05*Math.sin(Math.PI*Math.min(1,beatPos*2)));
      const kick=Math.sin(2*Math.PI*(52+28*Math.exp(-beatPos*14))*t)*beat*.18;
      const shimmer=Math.sin(2*Math.PI*(f*2.01)*t)*.025*(.5+.5*Math.sin(t*.7+track.seed));
      const s=Math.max(-1,Math.min(1,(pad+lead+kick+shimmer)*.82));
      v.setInt16(44+i*2,s*32767,true);
    }
    const url=URL.createObjectURL(new Blob([buf],{type:'audio/wav'}));state.demoUrls.set(track.id,url);return url;
  }

  function findTrack(id){return tracks.find(t=>t.id===id)||state.local.find(t=>t.id===id)||null}
  async function playTrack(track){
    if(!track)return;
    state.current=track;
    state.queue=(track.local?state.local:tracks).map(t=>t.id);
    const url=track.local?track.url:makeDemoWav(track);
    try{
      await unlock();
      if(audio.src!==url){audio.src=url;audio.load()}
      await audio.play();
      if(!track.local)library.addHistory(track.id);
      updateCurrentUI();
      if(!track.local)loadLyrics(track.id);
      else renderLyrics(['本地音乐正在播放','Go宝 3D 视觉正在读取实时频谱','Bass / Mid / Treble / Energy 同步驱动']);
      if(state.page==='library')renderLibrary();
    }catch(e){toast('播放失败，请换一首或重新导入本地音乐')}
  }

  async function loadLyrics(id){renderLyrics(await provider.lyrics(id))}
  function renderLyrics(lines){
    $('#lyricsLines').innerHTML=lines.map((x,i)=>'<div class="'+(i===1?'activeLyric':'')+'">'+escapeHtml(x)+'</div>').join('');
  }
  function escapeHtml(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function updateCurrentUI(){
    const t=state.current;
    $('#miniTitle').textContent=t?t.title:'请选择歌曲';$('#miniArtist').textContent=t?t.artist:'Go宝音乐';
    $('#miniCover').style.background=t?t.cover:'linear-gradient(135deg,#6d4bcb,#cf65c8)';
    $('#miniCover').textContent='♫';
    $('#favCurrentBtn').classList.toggle('on',!!(t&&!t.local&&library.favorites.has(t.id)));
    $('#favCurrentBtn').textContent=t&&!t.local&&library.favorites.has(t.id)?'♥':'♡';
    $('#trackName').textContent=t?t.title:'寰宇黑洞 · Demo';
    $('#trackSub').textContent=t?(t.artist+' · '+(t.local?'本地音乐':'Demo 音源 · FFT 实时驱动')):'音乐驱动黑洞与星体';
    $('#visualCover').style.background=t?t.cover:'linear-gradient(135deg,#6d4bcb,#cf65c8)';
  }

  function trackRow(t,{rank}={}){
    const fav=!t.local&&library.favorites.has(t.id), dl=!t.local&&library.downloads.includes(t.id);
    return '<div class="trackRowItem" data-track="'+t.id+'">'+
      (rank?'<div class="rank">'+rank+'</div>':'<div class="trackArt" style="background:'+t.cover+'">♫</div>')+
      '<div class="trackTitle"><b>'+escapeHtml(t.title)+'</b><small>'+escapeHtml(t.artist)+'</small></div>'+
      '<div class="trackAlbum">'+escapeHtml(t.album||'本地音乐')+'</div>'+
      '<div class="trackMood">'+escapeHtml((t.mood||['LOCAL']).join(' · '))+'</div>'+
      '<div class="trackActions">'+
      '<button class="iconBtn" data-act="play" title="播放">▶</button>'+
      (!t.local?'<button class="iconBtn '+(fav?'on':'')+'" data-act="fav" title="收藏">'+(fav?'♥':'♡')+'</button>':'')+
      (!t.local?'<button class="iconBtn '+(dl?'on':'')+'" data-act="download" title="下载">⇩</button>':'')+
      (!t.local?'<button class="iconBtn" data-act="add" title="加入歌单">＋</button>':'')+
      '</div></div>';
  }
  function renderTrackList(el,list,opts={}){
    el.innerHTML=list.length?list.map((t,i)=>trackRow(t,{rank:opts.ranked?(i+1):null})).join(''):'<div style="padding:24px;color:#756c80;font-size:11px">这里还没有内容。</div>';
  }

  function playlistCard(p){
    return '<div class="playlistCard" data-playlist="'+p.id+'"><div class="playlistCover" style="background:'+p.cover+'"></div><b>'+escapeHtml(p.name)+'</b><small>'+escapeHtml(p.desc||((p.trackIds||[]).length+' 首歌曲'))+'</small></div>';
  }

  async function renderHome(){
    $('#recommendedPlaylists').innerHTML=(await provider.getPlaylists()).map(playlistCard).join('');
    renderTrackList($('#homeTracks'),await provider.recommendations({limit:8}));
  }
  async function renderSearch(q=''){
    const list=await provider.search(q);renderTrackList($('#searchResults'),list);$('#searchSummary').textContent=q?('“'+q+'” · '+list.length+' 条结果'):'热门内容';
  }
  async function renderPlaylists(){
    $('#allPlaylists').innerHTML=(await provider.getPlaylists()).map(playlistCard).join('');
    $('#customPlaylists').innerHTML=library.customPlaylists.length?library.customPlaylists.map(p=>playlistCard({...p,desc:p.trackIds.length+' 首歌曲',cover:'linear-gradient(135deg,#34204c,#8354b8)'})).join(''):'<div style="color:#756c80;font-size:11px">还没有自建歌单，点击“新建歌单”开始。</div>';
    renderPlaylistMini();
  }
  function renderPlaylistMini(){
    $('#playlistMini').innerHTML=library.customPlaylists.slice(0,6).map(p=>'<div class="miniPlaylist" data-playlist="'+p.id+'">♫ '+escapeHtml(p.name)+'</div>').join('');
  }
  async function openPlaylist(id){
    let p=await provider.getPlaylist(id);
    if(!p){
      const cp=library.customPlaylists.find(x=>x.id===id);
      if(cp)p={...cp,tracks:cp.trackIds.map(findTrack).filter(Boolean)};
    }
    if(!p)return;
    go('playlists');
    $('#playlistDetail').innerHTML='<div class="sectionHead"><div><h2>'+escapeHtml(p.name)+'</h2><p>'+(p.tracks?.length||0)+' 首歌曲</p></div><button class="primary" data-playlist-play="'+p.id+'">▶ 播放全部</button></div><div class="trackList" id="playlistDetailTracks"></div>';
    renderTrackList($('#playlistDetailTracks'),p.tracks||[]);
  }
  async function renderCharts(){renderTrackList($('#chartTracks'),await provider.charts(),{ranked:true})}
  function renderLibrary(){
    const ids=state.libraryTab==='favorites'?[...library.favorites]:library.history;
    renderTrackList($('#libraryTracks'),ids.map(findTrack).filter(Boolean));
  }
  function renderLocal(){renderTrackList($('#localTracks'),state.local)}
  function renderDownloads(){renderTrackList($('#downloadTracks'),library.downloads.map(findTrack).filter(Boolean))}
  function renderServices(){
    $('#serviceGrid').innerHTML=serviceStatus.map(s=>'<div class="serviceCard"><div class="serviceTop"><b>'+escapeHtml(s.name)+'</b><span class="statusPill '+s.status+'">'+(s.status==='ready'?'READY':'WAIT API')+'</span></div><p>'+escapeHtml(s.desc)+'</p></div>').join('');
  }

  function go(page){
    state.page=page;
    $$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));
    $$('.navItem').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
    if(page==='search')renderSearch($('#searchInput').value);
    if(page==='playlists')renderPlaylists();
    if(page==='charts')renderCharts();
    if(page==='library')renderLibrary();
    if(page==='local')renderLocal();
    if(page==='downloads')renderDownloads();
    if(page==='services')renderServices();
    $('.content').scrollTop=0;
  }

  function openVisual(){$('#visualModal').classList.add('open');$('#visualModal').setAttribute('aria-hidden','false');updateCurrentUI()}
  function closeVisual(){$('#visualModal').classList.remove('open');$('#visualModal').setAttribute('aria-hidden','true')}
  function openPlaylistDialog(){$('#playlistModal').classList.add('open');$('#playlistNameInput').value='';setTimeout(()=>$('#playlistNameInput').focus(),60)}
  function closePlaylistDialog(){$('#playlistModal').classList.remove('open')}

  async function generateAI(prompt){
    $('#aiReply').textContent='Go宝正在分析你的场景和情绪…';
    const res=await aiDJ.recommend(prompt);
    $('#aiReply').textContent='已生成「'+res.mood+'」歌单 · '+res.reason;
    renderTrackList($('#aiResults'),res.tracks);
  }

  function addToPlaylist(trackId){
    if(!library.customPlaylists.length){const p=library.createPlaylist('我的收藏歌单');library.addToPlaylist(p.id,trackId);renderPlaylistMini();toast('已创建“我的收藏歌单”并加入歌曲');return}
    const p=library.customPlaylists[0];library.addToPlaylist(p.id,trackId);toast('已加入 '+p.name);if(state.page==='playlists')renderPlaylists();
  }

  function importLocal(files){
    [...files].forEach((f,i)=>{
      const url=URL.createObjectURL(f);
      state.local.unshift({id:'local-'+Date.now()+'-'+i,title:f.name.replace(/\.[^/.]+$/,''),artist:'本地文件',album:'Local Music',mood:['LOCAL'],duration:0,cover:'linear-gradient(135deg,#30517d,#9754ba)',local:true,url,file});
    });
    renderLocal();toast('已导入 '+files.length+' 首本地音乐');
  }

  $$('#nav .navItem').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
  document.addEventListener('click',async e=>{
    const jump=e.target.closest('[data-page-jump]');if(jump){go(jump.dataset.pageJump);return}
    const card=e.target.closest('[data-playlist]');if(card){openPlaylist(card.dataset.playlist);return}
    const row=e.target.closest('.trackRowItem');if(row){
      const t=findTrack(row.dataset.track), act=e.target.closest('[data-act]')?.dataset.act||'play';
      if(act==='play')playTrack(t);
      else if(act==='fav'){const on=library.toggleFavorite(t.id);toast(on?'已收藏':'已取消收藏');refreshVisibleLists()}
      else if(act==='download'){const on=library.toggleDownload(t.id);toast(on?'已加入下载':'已移出下载');refreshVisibleLists()}
      else if(act==='add')addToPlaylist(t.id);
      return;
    }
    const pp=e.target.closest('[data-playlist-play]');if(pp){
      let p=await provider.getPlaylist(pp.dataset.playlistPlay);if(!p){const cp=library.customPlaylists.find(x=>x.id===pp.dataset.playlistPlay);p=cp?{tracks:cp.trackIds.map(findTrack).filter(Boolean)}:null}if(p?.tracks?.[0])playTrack(p.tracks[0]);
      return;
    }
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='shuffle'){renderTrackList($('#homeTracks'),[...tracks].sort(()=>Math.random()-.5).slice(0,8))}
    if(action==='daily'){playTrack(tracks[0])}
    if(action==='new'){playTrack(tracks[2])}
    if(action==='radio'){playTrack(tracks[7])}
  });

  function refreshVisibleLists(){
    if(state.page==='home')renderHome();
    if(state.page==='search')renderSearch($('#searchInput').value);
    if(state.page==='library')renderLibrary();
    if(state.page==='downloads')renderDownloads();
  }

  $('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){const q=e.currentTarget.value;$('#searchInput').value=q;go('search')}});
  $('#searchBtn').addEventListener('click',()=>renderSearch($('#searchInput').value));
  $('#searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')renderSearch(e.currentTarget.value)});
  ['流行','电子','治愈','夜晚','专注','旅行','健身'].forEach(x=>$('#searchChips').insertAdjacentHTML('beforeend','<button data-query="'+x+'">'+x+'</button>'));
  $('#searchChips').addEventListener('click',e=>{const q=e.target.dataset.query;if(q){$('#searchInput').value=q;renderSearch(q)}});

  ['今晚助眠','健身燃一点','开车夜行','专注工作','旅行路上','治愈一下'].forEach(x=>$('#aiChips').insertAdjacentHTML('beforeend','<button data-prompt="'+x+'">'+x+'</button>'));
  $('#aiChips').addEventListener('click',e=>{const p=e.target.dataset.prompt;if(p){$('#aiPrompt').value=p;generateAI(p)}});
  $('#aiGenerate').addEventListener('click',()=>generateAI($('#aiPrompt').value||'给我一些适合现在听的歌'));

  $('#heroPlay').addEventListener('click',()=>playTrack(tracks[0]));
  $('#heroAI').addEventListener('click',()=>go('aidj'));
  $('#openVisualBtn').addEventListener('click',openVisual);$('#visualBtn').addEventListener('click',openVisual);$('#closeVisual').addEventListener('click',closeVisual);
  $('#visualModal').addEventListener('click',e=>{if(e.target===$('#visualModal'))closeVisual()});
  $('#visualPlayBtn').addEventListener('click',async()=>{if(!state.current)await playTrack(tracks[0]);else audio.paused?audio.play():audio.pause()});
  $('#fullBtn').addEventListener('click',async()=>{try{const st=$('#stage');if(!document.fullscreenElement)await st.requestFullscreen();else await document.exitFullscreen()}catch{}});
  $('#settingsBtn').addEventListener('click',()=>go('services'));$('#notifyBtn').addEventListener('click',()=>toast('暂无新的通知'));

  $('#createPlaylistBtn').addEventListener('click',openPlaylistDialog);$('#newPlaylistTop').addEventListener('click',openPlaylistDialog);$('#closePlaylistModal').addEventListener('click',closePlaylistDialog);
  $('#confirmPlaylist').addEventListener('click',()=>{const name=$('#playlistNameInput').value.trim();if(!name)return toast('请输入歌单名称');library.createPlaylist(name);closePlaylistDialog();renderPlaylists();toast('歌单已创建')});

  $$('.tabs [data-library-tab]').forEach(b=>b.addEventListener('click',()=>{state.libraryTab=b.dataset.libraryTab;$$('.tabs [data-library-tab]').forEach(x=>x.classList.toggle('active',x===b));renderLibrary()}));

  $('#importLocalBtn').addEventListener('click',()=>$('#audioFile').click());$('#localDrop').addEventListener('dblclick',()=>$('#audioFile').click());
  $('#audioFile').addEventListener('change',e=>importLocal(e.target.files));

  $('#miniPlayBtn').addEventListener('click',async()=>{if(!state.current)return playTrack(tracks[0]);await unlock();audio.paused?audio.play():audio.pause()});
  $('#prevBtn').addEventListener('click',()=>stepTrack(-1));$('#nextBtn').addEventListener('click',()=>stepTrack(1));
  function stepTrack(d){if(!state.current)return playTrack(tracks[0]);const q=state.queue,i=Math.max(0,q.indexOf(state.current.id));playTrack(findTrack(q[(i+d+q.length)%q.length]))}
  $('#favCurrentBtn').addEventListener('click',()=>{if(!state.current||state.current.local)return toast('本地音乐暂不加入云收藏');library.toggleFavorite(state.current.id);updateCurrentUI();refreshVisibleLists()});
  $('#volume').addEventListener('input',e=>audio.volume=Number(e.target.value)/100);

  function bindSeek(id){$(id).addEventListener('input',e=>{if(audio.duration)audio.currentTime=audio.duration*Number(e.target.value)/1000})}
  bindSeek('#miniSeek');bindSeek('#seek');

  audio.addEventListener('play',()=>{$('#miniPlayBtn').textContent='Ⅱ';updateCurrentUI()});
  audio.addEventListener('pause',()=>$('#miniPlayBtn').textContent='▶');
  audio.addEventListener('ended',()=>stepTrack(1));
  audio.addEventListener('loadedmetadata',updateTime);
  audio.addEventListener('timeupdate',updateTime);
  function updateTime(){
    const p=audio.duration?Math.round(audio.currentTime/audio.duration*1000):0;
    $('#miniSeek').value=p;$('#seek').value=p;
    $('#miniCur').textContent=fmt(audio.currentTime);$('#cur').textContent=fmt(audio.currentTime);
    $('#miniDur').textContent=fmt(audio.duration);$('#dur').textContent=fmt(audio.duration);
  }

  function syncSettingPair(name){
    const a=controls[name], b=$('#'+name+'Setting');if(!a||!b)return;
    const apply=(v)=>{a.value=v;b.value=v;$('#'+name+'Out').textContent=v+'%';b.nextElementSibling.textContent=v+'%';if(name==='ui')document.documentElement.style.setProperty('--panel-alpha',Math.max(.35,Number(v)/100))};
    a.addEventListener('input',()=>apply(a.value));b.addEventListener('input',()=>apply(b.value));
  }
  ['lens','disk','dust','react','ui'].forEach(syncSettingPair);

  renderHome();renderPlaylistMini();renderServices();updateCurrentUI();audio.volume=.78;
})();
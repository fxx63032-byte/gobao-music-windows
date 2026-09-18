(() => {
  const delay=(ms=120)=>new Promise(r=>setTimeout(r,ms));
  const tracks=[
    {id:'t1',title:'晴空漫游',artist:'GoBao Lab',album:'Better Days',genre:'流行',mood:['治愈','放松'],bpm:92,duration:224,seed:1,cover:'linear-gradient(135deg,#7d5cff,#ef8bcf)'},
    {id:'t2',title:'夜色霓虹',artist:'Nova Lane',album:'City Lights',genre:'电子',mood:['夜晚','开车'],bpm:118,duration:238,seed:2,cover:'linear-gradient(135deg,#1d3d8f,#a247cf)'},
    {id:'t3',title:'星河列车',artist:'GoBao Lab',album:'Orbit',genre:'氛围',mood:['旅行','梦幻'],bpm:104,duration:246,seed:3,cover:'linear-gradient(135deg,#204e9c,#8c52ff)'},
    {id:'t4',title:'雨后街角',artist:'Mira',album:'After Rain',genre:'R&B',mood:['治愈','雨天'],bpm:84,duration:218,seed:4,cover:'linear-gradient(135deg,#375c8a,#c47da2)'},
    {id:'t5',title:'无重力心跳',artist:'Pulse Unit',album:'Zero G',genre:'电子',mood:['健身','高能'],bpm:132,duration:202,seed:5,cover:'linear-gradient(135deg,#ff4b8b,#7a42ff)'},
    {id:'t6',title:'晨光海岸',artist:'Aero Blue',album:'Morning Coast',genre:'轻音乐',mood:['清晨','放松'],bpm:88,duration:232,seed:6,cover:'linear-gradient(135deg,#4aa7d8,#ffd18b)'},
    {id:'t7',title:'深空回声',artist:'GoBao Lab',album:'Cosmic Echo',genre:'氛围',mood:['专注','梦幻'],bpm:76,duration:260,seed:7,cover:'linear-gradient(135deg,#171d51,#8c46db)'},
    {id:'t8',title:'城市晚风',artist:'North Avenue',album:'After 9',genre:'流行',mood:['夜晚','放松'],bpm:98,duration:229,seed:8,cover:'linear-gradient(135deg,#3a3462,#d981b7)'},
    {id:'t9',title:'氧气花园',artist:'Lumi',album:'Green Room',genre:'轻音乐',mood:['治愈','专注'],bpm:80,duration:241,seed:9,cover:'linear-gradient(135deg,#267b70,#9ad77d)'},
    {id:'t10',title:'紫色日落',artist:'GoBao Lab',album:'Violet Sunset',genre:'流行',mood:['旅行','治愈'],bpm:96,duration:235,seed:10,cover:'linear-gradient(135deg,#9b54d0,#ff8ea6)'},
    {id:'t11',title:'凌晨两点',artist:'Kino',album:'02:00',genre:'R&B',mood:['夜晚','情绪'],bpm:82,duration:248,seed:11,cover:'linear-gradient(135deg,#191f46,#6e4fa1)'},
    {id:'t12',title:'云端散步',artist:'Mellow Park',album:'Cloud Walk',genre:'Lo-Fi',mood:['工作','专注'],bpm:72,duration:252,seed:12,cover:'linear-gradient(135deg,#6d7ca8,#bba0d7)'}
  ];
  const playlists=[
    {id:'p1',name:'今天也要开心呀',desc:'轻快治愈，给日常一点明亮',tag:'治愈',trackIds:['t1','t6','t10','t9'],cover:'linear-gradient(135deg,#f2a3c7,#8d72ff)'},
    {id:'p2',name:'治愈系轻音乐',desc:'放空、睡前、安静独处',tag:'放松',trackIds:['t6','t9','t12','t4'],cover:'linear-gradient(135deg,#87b7ee,#cda6ef)'},
    {id:'p3',name:'健身燃脂节奏',desc:'稳定节拍，进入训练状态',tag:'健身',trackIds:['t5','t2','t3','t1'],cover:'linear-gradient(135deg,#ff705f,#a945dc)'},
    {id:'p4',name:'开车必听',desc:'城市道路和夜晚高速',tag:'开车',trackIds:['t2','t8','t10','t5'],cover:'linear-gradient(135deg,#314d77,#ff765d)'},
    {id:'p5',name:'深夜情绪',desc:'适合一个人的夜晚',tag:'夜晚',trackIds:['t11','t8','t4','t7'],cover:'linear-gradient(135deg,#20214b,#a2498d)'},
    {id:'p6',name:'专注工作流',desc:'低干扰、长时间专注',tag:'专注',trackIds:['t12','t7','t9','t6'],cover:'linear-gradient(135deg,#284b78,#6150b0)'}
  ];
  const lyrics={
    t1:['晴空在窗边慢慢靠近','风把昨天吹得很轻','把今天交给一段旋律','让心情重新变透明'],
    t2:['霓虹穿过城市的雨','车窗倒映未眠的你','鼓点沿着街道延伸','把夜晚交给节奏呼吸'],
    t3:['星河像一列无声列车','从远方驶过梦的边缘','如果世界暂时太吵','就跟着光走远一点']
  };

  class MusicProvider {
    async search(){throw new Error('NOT_IMPLEMENTED')}
    async recommendations(){throw new Error('NOT_IMPLEMENTED')}
    async getTrack(){throw new Error('NOT_IMPLEMENTED')}
  }
  class MockMusicProvider extends MusicProvider {
    async search(q=''){await delay();const s=q.trim().toLowerCase();if(!s)return tracks;return tracks.filter(t=>[t.title,t.artist,t.album,t.genre,...t.mood].join(' ').toLowerCase().includes(s));}
    async recommendations({mood,limit=8}={}){await delay(80);let list=[...tracks];if(mood)list=list.filter(t=>t.mood.includes(mood));return (list.length?list:tracks).slice(0,limit);}
    async getTrack(id){await delay(50);return tracks.find(t=>t.id===id)||null;}
    async getPlaylists(){await delay(80);return playlists;}
    async getPlaylist(id){await delay(60);const p=playlists.find(x=>x.id===id);return p?{...p,tracks:p.trackIds.map(id=>tracks.find(t=>t.id===id)).filter(Boolean)}:null;}
    async charts(){await delay(70);return tracks.map((t,i)=>({...t,rank:i+1,trend:i%3===0?'↑':i%3===1?'—':'↓'}));}
    async lyrics(id){await delay(40);return lyrics[id]||['音乐正在流动','把注意力交给这一刻','让节奏和画面一起呼吸','Go宝音乐 · Demo Lyrics'];}
  }

  const store={
    get(k,fallback){try{return JSON.parse(localStorage.getItem('gobao:'+k))??fallback}catch{return fallback}},
    set(k,v){localStorage.setItem('gobao:'+k,JSON.stringify(v))}
  };

  const library={
    favorites:new Set(store.get('favorites',[])),
    history:store.get('history',[]),
    customPlaylists:store.get('customPlaylists',[]),
    downloads:store.get('downloads',[]),
    toggleFavorite(id){this.favorites.has(id)?this.favorites.delete(id):this.favorites.add(id);store.set('favorites',[...this.favorites]);return this.favorites.has(id)},
    addHistory(id){this.history=[id,...this.history.filter(x=>x!==id)].slice(0,30);store.set('history',this.history)},
    createPlaylist(name){const p={id:'u'+Date.now(),name,trackIds:[]};this.customPlaylists.unshift(p);store.set('customPlaylists',this.customPlaylists);return p},
    addToPlaylist(pid,tid){const p=this.customPlaylists.find(x=>x.id===pid);if(!p)return false;if(!p.trackIds.includes(tid))p.trackIds.push(tid);store.set('customPlaylists',this.customPlaylists);return true},
    toggleDownload(id){const has=this.downloads.includes(id);this.downloads=has?this.downloads.filter(x=>x!==id):[...this.downloads,id];store.set('downloads',this.downloads);return !has}
  };

  const aiDJ={
    async recommend(prompt=''){await delay(320);const s=prompt.toLowerCase();let mood=null;
      if(/睡|助眠|放松|安静/.test(s))mood='放松';
      else if(/健身|运动|燃/.test(s))mood='健身';
      else if(/开车|驾驶|高速/.test(s))mood='开车';
      else if(/工作|学习|专注/.test(s))mood='专注';
      else if(/旅行|路上/.test(s))mood='旅行';
      else if(/夜|深夜/.test(s))mood='夜晚';
      else if(/治愈|难过|心情/.test(s))mood='治愈';
      const list=mood?tracks.filter(t=>t.mood.includes(mood)):tracks.filter((_,i)=>i%2===0);
      return {mood:mood||'综合',reason:mood?('根据“'+mood+'”场景生成'):'根据当前情绪生成综合歌单',tracks:(list.length?list:tracks).slice(0,6)};
    }
  };

  const serviceStatus=[
    {name:'MusicProvider',status:'ready',desc:'Mock 曲库已连接；正式环境替换 TME / DMH Adapter'},
    {name:'Search Service',status:'ready',desc:'歌曲 / 歌手 / 专辑 / 风格统一搜索'},
    {name:'Recommendation',status:'ready',desc:'场景标签 + AI DJ 推荐接口'},
    {name:'Playlist Service',status:'ready',desc:'创建歌单、收藏、历史记录，本地持久化'},
    {name:'Lyrics Service',status:'ready',desc:'Demo 歌词接口；正式版接歌词版权源'},
    {name:'Rights Service',status:'pending',desc:'等待正式曲库授权 API 后启用地区/版权校验'},
    {name:'Billing / VIP',status:'pending',desc:'保留会员、音质、下载权益接口'},
    {name:'Auth / Sync',status:'pending',desc:'保留登录、多端同步和云歌单接口'}
  ];

  window.GoBaoServices={
    provider:new MockMusicProvider(),
    MusicProvider,
    library,
    aiDJ,
    store,
    tracks,
    playlists,
    serviceStatus
  };
})();
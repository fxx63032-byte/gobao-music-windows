const { MusicProvider } = require('./provider-contract');

function queryString(params={}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s=q.toString();
  return s ? '?'+s : '';
}

function applyTemplate(template, vars={}) {
  return String(template||'').replace(/\{([a-zA-Z0-9_]+)\}/g, (_m,k) => encodeURIComponent(vars[k] ?? ''));
}


class TunedGlobalProvider extends MusicProvider {
  constructor(config={}){
    super('tuned-global');
    this.config={
      baseUrl:config.baseUrl||'',
      storeId:config.storeId||'',
      country:config.country||'',
      searchPath:config.searchPath||'',
      trackPath:config.trackPath||'',
      lyricsPath:config.lyricsPath||'',
      streamPathTemplate:config.streamPathTemplate||''
    };
  }

  status(){
    return {
      name:this.name,
      configured:Boolean(this.config.baseUrl && this.config.storeId),
      baseUrlConfigured:Boolean(this.config.baseUrl),
      storeIdConfigured:Boolean(this.config.storeId),
      searchConfigured:Boolean(this.config.searchPath),
      playbackConfigured:Boolean(this.config.streamPathTemplate)
    };
  }

  async _request(method, route, {query,body,accessToken,country}={}){
    if(!this.config.baseUrl || !this.config.storeId) throw new Error('TUNED_GLOBAL_NOT_CONFIGURED');
    if(!route) throw new Error('TUNED_GLOBAL_ENDPOINT_NOT_CONFIGURED');
    const url=this.config.baseUrl.replace(/\/$/,'') + '/' + route.replace(/^\//,'') + queryString(query);
    const headers={ 'StoreId':this.config.storeId, 'Accept':'application/json' };
    const market=country||this.config.country;
    if(market) headers.Country=market;
    if(accessToken) headers.Authorization='Bearer '+accessToken;
    if(body!==undefined) headers['Content-Type']='application/json';
    const res=await fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const text=await res.text();
    let payload=null;
    try{payload=text?JSON.parse(text):null;}catch(_e){payload=text;}
    if(!res.ok){
      const err=new Error('TUNED_GLOBAL_HTTP_'+res.status);
      err.status=res.status;err.payload=payload;throw err;
    }
    return payload;
  }

  async search(query,{offset=1,count=20,country}={}){
    return this._request('GET',this.config.searchPath,{query:{q:query,offset,count,applyCountryFilter:true},country});
  }

  async getTrack(id,{country}={}){
    const route=applyTemplate(this.config.trackPath,{trackId:id,id});
    return this._request('GET',route,{country});
  }

  async getLyrics(id,{country}={}){
    if(!this.config.lyricsPath) return null;
    return this._request('GET',applyTemplate(this.config.lyricsPath,{trackId:id,id}),{country});
  }

  async getPlayback(id,context={}){
    const route=applyTemplate(this.config.streamPathTemplate,{trackId:id,id,deviceId:context.deviceId});
    return this._request('POST',route,{
      query:{streamType:'Music',assetType:context.assetType},
      body:context.streamToken?{token:context.streamToken}:undefined,
      accessToken:context.accessToken,
      country:context.country
    });
  }
}
module.exports={TunedGlobalProvider};

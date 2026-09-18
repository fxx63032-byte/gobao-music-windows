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


class TmeMusicCloudProvider extends MusicProvider {
  constructor(config={}){
    super('tme-music-cloud');
    this.config={
      baseUrl:config.baseUrl||'',
      appId:config.appId||'',
      apiKey:config.apiKey||'',
      searchPath:config.searchPath||'',
      trackPath:config.trackPath||'',
      lyricsPath:config.lyricsPath||'',
      playbackPath:config.playbackPath||'',
      appIdHeader:config.appIdHeader||'',
      apiKeyHeader:config.apiKeyHeader||'',
      authScheme:config.authScheme||''
    };
  }

  status(){
    return {
      name:this.name,
      configured:Boolean(this.config.baseUrl && this.config.appId && this.config.apiKey && (this.config.apiKeyHeader || this.config.authScheme)),
      baseUrlConfigured:Boolean(this.config.baseUrl),
      appIdConfigured:Boolean(this.config.appId),
      credentialConfigured:Boolean(this.config.apiKey),
      authConfigured:Boolean(this.config.apiKeyHeader || this.config.authScheme),
      searchConfigured:Boolean(this.config.searchPath),
      playbackConfigured:Boolean(this.config.playbackPath)
    };
  }

  async _request(method, route, {query,body,headers={}}={}){
    if(!this.config.baseUrl || !this.config.appId || !this.config.apiKey) throw new Error('TME_PROVIDER_NOT_CONFIGURED');
    if(!route) throw new Error('TME_ENDPOINT_NOT_CONFIGURED');
    const url=this.config.baseUrl.replace(/\/$/,'') + '/' + route.replace(/^\//,'') + queryString(query);
    const requestHeaders={ 'Accept':'application/json', ...headers };
    if(this.config.appIdHeader) requestHeaders[this.config.appIdHeader]=this.config.appId;
    if(this.config.apiKeyHeader) requestHeaders[this.config.apiKeyHeader]=this.config.apiKey;
    else if(this.config.authScheme) requestHeaders.Authorization=this.config.authScheme+' '+this.config.apiKey;
    else throw new Error('TME_AUTH_MAPPING_NOT_CONFIGURED');
    if(body!==undefined) requestHeaders['Content-Type']='application/json';
    const res=await fetch(url,{method,headers:requestHeaders,body:body===undefined?undefined:JSON.stringify(body)});
    const text=await res.text();
    let payload=null;
    try{payload=text?JSON.parse(text):null;}catch(_e){payload=text;}
    if(!res.ok){
      const err=new Error('TME_HTTP_'+res.status);
      err.status=res.status;err.payload=payload;throw err;
    }
    return payload;
  }

  async search(query,{offset=0,count=20}={}){
    return this._request('GET',this.config.searchPath,{query:{q:query,offset,count}});
  }

  async getTrack(id){
    return this._request('GET',applyTemplate(this.config.trackPath,{trackId:id,id}));
  }

  async getLyrics(id){
    if(!this.config.lyricsPath) return null;
    return this._request('GET',applyTemplate(this.config.lyricsPath,{trackId:id,id}));
  }

  async getPlayback(id,context={}){
    return this._request('POST',applyTemplate(this.config.playbackPath,{trackId:id,id}),{
      body:{quality:context.quality,country:context.country,deviceId:context.deviceId}
    });
  }
}
module.exports={TmeMusicCloudProvider};

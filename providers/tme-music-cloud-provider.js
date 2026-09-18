const { MusicProvider } = require('./provider-contract');

class TmeMusicCloudProvider extends MusicProvider {
  constructor(config={}){
    super('tme-music-cloud');
    this.config={ baseUrl:config.baseUrl||'', appId:config.appId||'', secretRef:config.secretRef||'' };
  }
  _notConfigured(){ throw new Error('TME_PROVIDER_NOT_CONFIGURED'); }
  async search(){ return this._notConfigured(); }
  async getTrack(){ return this._notConfigured(); }
  async getPlayback(){ return this._notConfigured(); }
  async getLyrics(){ return this._notConfigured(); }
  async rights(){ return this._notConfigured(); }
}
module.exports={TmeMusicCloudProvider};

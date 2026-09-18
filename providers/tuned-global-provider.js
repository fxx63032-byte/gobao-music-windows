const { MusicProvider } = require('./provider-contract');

class TunedGlobalProvider extends MusicProvider {
  constructor(config={}){
    super('tuned-global');
    this.config={ baseUrl:config.baseUrl||'', storeId:config.storeId||'', secretRef:config.secretRef||'' };
  }
  _notConfigured(){ throw new Error('TUNED_GLOBAL_PROVIDER_NOT_CONFIGURED'); }
  async search(){ return this._notConfigured(); }
  async getTrack(){ return this._notConfigured(); }
  async getPlayback(){ return this._notConfigured(); }
  async getLyrics(){ return this._notConfigured(); }
  async rights(){ return this._notConfigured(); }
}
module.exports={TunedGlobalProvider};

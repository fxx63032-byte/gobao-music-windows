# Go宝音乐 V1.0 服务接口约定

在线产品版当前使用 Mock Provider + 浏览器本地数据。正式曲库 API 到位后，前端接口不变，只替换服务适配器。

## 1. MusicProvider

统一能力：
- search(query)
- getTrack(trackId)
- getPlaylists()
- getPlaylist(playlistId)
- charts()
- recommendations(context)
- lyrics(trackId)
- playback(trackId, quality, region)

正式 Provider 适配器需要把 TME / DMH / 其他合法曲库统一映射到：
```json
{
  "id": "provider:track-id",
  "title": "歌曲名",
  "artist": "歌手",
  "album": "专辑",
  "duration": 240,
  "cover": "https://cdn.example/cover.jpg",
  "rights": {
    "stream": true,
    "download": false,
    "regions": ["CN"],
    "expiresAt": "..."
  }
}
```

## 2. 推荐 / AI DJ

建议后端：
- POST /v1/ai-dj/recommend
- POST /v1/recommendations
- GET /v1/radio/:scene

输入包括用户场景、最近播放、收藏、时间段、设备和版权可用范围。输出只返回当前用户所在地区可播放的曲目。

## 3. 用户与歌单

- POST /v1/auth/login
- GET /v1/me
- GET /v1/me/library
- GET /v1/playlists
- POST /v1/playlists
- POST /v1/playlists/:id/tracks
- DELETE /v1/playlists/:id/tracks/:trackId
- POST /v1/likes/:trackId
- DELETE /v1/likes/:trackId
- GET /v1/history

## 4. 播放服务

- POST /v1/playback/token
- GET /v1/tracks/:id/stream
- GET /v1/tracks/:id/lyrics

播放地址应该是短时签名 URL；曲库 Key / Secret 不允许进入 Web、Flutter 或 Windows 客户端。

## 5. 版权服务

每次播放前检查：
- 地区
- 订阅等级
- 播放权
- 下载权
- 音质上限
- 授权过期时间

禁止客户端直接绕过 Rights Service 请求源文件。

## 6. 下载 / 离线

Web 在线版只展示下载状态，不保存受版权保护的正式音频。正式桌面/移动端需由 Provider 授权后实现加密缓存、设备绑定和过期回收。

## 7. 企业部署

建议生产链路：
```
Web / Flutter / Windows
        ↓
CDN + WAF
        ↓
API Gateway
        ↓
Auth / Catalog / Search / Playback / Playlist / Recommendation / AI DJ / Rights / Billing
        ↓
PostgreSQL + Redis + OpenSearch + Kafka
        ↓
Licensed Music Providers
```

生产必须具备：Secret Manager、限流、审计日志、错误监控、指标监控、备份恢复、灰度发布和回滚。

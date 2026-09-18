# Go宝音乐 V0.4 Provider 企业配置

> 原则：所有企业曲库 Secret 只存在 Electron 主进程、服务器环境变量或企业 Secret Manager。渲染层只能读取“已配置/未配置”状态，不会收到 Secret。

## Tuned Global

公开文档确认：
- Catalogue/Search 使用 `StoreId` Header。
- 在线播放需要 OAuth access token，并进行地区/设备/播放权检查。
- Stream Location 返回受权限控制的 HLS 播放地址。

V0.4 环境变量：

```text
GOBAO_TUNED_BASE_URL=
GOBAO_TUNED_STORE_ID=
GOBAO_TUNED_COUNTRY=CN

GOBAO_TUNED_SEARCH_PATH=
GOBAO_TUNED_TRACK_PATH=
GOBAO_TUNED_LYRICS_PATH=
GOBAO_TUNED_STREAM_PATH_TEMPLATE=
```

路径不在源码里猜测。拿到你的正式 Tuned Global Store/API 文档后，把文档中实际路径填入即可。

`GOBAO_TUNED_STREAM_PATH_TEMPLATE` 可使用：
- `{trackId}`
- `{deviceId}`

例如格式（只是模板语法示例，不代表 Tuned Global 的真实 endpoint）：

```text
some/path/devices/{deviceId}/tracks/{trackId}/stream
```

正式播放时 OAuth access token 由用户会话传给主进程，StoreId 仍只保留在主进程。

## TME Music Cloud

腾讯公开官网确认 TME 音乐云面向音乐平台/音乐相关应用提供云端曲库和版权授权，但公开官网没有提供可安全据此实现的完整 API endpoint、签名 Header 和认证协议。

因此 V0.4 不写死任何猜测接口。

环境变量：

```text
GOBAO_TME_BASE_URL=
GOBAO_TME_APP_ID=
GOBAO_TME_API_KEY=

GOBAO_TME_SEARCH_PATH=
GOBAO_TME_TRACK_PATH=
GOBAO_TME_LYRICS_PATH=
GOBAO_TME_PLAYBACK_PATH=

GOBAO_TME_APP_ID_HEADER=
GOBAO_TME_API_KEY_HEADER=
GOBAO_TME_AUTH_SCHEME=
```

拿到 TME 商务技术文档后，根据文档选择：
- AppID 放在哪个 Header；
- API Key / Secret 放在哪个 Header；或
- 是否使用 Authorization + 指定 scheme；
- 是否需要独立签名算法。

如果 TME 使用 HMAC/签名而不是简单 Header/Bearer，必须按正式文档新增 signer，不能猜测。

## 前端诊断

Go宝音乐 V0.4：
- “曲库服务”页面会显示 TME/Tuned 是否已配置；
- 可以选 Provider 后输入歌名测试搜索；
- 前端只能拿到结果和状态；
- Secret 永远不会经 IPC 返回渲染层。

## 生产部署

正式线上建议：

```
Go宝客户端
   ↓
Go宝 API Gateway
   ↓
Provider Service
   ├─ TME Adapter
   └─ Tuned Global Adapter
   ↓
企业 Secret Manager
```

大规模上线时不建议让每台客户端直接持有 B2B 曲库 Secret。Windows 本地 Provider 入口主要用于企业测试和验收，生产应迁移到 Go宝服务端。

# Go宝音乐 Windows V0.4

Go宝音乐 V0.4 在 V0.3 沉浸式音乐平台基础上升级了真正的双 Deck 音频引擎、Windows WorkerW 桌面模式、自定义封面、歌词时间偏移，以及 TME / Tuned Global 企业 Provider 安全接入层。

## V0.4 核心升级

- **双 Deck 真 AutoMix**
  - 两个独立 `<audio>` Deck
  - 两个 WebAudio GainNode
  - 共用 FFT / Analyzer 总线
  - 下一首提前准备到闲置 Deck
  - 结尾时间窗内两首音乐真正重叠播放
  - Deck A 淡出 + Deck B 同时淡入
  - 过渡后自动切换主 Deck并继续预载下一首

- **Windows WorkerW 真桌面模式**
  - 通过 Win32 `Progman / SHELLDLL_DefView / WorkerW / SetParent` 路径挂载
  - F8 快速退出
  - WorkerW 查找或 SetParent 失败时 fail-closed，恢复普通窗口
  - 非 Windows 平台只使用全屏回退模式

- **自定义封面**
  - JPG / PNG / WebP
  - 单图 10MB 安全限制
  - 主进程读取，渲染层只拿 Data URL

- **歌词偏移**
  - -5.0s ~ +5.0s
  - 0.1s 精度
  - 实时更新 LRC 舞台

- **TME Music Cloud Provider**
  - Secret 只在 Electron 主进程 / 服务端环境变量
  - Endpoint 与认证 Header 不猜测、不写死
  - 等 TME 正式商务技术文档后填入真实配置

- **Tuned Global Provider**
  - StoreId Header
  - Country / catalogue search
  - OAuth playback 上下文
  - Stream path / lyrics / track endpoint 可配置
  - 前端可直接做企业凭证后的搜索验收

## 已保留 V0.3 能力

- 紫色黑洞 / 星体 / FFT 实时视觉
- 本地音乐文件夹扫描
- FFmpeg 普通音频自动兼容
- LRC 动态歌词舞台
- 3D 歌单架
- AI DJ
- 视觉预设
- Wallpaper / project.json 素材扫描
- 播放队列
- 电影镜头节奏总线

## 验证

V0.4 自动验证包括：

- JavaScript syntax
- Provider 构造与 Secret 隔离
- Chromium 双 Deck 实际重叠 crossfade
- 自定义封面
- LRC 导入与歌词时间偏移
- Provider 状态 / 搜索诊断
- PowerShell WorkerW 脚本解析
- FFmpeg 音频自检
- electron-builder Windows unpacked 构建
- WorkerW helper 被正确打进 Windows resources

> 注意：GitHub Windows Runner 能验证脚本、打包和资源，但不能替代你的真实 Windows 桌面 Explorer 环境。WorkerW 最终挂到桌面图标后层仍需要在你的 Windows 电脑上做一次实机验收。

## 企业曲库配置

见：
- `docs/provider-config-v0.4.md`
- `docs/provider-env.example.txt`

真实 Secret 不允许提交到 GitHub。

## Windows 构建

GitHub Actions：

`Build GoBao Music Windows V0.4`

下载 Artifact：

`GoBaoMusic-Windows-V0.4`

# Go宝音乐 V0.3 全能力融合说明

本分支将沉浸式桌面音乐播放器常见高级能力统一进 Go宝音乐，但保持 Go宝自己的代码、品牌与商业曲库架构。

## 已集成

- 紫色黑洞 / 星体 / FFT 实时视觉
- 视觉预设：寰宇黑洞、梦幻星云、强节拍、治愈夜空
- 电影镜头节奏总线：Bass / Mid / Treble / Energy 驱动画面轻微镜头脉冲
- LRC 动态歌词舞台
- 本地音乐文件夹扫描
- FFmpeg 自动兼容本地普通音频
- 3D 歌单架
- 播放队列
- AutoMix 自动续播 + 安全淡入淡出
- AI DJ 本地音乐队列生成
- Wallpaper / 视觉素材 project.json 扫描
- Windows 桌面沉浸预览模式，F8 退出
- MusicProvider 抽象
- Local Music Provider
- TME Music Cloud 官方 Provider 适配器占位
- Tuned Global 官方 Provider 适配器占位

## 商业边界

Go宝正式版不会把第三方音乐平台的非官方逆向接口、音频解密器或用户 Cookie 方案作为商业曲库来源。

QQ音乐 / 汽水音乐 / 网易云等正式内容必须通过相应版权方、官方 B2B 服务或合法授权 Provider 接入。

## GPL 边界

本分支没有直接复制 Mineradio 的 GPL 源码，也没有复制其品牌、Logo、界面素材或原创视觉资产。功能按照 Go宝现有架构独立实现。

如果未来要直接复用 GPL 源码，应先决定：
1. Go宝对应发行部分是否接受 GPL-3.0 源码开放义务；或
2. 是否向原作者获得独立商业授权。

## 下一步验证

- Windows Runner 语法检查
- FFmpeg 音频自检
- Provider 模块加载
- electron-builder Windows unpacked 构建
- Windows 实机检查桌面模式、歌词同步、AutoMix 和 3D 歌单交互

## 后续增强

- 双 Deck WebAudio 真正重叠式 AutoMix
- BPM / Beat-map 离线缓存
- 原生 Windows WorkerW 桌面图标后层（必须实机 fail-closed 验证后再启用）
- 自定义封面裁剪
- 歌词时间偏移
- 触控/手势
- TME / Tuned Global 正式 API
- 账户、多端同步、会员、Rights、Billing

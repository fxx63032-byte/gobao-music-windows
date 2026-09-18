# Go宝音乐 Windows V0.3

Go宝音乐 V0.3 已从“单一 3D 黑洞播放器”升级为完整沉浸式音乐平台骨架。

## 已融合能力

- 紫色黑洞 / 星体 / FFT 实时音乐视觉
- 本地音乐单曲导入 + FFmpeg 自动兼容
- 本地音乐文件夹扫描
- LRC 动态歌词舞台
- 3D 歌单架
- 播放队列
- AutoMix 自动续播与安全淡入淡出
- AI DJ 本地音乐队列生成
- Bass / Mid / Treble / Energy 电影镜头驱动
- 多套视觉预设
- Wallpaper / 视觉素材库 project.json 扫描
- Windows 桌面沉浸预览模式，F8 退出
- MusicProvider 统一架构
- Local Music Provider
- TME Music Cloud 官方 Provider 适配器占位
- Tuned Global 官方 Provider 适配器占位

## 商业曲库原则

Go宝正式版不把 QQ音乐、网易云、汽水音乐等非官方逆向接口、Cookie 或音频解密方案作为商业曲库来源。

正式在线曲库走：
- TME Music Cloud 正版授权
- Tuned Global 正版授权
- 其他获得明确商用播放权的 Provider

曲库 Key / Secret 只放服务器端，不进入 Web、Windows、Android 或 iOS 客户端。

## Windows 构建

GitHub Actions 会自动执行：

```
JavaScript syntax
→ FFmpeg 音频自检
→ Provider 模块检查
→ Windows unpacked build
→ NSIS Installer + Portable EXE
```

最终下载 Artifact：

`GoBaoMusic-Windows-V0.3`

## 验证状态

V0.3 融合分支已经通过：
- Fast Verify
- Windows FFmpeg 音频自检
- Provider 模块加载
- electron-builder Windows unpacked 构建

详细融合范围见：`docs/full-integration-v0.3.md`

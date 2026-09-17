# Go宝音乐 Windows V0.2

Windows 桌面播放器工程。V0.2 的重点是把“音乐格式兼容”从用户手里拿走：用户只负责点击 **导入音乐**，后台使用随安装包内置的 FFmpeg 自动准备为 48kHz / 双声道 / PCM16 WAV，再由同一个播放器音频源驱动 FFT 和 3D 视觉。

## V0.2 已修复

- 修复 V0.1 `preparedTracks.set()` 写在 `return` 之后、导致 `gobao-audio://` 播放地址找不到的问题。
- 普通 MP3 / WAV / FLAC / M4A / AAC / OGG / OPUS / WMA 等交给 FFmpeg 自动解码。
- 用户界面不再要求用户判断格式或处理浏览器播放限制。
- 受保护/专有平台下载格式不会尝试破解；以后接正版曲库 API 后自动匹配可播放版本。
- 黑洞主体 Shader 保持当前确认的紫色颜色、形状和比例；外围星球继续响应 Bass / Energy。

## Windows 构建

双击：

- `VERIFY-WINDOWS.bat`：先验证 FFmpeg + 自动解码。
- `BUILD-WINDOWS.bat`：生成 NSIS 安装版和 Portable EXE。

或者推送到 GitHub 后，运行 `.github/workflows/build-windows.yml`，Windows Runner 会自动：下载 FFmpeg → 语法检查 → 音频自检 → 构建 EXE → 上传 Artifact。

## 用户最终体验

```text
打开 Go宝音乐
→ 导入音乐
→ 后台自动解码
→ 播放
→ Bass / Mid / Treble / Energy
→ 黑洞 + 星球实时同步
```

用户不需要知道 MP3、WAV、AAC 等编码细节。

## 当前验证状态

已在当前 Linux 构建环境实际通过：

- JavaScript 语法检查。
- 测试 MP3 → FFmpeg → 48kHz 双声道 PCM16 WAV 转码。
- 输出 RIFF/WAVE 文件头和音频数据检查。

Windows `.exe` 的最终启动/安装验证必须在 Windows Runner 或 Windows 实机完成，工程已提供自动构建工作流。

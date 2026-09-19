# GO宝音乐动态素材库

本目录是主仓库对固定 Mineradio 子模块的增量适配，不是另一套播放器。

## 构建

在仓库根目录执行 `node gobao/apply.cjs`，将本目录 `public/` 复制到 Mineradio 的 public，并按精确锚点注入入口、媒体白名单及节奏响应。脚本可重复执行；上游锚点变化时失败，避免静默漏装。

随后执行 `node gobao/verify.cjs`、`Mineradio/node_modules/.bin/electron.cmd gobao/smoke.cjs`，最后在 Mineradio 中运行 `npm run build:win -- --publish never`。打包后执行 `node gobao/verify.cjs Mineradio/dist/win-unpacked/resources/app/public`。

## 范围

- 四个用户提供的 H.264 MP4 保留原始文件、文件名及 SHA256；缩略图由原片生成。
- 素材库位于视觉设置的背景媒体上方；点击切换、静音循环、完整居中显示，沿用上游设置持久化。
- Beat / Energy 仅改变外围光晕，原视频颜色、形状、比例和中心不修改。不会将视频内部星球宣称为可独立控制的 3D 对象。
- 素材来源为用户提供；本目录不对素材另行授予第三方权利。
- 原 GPL、NOTICE 和上游 attribution 保持不变。此增量代码采用 GPL-3.0-only。
- 本次不恢复被历史迁移移除的黑洞程序，不修改音乐 Provider 或汽水登录流程。

## 验证证据

Windows Electron smoke 通过实际本地 HTTP 服务加载主程序 HTML，检查四段视频解码、时间推进、循环、静音、快速切换、完整显示、设置恢复、清除背景及光晕响应。光晕检查使用确定性输入，不代表真实歌曲端到端节拍精度验收。运行结果和截图写入 `verification/`，由 Actions 上传。

构建产物检查对四段视频逐一比较原始 SHA256，避免只验证源码目录。Release 命令显式指定 GO宝仓库，并将提交短 SHA 写入 tag，避免从子模块目录误发上游或让安装包与 tag 源码错位。

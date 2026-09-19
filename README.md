# GO宝音乐 / Mineradio 2.2.0 品牌适配版

本仓库已按产品决策停止维护原先自研播放器前端与 3D 视觉实现，主程序改为直接使用 **Mineradio 2.2.0**。

## 上游

- 项目：XxHuberrr/Mineradio
- 固定版本：v2.2.0
- 固定提交：`94025664d71a8e6cedbb8eca56309a10ca1e1562`
- 许可证：GPL-3.0-only

本仓库通过 Git submodule 固定上游源码，避免复制后与作者版本漂移。

## 获取完整源码

```bash
git clone --recurse-submodules https://github.com/fxx63032-byte/gobao-music-windows.git
cd gobao-music-windows/Mineradio
npm ci
npm start
```

已经克隆仓库但没有子模块：

```bash
git submodule update --init --recursive
```

## Windows 构建

GitHub Actions 工作流会：

1. Checkout 本仓库和 Mineradio 子模块
2. 安装 Node.js
3. 在 Mineradio 目录执行 `npm ci`
4. 执行 `npm run build:win`
5. 上传 Mineradio Windows 安装包

## 重要授权说明

本版本直接使用 Mineradio GPL-3.0 源码，因此分发该版本时必须遵守 GPL-3.0 的对应源码、许可证和修改说明要求。

Mineradio README 还明确说明：**Mineradio 名称、MR Logo、界面视觉设计与原创视觉表达归作者所有。**
因此当前构建保留 GPL、NOTICE 与上游来源说明；应用运行时名称、快捷方式、安装包名称和应用图标替换为 GO宝音乐自有品牌资产。Mineradio 上游代码来源不会被隐藏。

如果后续希望：
- 改成“Go宝音乐”品牌；
- 替换 MR Logo；
- 闭源商业发行；
- 获得独立商业授权；

应先取得 XxHuberrr / Mineradio 作者的明确授权。

## 音乐平台说明

Mineradio 内含网易云、QQ 音乐等用户自有账号辅助能力，但上游明确说明这些不是官方 B2B 曲库授权。Go宝如果正式商业上线，在线曲库仍应另外签约 TME Music Cloud、Tuned Global 或其他合法版权 Provider。

## GO宝音乐品牌补丁

构建时运行 `branding/apply-gobao-branding.ps1`：

- 应用运行名：GO宝音乐
- Windows 快捷方式：GO宝音乐
- 自有紫黑宇宙环应用图标
- 启动画面文字替换为 GO宝音乐
- 不复用 Mineradio 安装器品牌图片
- 保留 `LICENSE`、`NOTICE.md` 和上游源码来源

汽水音乐登录功能仍来自 Mineradio 的 Qishui Passport bridge，本次品牌修改不删除该 Provider。

## GO宝动态素材库

仓库内置四个 MP4 动态背景。桌面端素材卡片与播放舞台采用三联横屏：只解码一个竖版原片，再把同一视频帧同步绘制为三列，以竖版人物或特效铺满宽屏。手机宽度下自动切换为单画面。选择 GO宝动态背景后，旧粒子、歌词画布和其他壁纸层会隐藏；恢复默认背景后再恢复这些上游视觉层。

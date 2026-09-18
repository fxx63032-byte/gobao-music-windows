# Go宝音乐 / Mineradio 2.2.0 直接集成版

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
因此当前直接集成版保留上游名称/品牌/NOTICE，不擅自把其原创品牌视觉改名成 Go宝。

如果后续希望：
- 改成“Go宝音乐”品牌；
- 替换 MR Logo；
- 闭源商业发行；
- 获得独立商业授权；

应先取得 XxHuberrr / Mineradio 作者的明确授权。

## 音乐平台说明

Mineradio 内含网易云、QQ 音乐等用户自有账号辅助能力，但上游明确说明这些不是官方 B2B 曲库授权。Go宝如果正式商业上线，在线曲库仍应另外签约 TME Music Cloud、Tuned Global 或其他合法版权 Provider。

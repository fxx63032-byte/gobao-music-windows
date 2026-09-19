$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$mineradioRoot = Join-Path $repoRoot 'Mineradio'
$packagePath = Join-Path $mineradioRoot 'package.json'
$indexPath = Join-Path $mineradioRoot 'public\index.html'
$brandIcon = Join-Path $repoRoot 'branding\icon.png'
$targetIcon = Join-Path $mineradioRoot 'build\gobao-icon.png'

if (!(Test-Path $packagePath)) { throw "Mineradio package.json not found: $packagePath" }
if (!(Test-Path $indexPath)) { throw "Mineradio public/index.html not found: $indexPath" }
if (!(Test-Path $brandIcon)) { throw "GO宝音乐 icon not found: $brandIcon" }

Write-Host 'Applying GO宝音乐 branding to pinned Mineradio source...'

Copy-Item $brandIcon $targetIcon -Force

$pkg = Get-Content -Raw -Encoding UTF8 $packagePath | ConvertFrom-Json
$pkg.productName = 'GO宝音乐'
$pkg.author = 'GO宝音乐 (based on Mineradio 2.2.0)'
$pkg.build.appId = 'com.gobao.music'
$pkg.build.productName = 'GO宝音乐'
$pkg.build.win.executableName = 'GOBaoMusic'
$pkg.build.win.icon = 'build/gobao-icon.png'
$pkg.build.nsis.shortcutName = 'GO宝音乐'
$pkg.build.nsis.artifactName = 'GOBaoMusic-${version}-Setup.${ext}'

# Do not reuse upstream installer artwork or afterPack icon injection.
$pkg.build.PSObject.Properties.Remove('afterPack')
$pkg.build.nsis.PSObject.Properties.Remove('installerIcon')
$pkg.build.nsis.PSObject.Properties.Remove('uninstallerIcon')
$pkg.build.nsis.PSObject.Properties.Remove('installerSidebar')
$pkg.build.nsis.PSObject.Properties.Remove('uninstallerSidebar')
$pkg.build.nsis.PSObject.Properties.Remove('installerHeader')
$pkg.build.nsis.PSObject.Properties.Remove('include')

if (-not $pkg.mineradio) {
  $pkg | Add-Member -NotePropertyName mineradio -NotePropertyValue ([pscustomobject]@{})
}
if (-not $pkg.mineradio.PSObject.Properties['runtimeName']) {
  $pkg.mineradio | Add-Member -NotePropertyName runtimeName -NotePropertyValue 'GO宝音乐'
} else {
  $pkg.mineradio.runtimeName = 'GO宝音乐'
}
if (-not $pkg.mineradio.PSObject.Properties['appUserModelId']) {
  $pkg.mineradio | Add-Member -NotePropertyName appUserModelId -NotePropertyValue 'com.gobao.music'
} else {
  $pkg.mineradio.appUserModelId = 'com.gobao.music'
}

$pkgJson = $pkg | ConvertTo-Json -Depth 32
[System.IO.File]::WriteAllText($packagePath, $pkgJson + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))

$html = Get-Content -Raw -Encoding UTF8 $indexPath
$html = $html.Replace('<title>Mineradio</title>', '<title>GO宝音乐</title>')
$html = $html.Replace('aria-label="Mineradio 音乐首页"', 'aria-label="GO宝音乐 音乐首页"')
$html = $html.Replace('当前 Mineradio 数据', '当前 GO宝音乐 数据')
$html = $html.Replace('当前 Mineradio 推荐数据', '当前 GO宝音乐 推荐数据')
$html = $html.Replace('— Mineradio', '— GO宝音乐')

$splashPattern = '(?s)<div class="splash-wordmark" id="splash-wordmark" aria-label="Mineradio">.*?</div>\s*<div class="splash-signal-line">'
$splashReplacement = '<div class="splash-wordmark" id="splash-wordmark" aria-label="GO宝音乐"><span class="splash-word-mine">GO宝</span><span class="splash-word-radio">音乐</span></div>' + [Environment]::NewLine + '        <div class="splash-signal-line">'
$html = [regex]::Replace($html, $splashPattern, $splashReplacement)

[System.IO.File]::WriteAllText($indexPath, $html, (New-Object System.Text.UTF8Encoding($false)))

Write-Host 'GO宝音乐 branding applied.'
Write-Host 'Upstream GPL/NOTICE files are intentionally preserved.'

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$vendor = Join-Path $root 'vendor\ffmpeg\bin'
New-Item -ItemType Directory -Force -Path $vendor | Out-Null

function Copy-RealFfmpegFromPath {
  $ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if (-not $ff) { return $false }
  if ($ff.Source -like '*Chocolatey\bin\ffmpeg.exe') { return $false }
  $fp = Get-Command ffprobe -ErrorAction SilentlyContinue
  Copy-Item $ff.Source (Join-Path $vendor 'ffmpeg.exe') -Force
  if ($fp -and $fp.Source -notlike '*Chocolatey\bin\ffprobe.exe') { Copy-Item $fp.Source (Join-Path $vendor 'ffprobe.exe') -Force }
  Write-Host "FFmpeg copied from real PATH binary: $($ff.Source)"
  return $true
}

if (Copy-RealFfmpegFromPath) { exit 0 }

Write-Host 'Installing FFmpeg with Chocolatey...'
choco install ffmpeg -y --no-progress

$toolsRoot = 'C:\ProgramData\chocolatey\lib\ffmpeg\tools'
$ffmpeg = Get-ChildItem $toolsRoot -Recurse -Filter 'ffmpeg.exe' -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notlike '*\Chocolatey\bin\*' } |
  Sort-Object { $_.FullName.Length } |
  Select-Object -First 1

if (-not $ffmpeg) {
  $alt = 'C:\tools\ffmpeg\bin\ffmpeg.exe'
  if (Test-Path $alt) { $ffmpeg = Get-Item $alt }
}

if (-not $ffmpeg) { throw 'Real ffmpeg.exe not found after Chocolatey install' }

Copy-Item $ffmpeg.FullName (Join-Path $vendor 'ffmpeg.exe') -Force
$ffprobePath = Join-Path $ffmpeg.Directory.FullName 'ffprobe.exe'
if (Test-Path $ffprobePath) { Copy-Item $ffprobePath (Join-Path $vendor 'ffprobe.exe') -Force }

$test = & (Join-Path $vendor 'ffmpeg.exe') -version 2>&1 | Select-Object -First 1
if ($LASTEXITCODE -ne 0) { throw 'Bundled ffmpeg.exe failed version check' }
Write-Host "FFmpeg ready: $vendor"
Write-Host $test

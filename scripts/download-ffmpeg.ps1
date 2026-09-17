$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$vendor = Join-Path $root 'vendor\ffmpeg\bin'
New-Item -ItemType Directory -Force -Path $vendor | Out-Null

function Copy-FromPath {
  $ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if (-not $ff) { return $false }
  $fp = Get-Command ffprobe -ErrorAction SilentlyContinue
  Copy-Item $ff.Source (Join-Path $vendor 'ffmpeg.exe') -Force
  if ($fp) { Copy-Item $fp.Source (Join-Path $vendor 'ffprobe.exe') -Force }
  Write-Host "FFmpeg copied from PATH: $($ff.Source)"
  return $true
}

if (Copy-FromPath) { exit 0 }

Write-Host 'FFmpeg not found on PATH. Installing with Chocolatey...'
choco install ffmpeg -y --no-progress

if (-not (Copy-FromPath)) {
  $candidates = @(
    'C:\ProgramData\chocolatey\bin\ffmpeg.exe',
    'C:\tools\ffmpeg\bin\ffmpeg.exe'
  )
  $ffmpeg = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $ffmpeg) {
    $ffmpeg = Get-ChildItem 'C:\ProgramData\chocolatey' -Recurse -Filter 'ffmpeg.exe' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  }
  if (-not $ffmpeg) { throw 'ffmpeg.exe not found after Chocolatey install' }
  Copy-Item $ffmpeg (Join-Path $vendor 'ffmpeg.exe') -Force
  $ffprobe = Join-Path (Split-Path $ffmpeg -Parent) 'ffprobe.exe'
  if (Test-Path $ffprobe) { Copy-Item $ffprobe (Join-Path $vendor 'ffprobe.exe') -Force }
}

Write-Host "FFmpeg ready: $vendor"

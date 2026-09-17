$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$vendor = Join-Path $root 'vendor\ffmpeg\bin'
New-Item -ItemType Directory -Force -Path $vendor | Out-Null
$tmp = Join-Path $env:TEMP 'gobao-ffmpeg.zip'
$extract = Join-Path $env:TEMP 'gobao-ffmpeg-extract'
if (Test-Path $extract) { Remove-Item -Recurse -Force $extract }
Write-Host 'Downloading FFmpeg essentials build...'
Invoke-WebRequest -UseBasicParsing -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $tmp
Expand-Archive -Path $tmp -DestinationPath $extract -Force
$ffmpeg = Get-ChildItem -Path $extract -Recurse -Filter 'ffmpeg.exe' -File | Select-Object -First 1
$ffprobe = Get-ChildItem -Path $extract -Recurse -Filter 'ffprobe.exe' -File | Select-Object -First 1
if (-not $ffmpeg) { throw 'ffmpeg.exe not found' }
Copy-Item $ffmpeg.FullName (Join-Path $vendor 'ffmpeg.exe') -Force
if ($ffprobe) { Copy-Item $ffprobe.FullName (Join-Path $vendor 'ffprobe.exe') -Force }
Write-Host "FFmpeg ready: $vendor"

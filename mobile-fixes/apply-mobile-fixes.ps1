$ErrorActionPreference = "Stop"

$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetRoot = "C:\project\magic-link-main\mobile"

$copies = @(
  @{
    From = Join-Path $sourceRoot "native-app\App.tsx"
    To = Join-Path $targetRoot "native-app\App.tsx"
  },
  @{
    From = Join-Path $sourceRoot "native-app\src\components\RadioConsole.tsx"
    To = Join-Path $targetRoot "native-app\src\components\RadioConsole.tsx"
  },
  @{
    From = Join-Path $sourceRoot "native-app\src\components\TopBar.tsx"
    To = Join-Path $targetRoot "native-app\src\components\TopBar.tsx"
  },
  @{
    From = Join-Path $sourceRoot "native-app\src\components\RadarPanel.tsx"
    To = Join-Path $targetRoot "native-app\src\components\RadarPanel.tsx"
  },
  @{
    From = Join-Path $sourceRoot "native-app\src\components\GridOverlay.tsx"
    To = Join-Path $targetRoot "native-app\src\components\GridOverlay.tsx"
  },
  @{
    From = Join-Path $sourceRoot "native-app\src\components\AmbientGlow.tsx"
    To = Join-Path $targetRoot "native-app\src\components\AmbientGlow.tsx"
  },
  @{
    From = Join-Path $sourceRoot "native-app\src\components\CustomSlider.tsx"
    To = Join-Path $targetRoot "native-app\src\components\CustomSlider.tsx"
  },
  @{
    From = Join-Path $sourceRoot "native-app\src\hooks\useMagicLinkSocket.ts"
    To = Join-Path $targetRoot "native-app\src\hooks\useMagicLinkSocket.ts"
  },
  @{
    From = Join-Path $sourceRoot "native-app\src\types.ts"
    To = Join-Path $targetRoot "native-app\src\types.ts"
  },
  @{
    From = Join-Path $sourceRoot "native-app\android\app\src\main\java\com\infinitixity\magiclink\MainActivity.kt"
    To = Join-Path $targetRoot "native-app\android\app\src\main\java\com\infinitixity\magiclink\MainActivity.kt"
  },
  @{
    From = Join-Path $sourceRoot "native-app\android\app\src\main\java\com\infinitixity\magiclink\MainApplication.kt"
    To = Join-Path $targetRoot "native-app\android\app\src\main\java\com\infinitixity\magiclink\MainApplication.kt"
  },
  @{
    From = Join-Path $sourceRoot "native-app\android\app\src\main\java\com\infinitixity\magiclink\VolumeButtonModule.kt"
    To = Join-Path $targetRoot "native-app\android\app\src\main\java\com\infinitixity\magiclink\VolumeButtonModule.kt"
  },
  @{
    From = Join-Path $sourceRoot "native-app\android\app\src\main\java\com\infinitixity\magiclink\VolumeButtonPackage.kt"
    To = Join-Path $targetRoot "native-app\android\app\src\main\java\com\infinitixity\magiclink\VolumeButtonPackage.kt"
  },
  @{
    From = Join-Path $sourceRoot "android\app\src\main\java\com\infinitixity\magiclink\MainActivity.java"
    To = Join-Path $targetRoot "android\app\src\main\java\com\infinitixity\magiclink\MainActivity.java"
  }
)

foreach ($copy in $copies) {
  if (!(Test-Path $copy.From)) {
    throw "Missing source file: $($copy.From)"
  }

  $targetDir = Split-Path -Parent $copy.To
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  Copy-Item -LiteralPath $copy.From -Destination $copy.To -Force
  Write-Host "Updated $($copy.To)"
}

$iconFolders = @(
  "mipmap-mdpi",
  "mipmap-hdpi",
  "mipmap-xhdpi",
  "mipmap-xxhdpi",
  "mipmap-xxxhdpi"
)

foreach ($folder in $iconFolders) {
  $fromDir = Join-Path $sourceRoot "native-app\android\app\src\main\res\$folder"
  $toDir = Join-Path $targetRoot "native-app\android\app\src\main\res\$folder"

  if (Test-Path $fromDir) {
    New-Item -ItemType Directory -Force -Path $toDir | Out-Null
    Remove-Item -Path (Join-Path $toDir "ic_launcher*.webp") -Force -ErrorAction SilentlyContinue
    Copy-Item -Path (Join-Path $fromDir "ic_launcher*.png") -Destination $toDir -Force
    Write-Host "Updated native app icons in $toDir"
  }
}

Write-Host "Mobile fixes applied."

$ErrorActionPreference = "Stop"

$sourceRoot = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "android"
$targetRoot = "C:\project\magic-link-main\mobile\admin-android"

if (Test-Path $targetRoot) {
  Remove-Item -LiteralPath $targetRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
Copy-Item -Path (Join-Path $sourceRoot "*") -Destination $targetRoot -Recurse -Force

Write-Host "Admin app copied to $targetRoot"

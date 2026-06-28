#!/usr/bin/env powershell
# Build Android APK locally via Docker, mirroring the CI warm+offline strategy.
#
# First run (or --warm): builds online and saves a local buildx cache.
# Subsequent runs (default): builds offline using the local buildx cache.
#
# Usage:
#   .\build-android-local.ps1                # offline build using cached layers
#   .\build-android-local.ps1 -Warm          # online "warm" build, refreshes cache
#   .\build-android-local.ps1 -Profile production

param(
    [string]$BuildProfile = "preview",
    [switch]$Warm
)

$ErrorActionPreference = "Stop"
$ProjectRoot  = Split-Path $PSScriptRoot -Parent
$CacheDir     = "$ProjectRoot\.ci-cache\android-buildx"
$CacheNew     = "$ProjectRoot\.ci-cache\android-buildx-new"
$ArtifactsDir = "$ProjectRoot\artifacts-local"

# ---- read env vars from eas.json ----
$eas     = Get-Content "$ProjectRoot\eas.json" | ConvertFrom-Json
$env_blk = $eas.build.$BuildProfile.env
if (-not $env_blk) { Write-Error "No env block for profile '$BuildProfile' in eas.json"; exit 1 }

$apiUrl   = $env_blk.EXPO_PUBLIC_API_URL
$kcUrl    = $env_blk.EXPO_PUBLIC_KC_URL
$kcSecret = $env_blk.EXPO_PUBLIC_KC_SECRET

# ---- decide online vs offline ----
$hasCache  = (Test-Path "$CacheDir\index.json")
$goOffline = (-not $Warm) -and $hasCache

Write-Host "=== Android local build ==="
Write-Host "  profile  : $BuildProfile"
Write-Host "  mode     : $(if ($goOffline) { 'OFFLINE (cached layers)' } else { 'ONLINE (downloading)' })"
Write-Host "  cache    : $(if ($hasCache) { $CacheDir } else { 'none yet' })"
Write-Host ""

# ---- use desktop-linux driver (shares daemon layer cache) ----
docker buildx use desktop-linux
Write-Host "Using buildx driver: desktop-linux (shares Docker daemon cache)"

# ---- build ----
$cacheFromArg = @()
if ($hasCache) {
    $cacheFromArg = @("--cache-from", "type=local,src=$CacheDir")
}

$networkArg = @()
if ($goOffline) {
    $networkArg = @("--network", "none")
}

Remove-Item -Recurse -Force $CacheNew -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $ArtifactsDir | Out-Null
New-Item -ItemType Directory -Force (Split-Path $CacheNew) | Out-Null

$buildArgs = @(
    "buildx", "build",
    "--file", "$ProjectRoot\Dockerfile.android",
    "--target", "android-artifacts",
    "--output", "type=local,dest=$ArtifactsDir",
    "--cache-to", "type=local,dest=$CacheNew,mode=max",
    "--build-arg", "EXPO_PUBLIC_API_URL=$apiUrl",
    "--build-arg", "EXPO_PUBLIC_KC_URL=$kcUrl",
    "--build-arg", "EXPO_PUBLIC_KC_SECRET=$kcSecret",
    "--build-arg", "GOOGLE_MAVEN_REPOSITORY=https://maven.aliyun.com/repository/google",
    "--build-arg", "MAVEN_CENTRAL_REPOSITORY=https://maven.aliyun.com/repository/public",
    "--build-arg", "GRADLE_PLUGIN_REPOSITORY=https://maven.aliyun.com/repository/gradle-plugin"
) + $cacheFromArg + $networkArg + @($ProjectRoot)

Write-Host "Running: docker $($buildArgs -join ' ')"
Write-Host ""

& docker @buildArgs
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    # rotate cache: new → current
    if (Test-Path $CacheNew) {
        Remove-Item -Recurse -Force $CacheDir -ErrorAction SilentlyContinue
        Rename-Item $CacheNew $CacheDir
        Write-Host "Cache updated: $CacheDir"
    }

    Write-Host ""
    Write-Host "Build complete. Artifacts:"
    Get-ChildItem $ArtifactsDir -Filter "*.apk" | ForEach-Object {
        Write-Host "  $($_.FullName)  ($([math]::Round($_.Length/1MB,1)) MB)"
    }
} else {
    Write-Error "Build failed (exit $exitCode)"
    exit $exitCode
}

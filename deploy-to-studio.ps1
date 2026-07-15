# Mirrors this app into the StudioDecorApp GitHub repo, bumps the service
# worker cache version so installed iPads pick up the change, and pushes
# to GitHub Pages. Run via "Deploy to iPad.bat" (double-click), not directly.

$ErrorActionPreference = "Stop"

$source = $PSScriptRoot
$dest = "C:\Users\lohit\OneDrive\Documents\GitHub\StudioDecorApp"

if (-not (Test-Path $dest)) {
    Write-Host "StudioDecorApp repo not found at $dest" -ForegroundColor Red
    exit 1
}

# --- Bump the service worker cache version so installed iPads see the update ---
$swPath = Join-Path $source "sw.js"
$swContent = Get-Content $swPath -Raw
if ($swContent -match 'const CACHE_VERSION = "dmn-v(\d+)";') {
    $nextVersion = [int]$Matches[1] + 1
    $swContent = $swContent -replace 'const CACHE_VERSION = "dmn-v\d+";', "const CACHE_VERSION = ""dmn-v$nextVersion"";"
    Set-Content -Path $swPath -Value $swContent -NoNewline
    Write-Host "Bumped CACHE_VERSION to dmn-v$nextVersion" -ForegroundColor Cyan
} else {
    Write-Host "Could not find CACHE_VERSION in sw.js - skipping version bump." -ForegroundColor Yellow
}

# --- Mirror this app's files into the StudioDecorApp repo, keeping its .git ---
Write-Host "Copying files into $dest ..."
robocopy $source $dest /MIR /XD .git .claude /NFL /NDL /NP /NJH /NJS
if ($LASTEXITCODE -ge 8) {
    Write-Host "robocopy failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

# --- Commit and push ---
Push-Location $dest
try {
    git add -A

    $staged = git diff --cached --name-only
    if (-not $staged) {
        Write-Host "No changes to deploy - StudioDecorApp already matches this app." -ForegroundColor Yellow
        exit 0
    }

    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "Deploy update $stamp" | Out-Null
    git push origin main

    Write-Host ""
    Write-Host "Deployed. Live in a minute or two at:" -ForegroundColor Green
    Write-Host "https://lohithhebbur.github.io/StudioDecorApp/" -ForegroundColor Green
} finally {
    Pop-Location
}

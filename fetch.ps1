$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$releaseCliPath = Join-Path $scriptDir 'tools\fetch-cli.cjs'
$devCliPath = Join-Path $scriptDir 'dist\tools\fetch-cli.cjs'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error '[Fetch] Node.js is required but was not found in PATH.'
  exit 1
}

if (Test-Path $releaseCliPath) {
  $cliPath = $releaseCliPath
} elseif (Test-Path $devCliPath) {
  $cliPath = $devCliPath
} else {
  Write-Error "[Fetch] Missing runtime CLI at $releaseCliPath (release) and $devCliPath (dev). Build it with: npm run build:fetch-cli"
  exit 1
}

& node $cliPath @args
exit $LASTEXITCODE


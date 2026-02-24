$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cliPath = Join-Path $scriptDir 'dist-tools\fetch-cli.cjs'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error '[Fetch] Node.js is required but was not found in PATH.'
  exit 1
}

if (-not (Test-Path $cliPath)) {
  Write-Error "[Fetch] Missing runtime CLI at $cliPath. Build it with: npm run build:fetch-cli"
  exit 1
}

& node $cliPath @args
exit $LASTEXITCODE


# run-tests.ps1 - single entry point for the MCP regression suite.
# Usage:
#   .\run-tests.ps1 -Exe "C:\path\to\AI-Fbowser-Mcp.exe" [-Suite all|sweep|frames|transport|pool|cdp] [-PerCall 30000]
# Exit code: 0 = all passed, 1 = failures (or 2 = bad arguments).
# ASCII-only on purpose: Windows PowerShell 5.1 reads non-BOM UTF-8 as ANSI and mangles Chinese.
param(
    [Parameter(Mandatory = $true)][string]$Exe,
    [ValidateSet('all', 'sweep', 'frames', 'transport', 'pool', 'cdp', 'matrix', 'soak')][string]$Suite = 'all',
    [int]$PerCall = 30000,
    [int]$Minutes = 5
)
$ErrorActionPreference = 'Continue'

if (-not (Test-Path -LiteralPath $Exe)) { Write-Host "[FATAL] exe not found: $Exe" -ForegroundColor Red; exit 2 }
$node = (Get-Command node -ErrorAction SilentlyContinue)
if (-not $node) { Write-Host "[FATAL] node.js not found in PATH" -ForegroundColor Red; exit 2 }

$suitePath = Join-Path $PSScriptRoot 'tests\mcp-suite.mjs'
if (-not (Test-Path -LiteralPath $suitePath)) { Write-Host "[FATAL] suite not found: $suitePath" -ForegroundColor Red; exit 2 }

Write-Host "=== Xiaodao MCP regression suite ===" -ForegroundColor Cyan
Write-Host "  exe   : $Exe"
Write-Host "  md5   : $((Get-FileHash -LiteralPath $Exe -Algorithm MD5).Hash)"
Write-Host "  suite : $Suite"
Write-Host ""

& node $suitePath --exe $Exe --suite $Suite --per-call $PerCall --minutes $Minutes
$code = $LASTEXITCODE

Write-Host ""
if ($code -eq 0) { Write-Host "=== RESULT: PASS ===" -ForegroundColor Green } else { Write-Host "=== RESULT: FAIL (exit $code) ===" -ForegroundColor Red }
exit $code

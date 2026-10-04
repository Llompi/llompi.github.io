# One-time setup, run at the computer itself (not through Claude):
#
#   powershell -ExecutionPolicy Bypass -File tools\setup-1password.ps1
#
# Stores a 1Password service account token as a Windows user environment
# variable, so `op read` works in Claude Code sessions you drive from your
# phone without a Windows Hello prompt on this screen.
#
# The token is typed here with masked input. It never passes through Claude,
# a chat, or a command line. Give the service account read access to one
# vault that holds only this site's secrets.

$ErrorActionPreference = "Stop"

$op = Get-Command op -ErrorAction SilentlyContinue
if (-not $op) {
  $link = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\op.exe"
  if (Test-Path $link) { $op = $link } else {
    Write-Host "The 1Password CLI isn't installed. Run: winget install --id AgileBits.1Password.CLI -e"
    exit 1
  }
}

Write-Host "Paste the 1Password service account token (input is hidden), then press Enter."
$secure = Read-Host "Token" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if (-not $token.StartsWith("ops_")) {
  Write-Host "That doesn't look like a service account token (they start with ops_). Nothing was saved."
  exit 1
}

# Check it works before saving it
$env:OP_SERVICE_ACCOUNT_TOKEN = $token
$vaults = & $op vault list --format json 2>$null | ConvertFrom-Json
if (-not $vaults) {
  Write-Host "1Password rejected the token, or it has no vault access. Nothing was saved."
  exit 1
}

[Environment]::SetEnvironmentVariable("OP_SERVICE_ACCOUNT_TOKEN", $token, "User")
$token = $null

Write-Host ""
Write-Host "Saved. The service account can read these vaults:"
$vaults | ForEach-Object { Write-Host ("  " + $_.name) }
Write-Host ""
Write-Host "Restart Claude Code (exit, then 'claude remote-control' in this folder) so it sees the new variable."
Write-Host "Then, from your phone: /secrets setup"

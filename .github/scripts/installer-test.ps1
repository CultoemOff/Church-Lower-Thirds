# Shared by the installer test steps of .github/workflows/installer.yml. The test is split
# in steps so that, when one of them hangs, GitHub shows which one.
$exe = "installer\output\Church-Lower-Thirds-Setup.exe"
$dir = Join-Path $env:ProgramFiles 'Culto em Off\Church Lower Thirds'
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
$userKey = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{13D055BB-63D1-484E-820B-004089D86007}_is1'
$base = 'http://127.0.0.1:8795'
# Waits for the installer only. Start-Process -Wait would also wait for the server
# the installer leaves running, forever.
function Run-Setup([string[]]$Arguments) {
  $p = Start-Process $exe -ArgumentList $Arguments -PassThru
  $null = $p.Handle
  if (-not $p.WaitForExit(300000)) { throw "Installer did not finish" }
  $p.ExitCode
}
# The folder chosen in the installer (Documents by default) and the one the test moves to.
$files = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Church Lower Thirds'
$other = Join-Path $env:RUNNER_TEMP 'Mídia da Igreja\Lower Third'
function Wait-Server {
  $h = $null
  for ($i = 0; $i -lt 40 -and -not $h; $i++) {
    Start-Sleep -Milliseconds 500
    try { $h = Invoke-RestMethod "$base/api/health" } catch {}
  }
  if (-not $h) { throw "Server did not come back" }
}

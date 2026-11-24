# Stops the Church Lower Thirds server that runs from the given install folder. Used by the
# installer before upgrading and before uninstalling, so files are not locked.
param([Parameter(Mandatory = $true)][string]$AppDir)

$target = Join-Path $AppDir 'runtime\node.exe'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ExecutablePath -and ($_.ExecutablePath -eq $target) } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

exit 0

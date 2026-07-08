$port = 8081
$connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if ($connection) {
    $pidToKill = $connection.OwningProcess
    $procName = (Get-Process -Id $pidToKill -ErrorAction SilentlyContinue).ProcessName
    Write-Host "Port $port is currently in use by process ID $pidToKill ($procName)." -ForegroundColor Yellow
    Write-Host "Automatically terminating old instance..." -ForegroundColor Yellow
    Stop-Process -Id $pidToKill -Force
    Write-Host "Process $pidToKill has been terminated." -ForegroundColor Green
    Start-Sleep -Seconds 1
}

Write-Host "Starting LlamaProxy..." -ForegroundColor Cyan
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -Path "$scriptPath\backend"
.\mvnw clean spring-boot:run

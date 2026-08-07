# ============================================================
#  CondoSmart - Demo Startup Script
#  Abre el IoT Simulator y el Web Dashboard en paralelo
# ============================================================

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "           CondoSmart - Iniciando Demo                " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Abrir IoT Simulator
Write-Host "Iniciando IoT Simulator (puerto 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\iot-simulator'; node websocket-server.js"

# 2. Esperar 2 segundos para que el servidor levante
Start-Sleep -Seconds 2

# 3. Abrir Web Dashboard
Write-Host "Iniciando Web Dashboard..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\web-dashboard'; npm run dev"

# 4. Esperar un momento para que Vite arranque
Start-Sleep -Seconds 3

# 5. Mostrar informacion de acceso
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  CondoSmart esta iniciando..." -ForegroundColor Green
Write-Host ""
Write-Host "  URL:  http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "  Credenciales de Demo:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Super Admin" -ForegroundColor Magenta
Write-Host "     superadmin@condosmart.do" -ForegroundColor White
Write-Host "     CondoSmart2026!" -ForegroundColor Gray
Write-Host ""
Write-Host "  Admin de Residencial" -ForegroundColor Blue
Write-Host "     admin@laspalmas.do" -ForegroundColor White
Write-Host "     CondoSmart2026!" -ForegroundColor Gray
Write-Host ""
Write-Host "  Inquilino" -ForegroundColor Green
Write-Host "     maria@laspalmas.do" -ForegroundColor White
Write-Host "     CondoSmart2026!" -ForegroundColor Gray
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

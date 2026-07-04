@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

for %%P in (3001 5173) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    echo Encerrando processo %%I na porta %%P...
    taskkill /PID %%I /F >nul 2>nul
  )
)

if not exist "%BACKEND_DIR%" (
  echo Pasta backend nao encontrada em "%BACKEND_DIR%"
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%" (
  echo Pasta frontend nao encontrada em "%FRONTEND_DIR%"
  pause
  exit /b 1
)

start "NFL + NBA Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && npm run dev"
start "NFL + NBA Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo Backend e frontend estao sendo iniciados.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
endlocal

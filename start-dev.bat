@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_PORT=3001"
set "FRONTEND_PORT=5173"
set "LOCAL_URL=http://localhost:%FRONTEND_PORT%/nfl"

title NFL + NBA - Inicializador local

echo.
echo ========================================
echo   NFL + NBA Tracker - Ambiente local
echo ========================================
echo.

if not exist "%BACKEND_DIR%\package.json" (
  echo ERRO: backend\package.json nao foi encontrado.
  goto :failed
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo ERRO: frontend\package.json nao foi encontrado.
  goto :failed
)

where node.exe >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado no PATH.
  echo Instale o Node.js e execute este arquivo novamente.
  goto :failed
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo ERRO: npm nao foi encontrado no PATH.
  echo Reinstale o Node.js com o npm e tente novamente.
  goto :failed
)

if not exist "%BACKEND_DIR%\node_modules\express\package.json" (
  echo Instalando dependencias do backend...
  pushd "%BACKEND_DIR%"
  call npm.cmd ci
  if errorlevel 1 (
    popd
    echo ERRO: nao foi possivel instalar as dependencias do backend.
    goto :failed
  )
  popd
  echo.
)

if not exist "%FRONTEND_DIR%\node_modules\.bin\vite.cmd" (
  echo Instalando dependencias do frontend...
  pushd "%FRONTEND_DIR%"
  call npm.cmd ci
  if errorlevel 1 (
    popd
    echo ERRO: nao foi possivel instalar as dependencias do frontend.
    goto :failed
  )
  popd
  echo.
)

call :is_port_listening %BACKEND_PORT%
if errorlevel 1 (
  echo Iniciando backend na porta %BACKEND_PORT%...
  start "NFL + NBA Backend" cmd.exe /d /k "cd /d ""%BACKEND_DIR%"" && npm.cmd run dev"
) else (
  echo A porta %BACKEND_PORT% ja esta em uso. O backend existente sera reutilizado.
)

call :is_port_listening %FRONTEND_PORT%
if errorlevel 1 (
  echo Iniciando frontend na porta %FRONTEND_PORT%...
  start "NFL + NBA Frontend" cmd.exe /d /k "cd /d ""%FRONTEND_DIR%"" && npm.cmd run dev"
) else (
  echo A porta %FRONTEND_PORT% ja esta em uso. O frontend existente sera reutilizado.
)

echo Aguardando o backend...
call :wait_for_port %BACKEND_PORT% 60
if errorlevel 1 (
  echo ERRO: o backend nao abriu a porta %BACKEND_PORT% em 60 segundos.
  goto :failed
)

powershell.exe -NoLogo -NoProfile -Command "try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:%BACKEND_PORT%/api/health' -TimeoutSec 5; if ($health.status -eq 'online') { exit 0 } } catch {}; exit 1" >nul 2>&1
if errorlevel 1 (
  echo ERRO: a porta %BACKEND_PORT% esta ocupada, mas a API esperada nao respondeu.
  goto :failed
)

echo Aguardando o frontend...
call :wait_for_port %FRONTEND_PORT% 60
if errorlevel 1 (
  echo ERRO: o frontend nao abriu a porta %FRONTEND_PORT% em 60 segundos.
  goto :failed
)

echo.
echo Ambiente local iniciado com sucesso.
echo Backend: http://localhost:%BACKEND_PORT%
echo Frontend: http://localhost:%FRONTEND_PORT%
echo Pagina NFL: %LOCAL_URL%
echo.
echo Abrindo o navegador...
start "" "%LOCAL_URL%"

endlocal
exit /b 0

:is_port_listening
netstat -ano -p tcp | findstr /R /C:":%~1 .*LISTENING" >nul 2>&1
exit /b %errorlevel%

:wait_for_port
set /a "WAITED_SECONDS=0"
:wait_for_port_loop
call :is_port_listening %~1
if not errorlevel 1 exit /b 0
if !WAITED_SECONDS! geq %~2 exit /b 1
set /a "WAITED_SECONDS+=1"
timeout /t 1 /nobreak >nul
goto :wait_for_port_loop

:failed
echo.
echo A inicializacao local nao foi concluida.
echo Verifique a mensagem acima e tente novamente.
echo.
pause
endlocal
exit /b 1

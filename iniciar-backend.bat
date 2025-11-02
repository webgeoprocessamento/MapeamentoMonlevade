@echo off
echo ================================================
echo   Iniciando Servidor Backend
echo ================================================
echo.

REM Verificar Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js de https://nodejs.org/
    pause
    exit /b 1
)

cd server

REM Instalar dependencias se necessario
if not exist node_modules (
    echo [INFO] Instalando dependencias...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERRO] Falha ao instalar dependencias
        pause
        exit /b 1
    )
)

REM Inicializar banco se necessario
if not exist database.sqlite (
    echo [INFO] Inicializando banco de dados...
    call npm run init-db
)

echo.
echo ================================================
echo   Servidor Backend - Porta 3000
echo ================================================
echo.
echo API disponivel em: http://localhost:3000/api
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

call npm start

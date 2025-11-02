@echo off
echo ================================================
echo   Sistema de Mapeamento de Dengue - GIS
echo ================================================
echo.

REM Verificar se Node.js está instalado
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js de https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
echo.

REM Entrar na pasta do servidor
cd server

REM Verificar se node_modules existe
if not exist node_modules (
    echo [INFO] Instalando dependencias do backend...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERRO] Falha ao instalar dependencias
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas
) else (
    echo [OK] Dependencias ja instaladas
)

REM Verificar se banco de dados existe
if not exist database.sqlite (
    echo [INFO] Inicializando banco de dados...
    call npm run init-db
    if %ERRORLEVEL% NEQ 0 (
        echo [ERRO] Falha ao inicializar banco de dados
        pause
        exit /b 1
    )
    echo [OK] Banco de dados inicializado
) else (
    echo [OK] Banco de dados ja existe
)

echo.
echo ================================================
echo   Iniciando servidor backend...
echo ================================================
echo.
echo O servidor backend sera iniciado em uma nova janela.
echo Acesse: http://localhost:8000
echo.
echo Credenciais:
echo   Admin: admin@dengue.local / admin123
echo   Operador: operador@dengue.local / operador123
echo.
echo Pressione qualquer tecla para continuar...
pause >nul

REM Iniciar servidor backend em nova janela
start "Backend - Porta 3000" cmd /k "npm start"

REM Voltar para pasta raiz
cd ..

REM Aguardar alguns segundos para o backend iniciar
timeout /t 5 /nobreak >nul

REM Iniciar servidor frontend em nova janela
echo.
echo ================================================
echo   Iniciando servidor frontend...
echo ================================================
echo.

start "Frontend - Porta 8000" cmd /k "python -m http.server 8000 || php -S localhost:8000 || echo Abra index.html diretamente no navegador se nenhum servidor funcionar"

REM Aguardar servidor iniciar
timeout /t 3 /nobreak >nul

REM Abrir navegador
echo Abrindo navegador...
start http://localhost:8000

echo.
echo ================================================
echo   Aplicacao iniciada!
echo ================================================
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:8000
echo.
echo Duas janelas foram abertas:
echo   1. Backend (porta 3000) - Mantenha aberta
echo   2. Frontend (porta 8000) - Mantenha aberta
echo.
echo O navegador deve abrir automaticamente.
echo Se nao abrir, acesse manualmente: http://localhost:8000
echo.
pause

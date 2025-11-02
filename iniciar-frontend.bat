@echo off
echo ================================================
echo   Iniciando Servidor Frontend
echo ================================================
echo.

REM Tentar Python primeiro
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python encontrado - usando servidor Python
    echo Servidor rodando em: http://localhost:8000
    echo.
    echo Pressione Ctrl+C para parar o servidor
    echo.
    python -m http.server 8000
    exit /b
)

REM Tentar PHP
where php >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] PHP encontrado - usando servidor PHP
    echo Servidor rodando em: http://localhost:8000
    echo.
    echo Pressione Ctrl+C para parar o servidor
    echo.
    php -S localhost:8000
    exit /b
)

REM Tentar Node.js http-server
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js encontrado - usando http-server
    echo Instalando http-server globalmente (se necessario)...
    call npm install -g http-server 2>nul
    echo Servidor rodando em: http://localhost:8000
    echo.
    echo Pressione Ctrl+C para parar o servidor
    echo.
    call http-server -p 8000
    exit /b
)

REM Se nada funcionar, apenas abrir o arquivo
echo [AVISO] Nenhum servidor encontrado.
echo Abrindo index.html diretamente...
echo.
echo NOTA: Para melhor funcionamento, use um servidor HTTP local.
echo Instale Python, PHP ou Node.js.
echo.
start index.html
pause

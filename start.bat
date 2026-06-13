@echo off
chcp 65001 >nul
title 语音猜干员 - 开发模式

echo ========================================
echo   语音猜干员 - 开发模式
echo ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Node.js not found, installing...
    where winget >nul 2>nul
    if %errorlevel% equ 0 (
        winget install OpenJS.NodeJS.LTS
    ) else (
        echo Please install Node.js from https://nodejs.org
        pause
        exit /b 1
    )
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

echo Node.js version:
node -v
echo.
echo Starting dev server...
echo Open http://localhost:5173 in browser
echo.

:: Install deps if needed
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

:: Start Vite dev server
npx vite --host 0.0.0.0
pause

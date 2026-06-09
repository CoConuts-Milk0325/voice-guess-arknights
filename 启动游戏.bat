@echo off
cd /d "%~dp0"

if not exist "node_modules" (
    echo First run, installing dependencies...
    npm install
)

echo Starting dev server...
echo Open http://localhost:5173 in browser
echo.

npm run dev

pause

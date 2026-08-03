@echo off
setlocal
cd /d "%~dp0"

where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama is not installed.
  echo Download it from https://ollama.com/download
  pause
  exit /b 1
)

echo.
echo Downloading the recommended free NICH model...
ollama pull qwen3.5:4b
if errorlevel 1 (
  echo Failed to download qwen3.5:4b.
  pause
  exit /b 1
)

if not exist ".env.local" (
  copy ".env.example" ".env.local" >nul
  echo Created .env.local
) else (
  echo .env.local already exists. It was not overwritten.
)

echo.
echo Installing project packages...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

echo.
echo Free AI setup is complete.
echo Run: npm run dev
echo Then open: http://localhost:3000
pause

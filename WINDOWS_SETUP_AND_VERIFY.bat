@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo CSBT Hub - Windows dependency setup and verification
echo ============================================================
echo.

echo [1/6] Closing stale Node/workerd processes if present...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM workerd.exe >nul 2>&1

echo [2/6] Removing generated build/install folders...
if exist node_modules rmdir /S /Q node_modules
if exist .next rmdir /S /Q .next
if exist .open-next rmdir /S /Q .open-next
if exist .wrangler rmdir /S /Q .wrangler

echo [3/6] Installing exact dependencies from package-lock.json...
call npm.cmd ci --include=dev --no-audit --no-fund
if errorlevel 1 goto :fail

if not exist node_modules\.bin\next.cmd (
  echo ERROR: Next.js was not installed correctly.
  goto :fail
)
if not exist node_modules\.bin\eslint.cmd (
  echo ERROR: ESLint was not installed correctly.
  goto :fail
)

echo [4/6] Running tests...
call npm.cmd test
if errorlevel 1 goto :fail

echo [5/6] Running lint...
call npm.cmd run lint
if errorlevel 1 goto :fail

echo [6/6] Running production build...
call npm.cmd run build
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo SUCCESS: dependencies, tests, lint, and build all passed.
echo You can now run: npm.cmd run preview
echo Then deploy with: npm.cmd run deploy
echo ============================================================
exit /b 0

:fail
echo.
echo ============================================================
echo SETUP/VERIFY FAILED.
echo Copy the error shown above and send it to ChatGPT.
echo ============================================================
exit /b 1

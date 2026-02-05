@echo off
echo ========================================
echo NexoGenix CRM - EXE Builder
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo After installation, run this script again.
    echo.
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

REM Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not available!
    echo Please reinstall Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo npm found:
npm --version
echo.

REM Navigate to script directory
cd /d "%~dp0"

echo ========================================
echo Step 1: Installing dependencies...
echo This may take a few minutes...
echo ========================================
echo.

call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install dependencies!
    echo Please check your internet connection and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 2: Building Windows installer...
echo This may take 5-10 minutes...
echo ========================================
echo.

call npm run build:win
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed!
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Build completed!
echo ========================================
echo.
echo Your installer is ready in the 'dist' folder:
dir /b dist\*.exe 2>nul
echo.
echo You can now:
echo 1. Run the installer to install NexoGenix CRM
echo 2. Share the .exe file with others
echo 3. Optionally uninstall Node.js if you don't need it
echo.
echo Opening dist folder...
start dist
echo.
pause

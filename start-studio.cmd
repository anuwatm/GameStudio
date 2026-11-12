@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 exit /b 1

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js / npm not found. Install Node.js 22.12 or newer.
    popd
    exit /b 1
)

if not exist "studio\node_modules\vite\bin\vite.js" (
    echo Dependencies missing. Run: npm --prefix studio ci
    popd
    exit /b 1
)

echo Starting StoryFlow Web Studio...
echo Open the Local URL printed below in Chrome or Edge.
echo Press Ctrl+C to stop.
call npm.cmd --prefix studio run dev -- %*
set "studio_exit=%errorlevel%"
popd
exit /b %studio_exit%

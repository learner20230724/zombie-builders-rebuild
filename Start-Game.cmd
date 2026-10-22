@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0"
if exist "%~dp0node\node.exe" (
  set "NODE_EXE=%~dp0node\node.exe"
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Node.js 20 or newer is required for the web package.
    echo Use the windows-x64 release for the bundled, no-install runtime.
    pause
    exit /b 1
  )
  set "NODE_EXE=node"
)
echo Open the local URL printed below in your browser.
echo Keep this window open while playing. Press Ctrl+C to stop.
"%NODE_EXE%" "%~dp0scripts\server.mjs"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" pause
exit /b %EXIT_CODE%

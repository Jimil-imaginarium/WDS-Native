@echo off
REM ─────────────────────────────────────────────────────────────────────
REM WDS Vision — native Windows launcher
REM Opens two terminal windows: one for the Python server, one for Vite.
REM ─────────────────────────────────────────────────────────────────────

cd /d "%~dp0"

REM ── Sanity checks ────────────────────────────────────────────────────
if not exist "venv\Scripts\python.exe" (
    echo [setup] virtualenv not found — creating one...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: could not create venv. Install Python 3.10+ first.
        pause
        exit /b 1
    )
    call venv\Scripts\activate.bat
    pip install --upgrade pip
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: pip install failed.
        pause
        exit /b 1
    )
)

if not exist "web\node_modules" (
    echo [setup] npm dependencies not found — installing...
    pushd web
    call npm install
    popd
    if errorlevel 1 (
        echo ERROR: npm install failed. Install Node 20+ first.
        pause
        exit /b 1
    )
)

REM ── Launch both servers in their own windows ─────────────────────────
echo Launching FastAPI server (http://127.0.0.1:8000)...
start "WDS Server" cmd /k "cd /d %~dp0 && venv\Scripts\activate.bat && python server.py"

REM Give the server 3 s so the admin password banner is visible before Vite spam
timeout /t 3 /nobreak >nul

echo Launching Vite dev server (http://127.0.0.1:5173)...
start "WDS Web" cmd /k "cd /d %~dp0\web && npm run dev"

echo.
echo ─────────────────────────────────────────────────────────
echo  WDS Vision is starting!
echo.
echo  Server : http://127.0.0.1:8000
echo  Web    : http://127.0.0.1:5173
echo.
echo  Look at the "WDS Server" window for the one-time admin password.
echo  Close that window to stop the server.
echo ─────────────────────────────────────────────────────────
echo.
pause

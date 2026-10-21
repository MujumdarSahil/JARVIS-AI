# Starts the JARVIS FastAPI Backend on 127.0.0.1:8000
$ErrorActionPreference = "Stop"
Write-Host "[JARVIS] Starting FastAPI backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
& ".\backend\.venv\Scripts\python.exe" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

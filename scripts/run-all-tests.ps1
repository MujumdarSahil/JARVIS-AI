# Runs both backend and frontend test suites
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Running JARVIS Backend Pytest Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
& ".\backend\.venv\Scripts\pytest.exe" -c pyproject.toml

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Running JARVIS Frontend Vitest Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Set-Location frontend
npm run test
Set-Location ..

Write-Host "`n[JARVIS] All Phase 2 test suites completed successfully!" -ForegroundColor Green

# Starts the JARVIS Next.js Frontend on http://localhost:3000
$ErrorActionPreference = "Stop"
Write-Host "[JARVIS] Starting Next.js frontend on http://localhost:3000 ..." -ForegroundColor Cyan
Set-Location frontend
npm run dev

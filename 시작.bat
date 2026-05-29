@echo off
echo [Weekly Board] 서버 시작 중...

:: 백엔드 서버
start "백엔드 (Google Sheets API)" cmd /k "cd /d "%~dp0backend" && node server.js"

:: 잠깐 대기 후 프론트엔드
timeout /t 3 /nobreak > nul
start "프론트엔드 (React)" cmd /k "cd /d "%~dp0" && npm run dev"

:: 브라우저 열기
timeout /t 5 /nobreak > nul
start http://localhost:5173

echo 브라우저가 자동으로 열립니다.

@echo off
REM Sync environment variables to Vercel (run after: npx vercel login && npx vercel link)
echo.
echo === Bayt Ward - Vercel Environment Setup ===
echo.
echo Prerequisites:
echo   1. npx vercel login
echo   2. npx vercel link
echo.
echo This script reads .env and pushes vars to Vercel.
echo.

if not exist .env (
  echo ERROR: .env file not found
  exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  set "KEY=%%A"
  set "VAL=%%B"
  setlocal EnableDelayedExpansion
  set "KEY=!KEY:"=!"
  set "VAL=!VAL:"=!"
  if not "!KEY!"=="" if not "!KEY:~0,1!"=="#" (
    echo Adding !KEY! ...
    echo !VAL!| npx vercel env add !KEY! production --force
    echo !VAL!| npx vercel env add !KEY! preview --force
    echo !VAL!| npx vercel env add !KEY! development --force
  )
  endlocal
)

echo.
echo Done. Redeploy: npx vercel --prod
echo.

@echo off
REM ============================================================
REM  QuickBite billing counter - one-click silent printing
REM ============================================================
REM  Opens the counter in its own Chrome window with --kiosk-printing,
REM  so bills and token slips print straight to the Windows DEFAULT
REM  printer without the print dialog.
REM
REM  Setup once on the counter PC:
REM   1. Set the thermal printer as the default printer in Windows.
REM   2. Put a shortcut to this file on the desktop.
REM
REM  Usage:  start-counter.bat [counter URL]
REM          start-counter.bat https://app.yourhotel.in/pos
REM ============================================================

set "COUNTER_URL=http://localhost:5173/pos"
if not "%~1"=="" set "COUNTER_URL=%~1"

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
    echo Google Chrome was not found. Install Chrome and try again.
    pause
    exit /b 1
)

REM A separate profile is required - kiosk printing is ignored if Chrome is already open with the normal profile
start "" "%CHROME%" --kiosk-printing --user-data-dir="%LOCALAPPDATA%\QuickBiteCounter" --app="%COUNTER_URL%"

@echo off
setlocal EnableExtensions DisableDelayedExpansion

rem Launch from this script's own folder; supports being called from PowerShell.
set "SCRIPT=%~dp0Upgrade-AJInstitutional-Dependencies.ps1"

where pwsh.exe >nul 2>&1
if errorlevel 1 goto :missing_pwsh
if not exist "%SCRIPT%" goto :missing_script

pwsh.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
set "RESULT=%ERRORLEVEL%"
if "%RESULT%"=="0" goto :success

echo.
echo Dependency upgrade failed with exit code %RESULT%.
echo Review the backup directory and upgrade.log printed by PowerShell.
pause
goto :finish

:success
echo.
echo Dependency upgrade script completed successfully.
goto :finish

:missing_pwsh
echo ERROR: PowerShell 7 (pwsh.exe) is required.
set "RESULT=1"
pause
goto :finish

:missing_script
echo ERROR: Upgrade script not found: "%SCRIPT%"
set "RESULT=1"
pause
goto :finish

:finish
endlocal & exit /b %RESULT%

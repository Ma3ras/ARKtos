@echo off
echo Suche nach laufenden Node.js Prozessen...
echo.

tasklist /FI "IMAGENAME eq node.exe" /FO TABLE

echo.
echo Moechtest du ALLE Node.js Prozesse beenden? (J/N)
set /p answer=

if /i "%answer%"=="J" (
    echo Beende alle Node.js Prozesse...
    taskkill /F /IM node.exe
    echo Fertig!
) else (
    echo Abgebrochen.
)

pause

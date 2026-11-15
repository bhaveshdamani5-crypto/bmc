@echo off
setlocal

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js LTS, then run this file again.
  goto :error
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reopen this window after installing Node.js.
  goto :error
)

cd /d "%~dp0apps\web"
if errorlevel 1 (
  echo Could not find the apps\web directory.
  goto :error
)

if not exist "node_modules\next\package.json" (
  echo Installing app dependencies...
  call npm ci
  if errorlevel 1 goto :error
)

set "APP_HOST=localhost"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$r = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue; $r = $r | Sort-Object RouteMetric | Select-Object -First 1; if ($r) { $a = Get-NetIPAddress -InterfaceIndex $r.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue; $a = $a | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1; if ($a) { $a.IPAddress } }"`) do set "APP_HOST=%%I"
set "APP_URL=http://%APP_HOST%:3000"
set "LOOPBACK_URL=http://localhost:3000"
set "NEXT_PUBLIC_APP_URL=%APP_URL%"
set "GUEST_URL="
if exist ".env.local" (
  for /f "usebackq delims=" %%I in (`node --env-file=.env.local scripts\resolve-guest-url.mjs`) do set "GUEST_URL=%%I"
) else (
  for /f "usebackq delims=" %%I in (`node scripts\resolve-guest-url.mjs`) do set "GUEST_URL=%%I"
)
if not defined GUEST_URL (
  echo Could not resolve a customer menu URL. Check .env.local and the active table setup.
  goto :error
)
set "KITCHEN_URL=%APP_URL%/login"
set "OWNER_URL=%APP_URL%/admin"
curl.exe --fail --silent --output nul "%APP_URL%/login" >nul 2>nul
if not errorlevel 1 goto :open_pages

if /I not "%APP_HOST%"=="localhost" (
  curl.exe --fail --silent --output nul "%LOOPBACK_URL%/login" >nul 2>nul
  if not errorlevel 1 (
    echo A previous server is only listening on localhost.
    echo Stop it with Ctrl+C in its server window, then run this file again.
    goto :error
  )
)

echo Starting the TableTap development server...
start "TableTap Dev Server" /D "%CD%" cmd /k "set NEXT_PUBLIC_APP_URL=%APP_URL% && npm run dev -- --hostname 0.0.0.0 --port 3000"

echo Waiting for the app to start...
for /L %%i in (1,1,60) do (
  curl.exe --fail --silent --output nul "%APP_URL%/login" >nul 2>nul
  if not errorlevel 1 goto :open_pages
  ping.exe -n 2 -w 1000 127.0.0.1 >nul
)

echo The server did not respond within 60 seconds.
echo Check the TableTap Dev Server window for errors.
goto :error

:open_pages
echo Opening the customer menu, kitchen staff sign-in, and owner dashboard...
start "" "%GUEST_URL%"
start "" "%KITCHEN_URL%"
start "" "%OWNER_URL%"
echo.
echo Guest menu:         %GUEST_URL%
echo Kitchen staff:      %KITCHEN_URL%
echo Owner dashboard:    %OWNER_URL%
echo Sign in as kitchen staff or owner on the matching page.
echo The owner dashboard requires an owner or manager account.
if /I "%APP_HOST%"=="localhost" echo No LAN address was detected; QR codes may only work on this computer.
if /I not "%APP_HOST%"=="localhost" echo Scan QR codes from a phone on the same Wi-Fi network.
echo Close the TableTap Dev Server window to stop the app.
endlocal & exit /b 0

:error
echo.
pause
endlocal & exit /b 1

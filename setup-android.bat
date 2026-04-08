@echo off
echo ============================================
echo   Настройка Android-приложения
echo   Духовное Расписание
echo ============================================
echo.

echo [1/4] Сборка веб-версии...
call npm run build
if errorlevel 1 goto :error

echo.
echo [2/4] Инициализация Capacitor...
call npx cap init "Духовное Расписание" com.spiritual.schedule --web-dir=dist --integrate=false
if errorlevel 1 goto :error

echo.
echo [3/4] Добавление Android платформы...
call npx cap add android
if errorlevel 1 goto :error

echo.
echo [4/4] Синхронизация...
call npx cap sync android
if errorlevel 1 goto :error

echo.
echo ============================================
echo   Готово!
echo ============================================
echo.
echo Теперь выполните:
echo   npx cap open android
echo.
echo Это откроет проект в Android Studio
echo где можно собрать APK файл.
echo.
pause
goto :end

:error
echo.
echo ============================================
echo   Произошла ошибка!
echo ============================================
echo.
echo Убедитесь, что:
echo   1. Node.js установлен
echo   2. Все зависимости установлены (npm install)
echo   3. У вас есть права на запись в папку
echo.
pause

:end

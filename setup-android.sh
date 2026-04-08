#!/bin/bash

echo "============================================"
echo "  Настройка Android-приложения"
echo "  Духовное Расписание"
echo "============================================"
echo ""

echo "[1/4] Сборка веб-версии..."
npm run build
if [ $? -ne 0 ]; then
    echo "Ошибка сборки!"
    exit 1
fi

echo ""
echo "[2/4] Инициализация Capacitor..."
npx cap init "Духовное Расписание" com.spiritual.schedule --web-dir=dist --integrate=false
if [ $? -ne 0 ]; then
    echo "Ошибка инициализации!"
    exit 1
fi

echo ""
echo "[3/4] Добавление Android платформы..."
npx cap add android
if [ $? -ne 0 ]; then
    echo "Ошибка добавления Android!"
    exit 1
fi

echo ""
echo "[4/4] Синхронизация..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo "Ошибка синхронизации!"
    exit 1
fi

echo ""
echo "============================================"
echo "  Готово!"
echo "============================================"
echo ""
echo "Теперь выполните:"
echo "  npx cap open android"
echo ""
echo "Это откроет проект в Android Studio"
echo "где можно собрать APK файл."
echo ""

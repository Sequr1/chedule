# 🧵 Духовное Расписание

Приложение для создания красивого расписания на неделю в формате **16:9** (горизонтальный) и **9:16** (вертикальный).

![Preview](preview.png)

## ✨ Возможности

- 📅 **Расписание на всю неделю** — 7 дней с автоматической генерацией дат
- 📱 **Два формата** — вертикальный (для сторис) и горизонтальный (для постов)
- 🎨 **Роскошный дизайн** — золотые тона, духовная эстетика
- 💾 **Автосохранение** — все данные сохраняются в браузере
- 📥 **Экспорт в PNG** — скачивание готового изображения
- 📲 **PWA** — установка как приложение на телефон
- 🤖 **Android APK** — сборка нативного приложения

## 🚀 Быстрый старт

### Веб-версия

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка production версии
npm run build
```

### PWA (установка в браузере)

1. Откройте приложение в Chrome/Edge на Android
2. Нажмите **⋮** (меню) → **Установить приложение**
3. Или **Добавить на главный экран**

### Android-приложение

#### Вариант 1: Автоматическая настройка

**Windows:**
```bash
setup-android.bat
```

**Mac/Linux:**
```bash
chmod +x setup-android.sh
./setup-android.sh
```

#### Вариант 2: Пошагово

```bash
# 1. Сборка веб-версии
npm run build

# 2. Инициализация Capacitor
npx cap init "Духовное Расписание" com.spiritual.schedule --web-dir=dist

# 3. Добавление Android
npx cap add android

# 4. Синхронизация
npx cap sync android

# 5. Открытие в Android Studio
npx cap open android
```

#### Сборка APK

В Android Studio:
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. APK появится в `android/app/build/outputs/apk/debug/`

📖 Полная инструкция: [ANDROID_SETUP.md](ANDROID_SETUP.md)

## 📁 Структура проекта

```
├── public/
│   ├── icons/           # Иконки PWA
│   ├── manifest.webmanifest  # PWA манифест
│   └── *.jpg            # Фоновые изображения
├── src/
│   ├── App.tsx          # Главный компонент
│   ├── index.css        # Стили
│   └── main.tsx         # Точка входа
├── capacitor.config.ts  # Настройки Capacitor
├── vite.config.ts       # Настройки Vite + PWA
└── setup-android.*      # Скрипты настройки Android
```

## 🛠 Технологии

- **React 19** + **TypeScript**
- **Vite** — сборщик
- **Tailwind CSS 4** — стили
- **html2canvas** — генерация изображений
- **Capacitor** — нативная обёртка
- **vite-plugin-pwa** — PWA поддержка

## 📱 Требования для Android сборки

- **Android Studio** (скачать бесплатно)
- **Java JDK 17+** (идёт с Android Studio)
- **Node.js 18+**

## 🎨 Кастомизация

### Изменение цветов

Откройте `src/index.css` и измените CSS переменные:

```css
:root {
  --gold-primary: #f59e0b;
  --gold-light: #fbbf24;
  --gold-dark: #d97706;
  --bg-dark: #1a1a2e;
}
```

### Изменение иконки приложения

Замените файлы в `public/icons/`:
- `icon-192.png` — для PWA
- `icon-512.png` — для Google Play

Затем выполните:
```bash
npx cap sync android
```

## 📄 Лицензия

MIT

## 📞 Поддержка

- [Документация Capacitor](https://capacitorjs.com/docs)
- [PWA Guide](https://web.dev/pwa/)
- [Android Studio](https://developer.android.com/studio)

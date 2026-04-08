# 📱 Установка и сборка Android-приложения

## Требования

- **Node.js** 18+ (уже установлен)
- **Android Studio** (скачать бесплатно)
- **Java JDK** 17+ (обычно идёт с Android Studio)

---

## 🚀 Быстрый старт

### 1. Сборка веб-версии

```bash
npm run build
```

### 2. Инициализация Capacitor (если ещё не сделано)

```bash
npx cap init
# App ID: com.spiritual.schedule
# App Name: Духовное Расписание
```

### 3. Добавление Android платформы

```bash
npx cap add android
```

### 4. Синхронизация с Android

```bash
npx cap sync android
```

### 5. Открытие в Android Studio

```bash
npx cap open android
```

### 6. Сборка APK в Android Studio

1. Откройте проект в Android Studio
2. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. APK появится в `android/app/build/outputs/apk/debug/`

---

## 📦 Публикация в Google Play

### 1. Создание подписанного APK

В Android Studio:
1. **Build** → **Generate Signed Bundle / APK**
2. Выберите **APK**
3. Создайте новый ключ (keystore) или используйте существующий
4. Выберите **release** сборку
5. Подпишите и экспортируйте

### 2. Подготовка к публикации

- Загрузите APK в [Google Play Console](https://play.google.com/console)
- Заполните описание приложения
- Добавьте скриншоты (сделайте в приложении)
- Укажите категорию: **Продуктивность** или **Образ жизни**

---

## 🔧 Полезные команды

| Команда | Описание |
|---------|----------|
| `npm run build` | Сборка веб-версии |
| `npx cap sync` | Синхронизация с нативными проектами |
| `npx cap open android` | Открыть Android Studio |
| `npx cap run android` | Запустить на подключённом устройстве |
| `npx cap copy` | Копировать веб-ассеты в нативные проекты |

---

## 📲 Установка PWA в браузере (без Android Studio)

### Chrome/Edge на Android:
1. Откройте сайт в Chrome
2. Нажмите **⋮** (меню)
3. Выберите **Установить приложение** или **Добавить на главный экран**

### Samsung Internet:
1. Откройте сайт
2. Нажмите **≡** (меню)
3. Выберите **Добавить страницу на** → **Главный экран**

---

## 🎨 Кастомизация иконки приложения

Иконки находятся в `public/icons/`:
- `icon-192.png` — для PWA и Android
- `icon-512.png` — для Google Play и больших экранов

Чтобы изменить иконку:
1. Замените файлы в `public/icons/`
2. Выполните `npx cap sync android`
3. Пересоберите в Android Studio

---

## 🐛 Решение проблем

### Ошибка: "SDK location not found"
Откройте `android/local.properties` и укажите путь к SDK:
```
sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

### Ошибка: "Java version mismatch"
Убедитесь, что в Android Studio установлена Java 17:
**File** → **Project Structure** → **SDK Location** → **JDK location**

### Приложение не обновляется после изменений
1. Выполните `npm run build`
2. Выполните `npx cap sync android`
3. Пересоберите в Android Studio

---

## 📞 Поддержка

При возникновении проблем:
- [Документация Capacitor](https://capacitorjs.com/docs)
- [Android Studio Guide](https://developer.android.com/studio/intro)
- [PWA Checklist](https://web.dev/pwa-checklist/)

# Mini Video Player for Bitwig Studio 6

Полностью рабочий видео/слайд-плеер с плавным переходом (crossfade 1 сек) для Bitwig Studio 6.

## 📁 Структура проекта

```
mini-videoplayer-bitwig/
├── BitwigController/          # Скрипт контроллера для Bitwig
│   ├── manifest.json
│   └── Main.js
├── ElectronPlayer/            # Внешний плеер (Electron)
│   ├── package.json
│   ├── main.js
│   ├── preload.js
│   ├── renderer.html
│   └── renderer.js
└── README.md                  # Этот файл
```

---

## 🚀 Быстрый старт

### Шаг 1: Установка Electron плеера

```bash
cd ElectronPlayer
npm install
npm start
```

### Шаг 2: Установка скрипта в Bitwig

1. Открой папку скриптов Bitwig:
   - **Windows:** `%USERPROFILE%\Documents\Bitwig Studio\Controller Scripts\`
   - **macOS:** `~/Documents/Bitwig Studio/Controller Scripts/`
   - **Linux:** `~/Bitwig Studio/Controller Scripts/`

2. Скопируй папку `BitwigController` в эту директорию.

3. Открой файл `BitwigController/Main.js` и измени путь к папке с медиа:
   ```javascript
   var MEDIA_FOLDER = "C:/Users/ВАШ_ЮЗЕРНЕЙМ/Videos/MiniPlayer";
   ```

4. Перезапусти Bitwig Studio.

5. В настройках контроллеров выбери **TuriaArt → MiniVideoPlayer**.

### Шаг 3: MIDI управление

Подключи MIDI-контроллер и используй:

| Кнопка | Действие |
|--------|----------|
| **Note 60 (C3)** | Play / Stop |
| **Note 61 (C#3)** | Следующий файл |
| **Note 62 (D3)** | Предыдущий файл |
| **Note 63 (D#3)** | Переключить скорость (3с / 5с) |
| **CC 7** | Регулировка скорости (2-12 секунд) |

---

## 🎮 Управление с клавиатуры (в окне плеера)

- **Пробел** — Play / Stop
- **→** — Следующий
- **←** — Предыдущий

---

## 📋 Исправленные ошибки (по сравнению с оригиналом)

| Ошибка | Исправление |
|--------|-------------|
| `url('' + filepath + '')` — сломанная строка в PowerShell | Исправлено на `"url('" + filepath + "')"` |
| `new Task()` — не существует в Bitwig API | Заменено на `host.createTask()` |
| `mute.toggle()` — метод не существует | Убрано (не используется) |
| `defineController` без UUID | Добавлен UUID |
| Дублирование `setMidiCallback` | Убрано, оставлен один вызов |
| Необъявленные переменные (`engine`, `cursorTrack`) | Добавлено `var` |
| Создание UDP сокета на каждый вызов | Сокет создаётся один раз в `init()` |
| `loadToLayer` не очищал старые элементы | Добавлена функция `clearLayer()` |
| Видео не останавливалось после фейда | Добавлена остановка видео в старом слое |
| Отсутствовала обработка ошибок загрузки | Добавлены `onerror` обработчики |

---

## 🔧 Требования

- **Node.js** 18+ (для Electron)
- **Bitwig Studio 6**
- **npm**

---

## 📝 Примечания

- Пути к файлам должны быть абсолютными.
- Поддерживаемые форматы: MP4, WebM, MOV, MKV, JPG, PNG, GIF, BMP, WebP.
- Плеер и Bitwig должны быть на одном компьютере (или настроить UDP хост в скрипте).
- Для отладки раскомментируй `win.webContents.openDevTools()` в `main.js`.

---

## 📄 Лицензия

MIT — свободное использование.

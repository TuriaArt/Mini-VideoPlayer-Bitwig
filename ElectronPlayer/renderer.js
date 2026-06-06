const FADE_MS = 1000;

// DOM элементы
const layerA = document.getElementById('layerA');
const layerB = document.getElementById('layerB');
const statusEl = document.getElementById('status');
const counterEl = document.getElementById('counter');
const progressEl = document.getElementById('progress');
const loadingEl = document.getElementById('loading');

// Состояние
let front = layerA;
let back = layerB;
let playing = false;
let files = [];
let index = 0;
let playInterval = 5000;
let timer = null;
let progressTimer = null;
let currentProgress = 0;

// ======== Утилиты ========

function isVideo(filepath) {
    if (!filepath) return false;
    const ext = filepath.toLowerCase();
    return ext.endsWith('.mp4') || ext.endsWith('.webm') || 
           ext.endsWith('.mov') || ext.endsWith('.mkv') ||
           ext.endsWith('.avi') || ext.endsWith('.m4v');
}

function isImage(filepath) {
    if (!filepath) return false;
    const ext = filepath.toLowerCase();
    return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || 
           ext.endsWith('.png') || ext.endsWith('.gif') ||
           ext.endsWith('.bmp') || ext.endsWith('.webp') ||
           ext.endsWith('.svg');
}

function showStatus(text, duration) {
    statusEl.textContent = text;
    statusEl.classList.remove('hidden');
    if (duration) {
        setTimeout(() => statusEl.classList.add('hidden'), duration);
    }
}

function updateCounter() {
    if (files.length > 0) {
        counterEl.textContent = (index + 1) + ' / ' + files.length;
    } else {
        counterEl.textContent = '';
    }
}

// ======== Очистка слоя ========

function clearLayer(layer) {
    // Останавливаем и удаляем видео
    const videos = layer.querySelectorAll('video');
    videos.forEach(v => {
        v.pause();
        v.src = '';
        v.load();
        v.remove();
    });
    // Удаляем изображения
    const images = layer.querySelectorAll('img');
    images.forEach(img => img.remove());
    // Сбрасываем стили
    layer.style.backgroundImage = '';
    layer.style.opacity = '0';
}

// ======== Загрузка в слой ========

function loadToLayer(layer, filepath) {
    clearLayer(layer);

    if (!filepath) return;

    if (isVideo(filepath)) {
        const video = document.createElement('video');
        video.src = 'file:///' + filepath;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'contain';

        // Обработка ошибок
        video.onerror = () => {
            console.error('Failed to load video:', filepath);
            showStatus('Ошибка загрузки: ' + filepath.split('/').pop(), 3000);
        };

        layer.appendChild(video);
    } else if (isImage(filepath)) {
        const img = document.createElement('img');
        img.src = 'file:///' + filepath;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';

        img.onerror = () => {
            console.error('Failed to load image:', filepath);
            showStatus('Ошибка загрузки: ' + filepath.split('/').pop(), 3000);
        };

        layer.appendChild(img);
    } else {
        // Пробуем как фон
        layer.style.backgroundImage = "url('file:///" + filepath + "')";
    }

    layer.style.opacity = '0';
}

// ======== Переход (кроссфейд) ========

function startFadeTo(nextFile) {
    if (!nextFile) return;

    console.log('Fading to:', nextFile);
    showStatus('Загрузка...', 500);

    // Загружаем в задний слой
    loadToLayer(back, nextFile);

    // Настраиваем переход
    back.style.transition = 'opacity ' + FADE_MS + 'ms ease-in-out';
    front.style.transition = 'opacity ' + FADE_MS + 'ms ease-in-out';

    // Z-index: back поверх front
    back.style.zIndex = '2';
    front.style.zIndex = '1';

    // Запускаем анимацию
    requestAnimationFrame(() => {
        back.style.opacity = '1';
        front.style.opacity = '0';
    });

    // После завершения фейда — меняем слои местами
    setTimeout(() => {
        // Останавливаем видео в старом front (теперь back)
        const oldVideos = front.querySelectorAll('video');
        oldVideos.forEach(v => {
            v.pause();
            v.src = '';
            v.load();
        });

        // Меняем ссылки
        const temp = front;
        front = back;
        back = temp;

        // Сбрасываем back
        back.style.zIndex = '1';
        back.style.transition = 'none';
        back.style.opacity = '0';

        updateCounter();

    }, FADE_MS + 50);
}

// ======== Управление воспроизведением ========

function playNext() {
    if (files.length === 0) return;
    index = (index + 1) % files.length;
    startFadeTo(files[index]);
    resetProgress();
}

function playPrevious() {
    if (files.length === 0) return;
    index = (index - 1 + files.length) % files.length;
    startFadeTo(files[index]);
    resetProgress();
}

function resetProgress() {
    currentProgress = 0;
    progressEl.style.width = '0%';
}

function updateProgress() {
    if (!playing || playInterval <= 0) return;
    currentProgress += 100;
    const percent = (currentProgress / playInterval) * 100;
    progressEl.style.width = Math.min(percent, 100) + '%';
}

function startPlayback() {
    if (playing) return;
    if (files.length === 0) {
        showStatus('Нет файлов для воспроизведения', 3000);
        return;
    }

    playing = true;

    // Загружаем первый файл если слой пуст
    if (front.innerHTML === '' && front.style.backgroundImage === '') {
        loadToLayer(front, files[index]);
        front.style.opacity = '1';
        front.style.zIndex = '2';
        updateCounter();
    }

    // Запускаем таймер смены слайдов
    timer = setInterval(playNext, playInterval);

    // Запускаем прогресс-бар
    progressTimer = setInterval(updateProgress, 100);

    showStatus('▶ Воспроизведение', 1500);
    console.log('Playback started, interval:', playInterval, 'ms');
}

function stopPlayback() {
    playing = false;
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }
    resetProgress();
    showStatus('⏸ Остановлено', 1500);
    console.log('Playback stopped');
}

// ======== Обработка UDP команд ========

function handleUdpCommand(cmd) {
    if (!cmd || !cmd.cmd) return;

    console.log('Command received:', cmd.cmd, cmd);

    switch (cmd.cmd) {
        case 'setList':
            if (Array.isArray(cmd.files)) {
                files = cmd.files;
                index = 0;
                loadingEl.style.display = 'none';
                showStatus('Загружено ' + files.length + ' файлов', 2000);
                updateCounter();

                // Предзагружаем первый файл
                if (files.length > 0) {
                    loadToLayer(front, files[0]);
                    front.style.opacity = '1';
                    front.style.zIndex = '2';
                }
            }
            break;

        case 'play':
            startPlayback();
            break;

        case 'stop':
            stopPlayback();
            break;

        case 'next':
            playNext();
            break;

        case 'prev':
            playPrevious();
            break;

        case 'setInterval':
            if (typeof cmd.ms === 'number' && cmd.ms > 0) {
                playInterval = cmd.ms;
                // Перезапускаем таймер если играем
                if (playing) {
                    stopPlayback();
                    startPlayback();
                }
                showStatus('Интервал: ' + (cmd.ms / 1000) + ' сек', 1500);
            }
            break;

        default:
            console.log('Unknown command:', cmd.cmd);
    }
}

// ======== Инициализация ========

if (window.api && window.api.onUdpCmd) {
    window.api.onUdpCmd(handleUdpCommand);
    console.log('UDP listener initialized');
} else {
    console.error('API not available — check preload.js');
    showStatus('Ошибка инициализации API', 5000);
}

// Обработка клавиатуры для тестирования
document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            if (playing) stopPlayback();
            else startPlayback();
            break;
        case 'ArrowRight':
            playNext();
            break;
        case 'ArrowLeft':
            playPrevious();
            break;
    }
});

console.log('Mini Video Player renderer loaded');

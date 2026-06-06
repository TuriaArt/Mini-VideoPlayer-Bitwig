loadAPI(17);

host.defineController("TuriaArt", "MiniVideoPlayer", "1.0", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "TuriaArt");
host.defineMidiPorts(1, 1);

// ======== Конфигурация ========
var UDP_PORT = 41234;
var UDP_HOST = "127.0.0.1";
var MEDIA_FOLDER = "C:/Users/%USERNAME%/Videos/MiniPlayer"; // ЗАМЕНИТЕ на ваш путь
var PLAY_INTERVAL_MS = 5000; // 5 секунд на слайд
var FADE_DURATION_MS = 1000; // 1 секунда перехода

// ======== Java классы для UDP ========
var DatagramSocket = Java.type("java.net.DatagramSocket");
var InetAddress = Java.type("java.net.InetAddress");
var DatagramPacket = Java.type("java.net.DatagramPacket");
var File = Java.type("java.io.File");
var FilenameFilter = Java.type("java.io.FilenameFilter");

// ======== Глобальные переменные ========
var udpSocket = null;
var cursorTrack = null;
var transport = null;
var application = null;
var files = [];
var currentIndex = 0;
var isPlaying = false;
var playTask = null;
var fadeTask = null;
var elapsedTime = 0;
var fadeElapsed = 0;
var isFading = false;

// ======== Инициализация ========
function init() {
    println("=== MiniVideoPlayer Controller initializing ===");

    // Создаём UDP сокет
    try {
        udpSocket = new DatagramSocket();
        println("UDP socket created");
    } catch (e) {
        println("ERROR: Failed to create UDP socket: " + e);
    }

    // Получаем основные объекты API
    transport = host.createTransport();
    application = host.createApplication();
    cursorTrack = host.createCursorTrack("CursorTrack", "Cursor", 0, 0, true);

    // MIDI callback
    host.getMidiInPort(0).setMidiCallback(onMidi);

    // Создаём задачи (корректный способ в Bitwig API)
    playTask = host.createTask(onPlayTick, this, 50);
    fadeTask = host.createTask(onFadeTick, this, 50);

    // Сканируем папку
    scanMediaFolder(MEDIA_FOLDER);

    // Отправляем список в плеер
    if (files.length > 0) {
        sendPlaylistToPlayer();
        println("Found " + files.length + " media files");
    } else {
        println("WARNING: No media files found in " + MEDIA_FOLDER);
    }

    println("=== MiniVideoPlayer ready ===");
    println("Controls: Note 60 = Play/Stop | Note 61 = Next | Note 62 = Previous | CC 7 = Speed");
}

// ======== Сканирование папки ========
function scanMediaFolder(folderPath) {
    files = [];
    try {
        var folder = new File(folderPath);
        if (!folder.exists() || !folder.isDirectory()) {
            println("ERROR: Folder not found: " + folderPath);
            return;
        }

        var filter = new FilenameFilter({
            accept: function(dir, name) {
                var lower = name.toLowerCase();
                return lower.endsWith(".mp4") || lower.endsWith(".webm") || 
                       lower.endsWith(".mov") || lower.endsWith(".mkv") ||
                       lower.endsWith(".jpg") || lower.endsWith(".jpeg") || 
                       lower.endsWith(".png") || lower.endsWith(".gif") ||
                       lower.endsWith(".bmp") || lower.endsWith(".webp");
            }
        });

        var fileList = folder.listFiles(filter);
        if (fileList) {
            for (var i = 0; i < fileList.length; i++) {
                var file = fileList[i];
                if (file.isFile()) {
                    // Конвертируем путь в формат, понятный Electron
                    var path = file.getAbsolutePath().replace(/\\/g, "/");
                    files.push(path);
                    println("Found: " + path);
                }
            }
        }
    } catch (e) {
        println("ERROR scanning folder: " + e);
    }
}

// ======== Отправка UDP ========
function sendUdp(jsonString) {
    if (udpSocket === null) {
        println("ERROR: UDP socket not initialized");
        return;
    }
    try {
        var data = new java.lang.String(jsonString).getBytes("UTF-8");
        var address = InetAddress.getByName(UDP_HOST);
        var packet = new DatagramPacket(data, data.length, address, UDP_PORT);
        udpSocket.send(packet);
    } catch (e) {
        println("UDP send error: " + e);
    }
}

function sendPlaylistToPlayer() {
    var playlist = {
        cmd: "setList",
        files: files
    };
    sendUdp(JSON.stringify(playlist));

    var interval = {
        cmd: "setInterval",
        ms: PLAY_INTERVAL_MS
    };
    sendUdp(JSON.stringify(interval));
}

// ======== Управление воспроизведением ========
function startPlayback() {
    if (isPlaying || files.length === 0) return;
    isPlaying = true;
    elapsedTime = 0;
    sendUdp(JSON.stringify({cmd: "play"}));
    playTask.start();
    println("Playback started");
}

function stopPlayback() {
    isPlaying = false;
    playTask.stop();
    fadeTask.stop();
    isFading = false;
    sendUdp(JSON.stringify({cmd: "stop"}));
    println("Playback stopped");
}

function nextItem() {
    if (files.length === 0) return;
    currentIndex = (currentIndex + 1) % files.length;
    sendUdp(JSON.stringify({cmd: "next"}));
    println("Next item: " + currentIndex);
}

function previousItem() {
    if (files.length === 0) return;
    currentIndex = (currentIndex - 1 + files.length) % files.length;
    sendUdp(JSON.stringify({cmd: "prev"}));
    println("Previous item: " + currentIndex);
}

// ======== Таймеры ========
function onPlayTick() {
    if (!isPlaying) return;
    elapsedTime += 50;

    // Если время вышло и не идёт фейд — запускаем следующий
    if (elapsedTime >= PLAY_INTERVAL_MS && !isFading) {
        nextItem();
        elapsedTime = 0;
    }
}

function onFadeTick() {
    // Управление фейдом если нужно (дополнительная логика)
    if (!isFading) return;
    fadeElapsed += 50;
    if (fadeElapsed >= FADE_DURATION_MS) {
        isFading = false;
        fadeElapsed = 0;
    }
}

function startFade() {
    isFading = true;
    fadeElapsed = 0;
    fadeTask.start();
}

// ======== MIDI обработка ========
function onMidi(status, data1, data2) {
    var channel = status & 0x0F;
    var messageType = status & 0xF0;

    // Note On
    if (messageType === 0x90 && data2 > 0) {
        switch (data1) {
            case 60: // C3 — Play/Stop
                if (isPlaying) stopPlayback();
                else startPlayback();
                break;
            case 61: // C#3 — Next
                nextItem();
                break;
            case 62: // D3 — Previous
                previousItem();
                break;
            case 63: // D#3 — Toggle fade speed
                var newInterval = (PLAY_INTERVAL_MS === 5000) ? 3000 : 5000;
                PLAY_INTERVAL_MS = newInterval;
                sendUdp(JSON.stringify({cmd: "setInterval", ms: newInterval}));
                println("Interval set to " + newInterval + "ms");
                break;
        }
    }

    // CC (Control Change)
    if (messageType === 0xB0) {
        if (data1 === 7) { // CC 7 — Volume / Speed control
            var normalized = data2 / 127.0;
            var newInterval = Math.round(2000 + normalized * 10000); // 2-12 секунд
            PLAY_INTERVAL_MS = newInterval;
            sendUdp(JSON.stringify({cmd: "setInterval", ms: newInterval}));
            println("Speed adjusted: " + newInterval + "ms");
        }
    }
}

function onSysex(data) {
    // Резерв для SysEx сообщений
}

// ======== Выход ========
function exit() {
    stopPlayback();
    if (udpSocket !== null) {
        udpSocket.close();
    }
    println("=== MiniVideoPlayer disconnected ===");
}

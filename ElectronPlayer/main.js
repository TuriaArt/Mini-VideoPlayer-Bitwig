const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dgram = require('dgram');

let win = null;
const UDP_PORT = 41234;

function createWindow() {
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false, // Покажем после загрузки
        title: 'Mini Video Player'
    });

    win.loadFile('renderer.html');

    // Показываем окно когда загружено
    win.once('ready-to-show', () => {
        win.show();
        // Раскомментируйте для отладки:
        // win.webContents.openDevTools();
    });

    win.on('closed', () => {
        win = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    // UDP сервер
    const server = dgram.createSocket('udp4');

    server.on('error', (err) => {
        console.error('UDP Server error:', err);
        server.close();
    });

    server.on('message', (msg, rinfo) => {
        try {
            const text = msg.toString('utf8');
            const obj = JSON.parse(text);
            console.log('UDP received:', obj.cmd, obj.files ? '(' + obj.files.length + ' files)' : '');

            if (win && !win.isDestroyed()) {
                win.webContents.send('udp-cmd', obj);
            }
        } catch (e) {
            console.error('Invalid UDP payload:', e.message);
        }
    });

    server.on('listening', () => {
        const address = server.address();
        console.log(`UDP server listening on ${address.address}:${address.port}`);
    });

    server.bind(UDP_PORT, '0.0.0.0');

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    onUdpCmd: (callback) => {
        ipcRenderer.on('udp-cmd', (event, data) => callback(data));
    },
    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('udp-cmd');
    }
});

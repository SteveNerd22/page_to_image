// Qui puoi esporre funzioni sicure al renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    waitForImages: () => {
        return new Promise((resolve) => {
            const images = Array.from(document.images);
            if (images.length === 0) {
                resolve();
                return;
            }
            let loadedCount = 0;
            images.forEach(img => {
                if (img.complete) {
                    loadedCount++;
                    if (loadedCount === images.length) resolve();
                } else {
                    img.addEventListener('load', () => {
                        loadedCount++;
                        if (loadedCount === images.length) resolve();
                    });
                    img.addEventListener('error', () => {
                        loadedCount++;
                        if (loadedCount === images.length) resolve();
                    });
                }
            });
        });
    },
    captureCanvas: (htmlContent, head, width, height) =>
        ipcRenderer.invoke('capture-canvas', htmlContent, head, width, height),
    saveImage: (base64Data) =>
        ipcRenderer.invoke('save-image', base64Data),
});

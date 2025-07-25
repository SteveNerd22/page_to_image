const { app, BrowserWindow, ipcMain, dialog  } = require('electron');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');


function createWindow () {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    win.loadFile('index.html');
}

ipcMain.handle('save-image', async (event, base64Data) => {
    const result = await dialog.showSaveDialog({
        title: 'Salva immagine',
        defaultPath: 'screenshot.png',
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });

    if (result.canceled) return;

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(result.filePath, buffer);
});

ipcMain.handle('capture-canvas', async (event, htmlContent, head, width, height) => {
    try {
        const fixedHtml = await inlineLocalImages(htmlContent, path.resolve(__dirname));
        const imageBuffer = await captureWithPuppeteer(fixedHtml, head, width -40, height -40);

        // Verifica che sia effettivamente un Buffer
        if (!Buffer.isBuffer(imageBuffer)) {
            throw new Error("Il risultato non è un Buffer valido");
        }

        // Converti in base64 e restituisci
        return imageBuffer.toString('base64');

    } catch (e) {
        console.error("Errore durante la cattura:", e);
        throw e;
    }
});


async function inlineLocalImages(html, baseDir) {
    return html.replace(/<img[^>]+src="([^"]+)"[^>]*>/g, (match, src) => {
        if (/^(https?:|data:)/.test(src)) return match; // già online o data url

        const imgPath = path.join(baseDir, src);
        if (!fs.existsSync(imgPath)) return match;

        const ext = path.extname(imgPath).slice(1).toLowerCase();

        if (ext === 'svg') {
            try {
                let svgContent = fs.readFileSync(imgPath, 'utf8');
                // Rimuovi eventuali BOM e minimi spazi
                svgContent = svgContent.trim();
                // Encode come URI component (solo alcuni caratteri)
                const encoded = encodeURIComponent(svgContent)
                    .replace(/'/g, '%27')
                    .replace(/"/g, '%22');
                return match.replace(src, `data:image/svg+xml,${encoded}`);
            } catch (err) {
                console.error(`Errore nella lettura SVG: ${imgPath}`, err);
                return match;
            }
        } else {
            try {
                const data = fs.readFileSync(imgPath).toString('base64');
                const mime = ext === 'jpg' ? 'jpeg' : ext;
                return match.replace(src, `data:image/${mime};base64,${data}`);
            } catch (err) {
                console.error(`Errore nella lettura immagine: ${imgPath}`, err);
                return match;
            }
        }
    });
}


async function captureWithPuppeteer(htmlContent, head, width, height) {
    const browser = await puppeteer.launch({
        headless: 'new', // usa 'new' per Chrome recente
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });

    const fullHtml = `
        <!DOCTYPE html>
        <html>
            <head>
                <style>
                    html, body { margin: 0; padding: 0; overflow: hidden; }
                </style>
                ${head}
            </head>
            <body>${htmlContent}</body>
        </html>
    `;

    // Carica HTML
    await page.setContent(fullHtml, { waitUntil: 'load' });

    // Attendi che tutte le immagini siano caricate
    await page.evaluate(async () => {
        const images = Array.from(document.images);
        await Promise.all(images.map(img => {
            if (img.complete) return;
            return new Promise(resolve => {
                img.onload = img.onerror = resolve;
            });
        }));
    });

    const buffer = await page.screenshot({ type: 'png' });
    await browser.close();
    return buffer;
}

app.whenReady().then(createWindow);

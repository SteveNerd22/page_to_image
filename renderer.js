const canvas = document.getElementById('canvas');
const info = document.getElementById('infoForm')
const captureBtn = document.getElementById('captureBtn');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');

// Toggle sidebar visibility
toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

// Load template on click
document.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', async () => {
        const templateFolder = item.getAttribute('data-template'); // ora è la cartella

        // Carico info.html
        const resInfo = await fetch(`templates/${templateFolder}/info.html`);
        info.innerHTML = await resInfo.text();

        info.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                newScript.textContent = oldScript.textContent;
            }
            document.body.appendChild(newScript);  // li aggiungo al body (si eseguono e sono globali)
            oldScript.remove();
        });


        // Carico canvas.html
        const resCanvas = await fetch(`templates/${templateFolder}/canvas.html`);
        canvas.innerHTML = await resCanvas.text();

        // Abilito editing solo sul canvas
        enableEditing(canvas);
    });
});

// Cattura (placeholder per ora)
captureBtn.addEventListener('click', async () => {
    try {
        const canvas = document.getElementById('canvas');
        // Prendi l'HTML del canvas (puoi anche usare outerHTML se vuoi tutto il nodo)
        const htmlContent = canvas.outerHTML;

        const templateHead = document.body.querySelector('head');
        const headContent = templateHead ? templateHead.outerHTML : '';

        // Prendi dimensioni attuali (o quelle che vuoi)
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        // Chiedi al main di catturare il nodo
        const base64Image = await window.api.captureCanvas(htmlContent, headContent, width, height);

        await window.api.saveImage(base64Image);

    } catch (e) {
        alert('Errore durante la cattura: ' + e.message);
    }
});

document.getElementById("resizeCanvas").addEventListener("click", () => {
    const w = parseInt(document.getElementById("widthInput").value, 10);
    const h = parseInt(document.getElementById("heightInput").value, 10);
    const canvas = document.getElementById("canvas");

    if (!isNaN(w) && !isNaN(h)) {
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
    }
});

// Rende immagini modificabili
function enableEditing(container) {
    container.querySelectorAll('img[data-editable]').forEach(img => {
        img.addEventListener('click', async () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.click();

            fileInput.onchange = () => {
                const file = fileInput.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            };
        });
    });
}

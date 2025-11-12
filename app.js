// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadText = document.getElementById('uploadText');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const convertBtn = document.getElementById('convertBtn');
const buttonGroup = document.getElementById('buttonGroup');
const loading = document.getElementById('loading');
const successMessage = document.getElementById('successMessage');
const successText = document.getElementById('successText');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// State
let selectedFile = null;
let convertedBlob = null;
let wasmReady = false;

// Initialize WebAssembly
async function initializeWasm() {
    try {
        // Esperar a que libheif esté disponible
        if (typeof libheif === 'undefined') {
            console.error('libheif no está disponible');
            showError('Error al cargar la librería de conversión. Por favor recarga la página.');
            return;
        }
        
        wasmReady = true;
        console.log('WebAssembly inicializado correctamente');
    } catch (error) {
        console.error('Error inicializando WebAssembly:', error);
        showError('Error al inicializar el convertidor. Por favor recarga la página.');
    }
}

// Event Listeners
uploadArea.addEventListener('click', () => {
    if (!uploadArea.classList.contains('disabled')) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', handleFileSelect);
convertBtn.addEventListener('click', handleConvert);

// Initialize on page load
window.addEventListener('load', initializeWasm);

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Validate file type - aceptar cualquier HEIC/HEIF incluyendo 10-bit
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.heic', '.heif'];
    const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidExtension) {
        showError('Por favor selecciona un archivo HEIC válido');
        return;
    }
    
    selectedFile = file;
    convertedBlob = null;
    uploadText.textContent = file.name;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    // Enable convert button
    convertBtn.disabled = false;
    
    // Hide messages
    hideMessages();
}

// Handle conversion using WebAssembly
async function handleConvert() {
    if (!selectedFile) {
        showError('Por favor selecciona una imagen primero');
        return;
    }
    
    if (!wasmReady) {
        showError('El convertidor aún no está listo. Por favor espera un momento.');
        return;
    }
    
    // Get selected format
    const formatRadio = document.querySelector('input[name="format"]:checked');
    const outputFormat = formatRadio.value; // 'JPEG' or 'PNG'
    
    // Show loading state
    showLoading();
    
    try {
        // Read file as ArrayBuffer
        const arrayBuffer = await selectedFile.arrayBuffer();
        
        // Decodificar HEIC usando libheif (WebAssembly)
        const image = await decodeHeic(arrayBuffer);
        
        if (!image) {
            throw new Error('No se pudo decodificar la imagen HEIC');
        }
        
        // Convertir a formato deseado
        convertedBlob = await convertImage(image, outputFormat);
        
        // Show success and download button
        hideLoading();
        showSuccess();
        showDownloadButton(outputFormat);
        
    } catch (error) {
        console.error('Conversion error:', error);
        hideLoading();
        
        // Proporcionar mensajes de error más específicos
        if (error.message && error.message.includes('10-bit')) {
            showError('Error al procesar HEIC 10-bit. Intenta con otro archivo.');
        } else if (error.message && error.message.includes('decodificar')) {
            showError('Error al decodificar la imagen HEIC. Asegúrate de que sea un archivo válido.');
        } else {
            showError('Error al convertir la imagen: ' + error.message);
        }
    }
}

// Decode HEIC using WebAssembly (libheif)
async function decodeHeic(arrayBuffer) {
    return new Promise((resolve, reject) => {
        try {
            // Crear instancia del decodificador
            const decoder = new libheif.HeifDecoder();
            
            // Decodificar el buffer
            const data = decoder.decode({
                data: new Uint8Array(arrayBuffer)
            });
            
            if (!data || data.length === 0) {
                reject(new Error('No se encontraron imágenes en el archivo HEIC'));
                return;
            }
            
            // Obtener la primera imagen
            const image = data[0];
            
            // Convertir a canvas
            const canvas = document.createElement('canvas');
            canvas.width = image.get_width();
            canvas.height = image.get_height();
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            
            // Obtener datos de píxeles
            image.display({
                canvas: canvas,
                ctx: ctx
            });
            
            resolve(canvas);
        } catch (error) {
            reject(error);
        }
    });
}

// Convert canvas to blob in desired format
async function convertImage(canvas, format) {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Error al convertir la imagen'));
                    }
                },
                format === 'JPEG' ? 'image/jpeg' : 'image/png',
                1.0 // Maximum quality
            );
        } catch (error) {
            reject(error);
        }
    });
}

// Show download button
function showDownloadButton(format) {
    buttonGroup.innerHTML = `
        <button class="btn btn-success" onclick="downloadImage('${format}')">
            <svg style="width: 1.25rem; height: 1.25rem; display: inline-block; vertical-align: middle; margin-right: 0.5rem;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Descargar
        </button>
        <button class="btn btn-outline" onclick="resetConverter()">
            Nueva conversión
        </button>
    `;
}

// Download converted image
function downloadImage(format) {
    if (!convertedBlob) return;
    
    const url = URL.createObjectURL(convertedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `converted-image.${format === 'JPEG' ? 'jpg' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Show feedback
    const originalSuccess = successText.textContent;
    successText.textContent = '✓ Descarga iniciada';
    setTimeout(() => {
        successText.textContent = originalSuccess;
    }, 2000);
}

// Reset converter
function resetConverter() {
    selectedFile = null;
    convertedBlob = null;
    fileInput.value = '';
    uploadText.textContent = 'Seleccionar imagen HEIC';
    previewContainer.style.display = 'none';
    previewImage.src = '';
    
    // Reset buttons
    buttonGroup.innerHTML = `
        <button class="btn btn-primary" id="convertBtn" disabled>
            Convertir
        </button>
    `;
    
    // Re-attach event listener
    document.getElementById('convertBtn').addEventListener('click', handleConvert);
    
    // Hide messages
    hideMessages();
    
    // Enable upload area
    uploadArea.classList.remove('disabled');
}

// UI Helper Functions
function showLoading() {
    loading.style.display = 'flex';
    convertBtn.disabled = true;
    uploadArea.classList.add('disabled');
    hideMessages();
}

function hideLoading() {
    loading.style.display = 'none';
}

function showSuccess() {
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
}

function hideMessages() {
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
}

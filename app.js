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
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// State
let selectedFile = null;
let convertedBlob = null;

// Event Listeners
uploadArea.addEventListener('click', () => {
    if (!uploadArea.classList.contains('disabled')) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', handleFileSelect);
convertBtn.addEventListener('click', handleConvert);

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.heic') && !fileName.endsWith('.heif')) {
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

// Handle conversion
async function handleConvert() {
    if (!selectedFile) {
        showError('Por favor selecciona una imagen primero');
        return;
    }
    
    // Get selected format
    const formatRadio = document.querySelector('input[name="format"]:checked');
    const outputFormat = formatRadio.value; // 'JPEG' or 'PNG'
    
    // Show loading state
    showLoading();
    
    try {
        // Convert HEIC to desired format using heic2any library
        const convertedBlobs = await heic2any({
            blob: selectedFile,
            toType: outputFormat === 'JPEG' ? 'image/jpeg' : 'image/png',
            quality: 1 // Maximum quality
        });
        
        // heic2any can return an array or single blob
        convertedBlob = Array.isArray(convertedBlobs) ? convertedBlobs[0] : convertedBlobs;
        
        // Show success and download button
        hideLoading();
        showSuccess();
        showDownloadButton(outputFormat);
        
    } catch (error) {
        console.error('Conversion error:', error);
        hideLoading();
        showError('Error al convertir la imagen. Asegúrate de que el archivo sea un HEIC válido.');
    }
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
    const originalSuccess = successMessage.innerHTML;
    successMessage.innerHTML = '<p>✓ Descarga iniciada</p>';
    setTimeout(() => {
        successMessage.innerHTML = originalSuccess;
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

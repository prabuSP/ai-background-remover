// ============================================
// AI Background Remover — App Logic
// ============================================

import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.12/+esm';

// --- DOM References ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const processingSection = document.getElementById('processing-section');
const resultSection = document.getElementById('result-section');
const errorSection = document.getElementById('error-section');

const processingPreview = document.getElementById('processing-preview');
const processingStatus = document.getElementById('processing-status');
const processingSubstatus = document.getElementById('processing-substatus');
const progressFill = document.getElementById('progress-fill');

const resultImage = document.getElementById('result-image');
const comparisonOriginal = document.getElementById('comparison-original');
const comparisonOriginalWrapper = document.getElementById('comparison-original-wrapper');
const comparisonContainer = document.getElementById('comparison-container');
const sliderHandle = document.getElementById('slider-handle');

const btnDownload = document.getElementById('btn-download');
const btnNew = document.getElementById('btn-new');
const btnRetry = document.getElementById('btn-retry');

const errorTitle = document.getElementById('error-title');
const errorMessage = document.getElementById('error-message');
const imageInfo = document.getElementById('image-info');

// --- State ---
let currentFile = null;
let originalImageURL = null;
let resultBlobURL = null;
let isProcessing = false;

// --- Constants ---
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

// ============================================
// Section Management
// ============================================

function showSection(section) {
    [uploadSection, processingSection, resultSection, errorSection].forEach(s => {
        s.classList.remove('active');
    });
    // Force reflow for animation
    void section.offsetWidth;
    section.classList.add('active');
}

// ============================================
// File Upload Handling
// ============================================

// Click to upload
dropZone.addEventListener('click', () => {
    if (!isProcessing) fileInput.click();
});

// Keyboard accessibility
dropZone.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
        e.preventDefault();
        fileInput.click();
    }
});

// File selected via input
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    fileInput.value = ''; // Reset so same file can be re-selected
});

// Drag & Drop
dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    // Only remove if we actually left the drop zone
    if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
    }
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

// Prevent default browser behavior for drag events on the page
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// ============================================
// File Validation & Processing
// ============================================

function handleFile(file) {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
        showError(
            'Unsupported File Format',
            `Please upload a PNG, JPG, JPEG, or WEBP image. You uploaded: ${file.type || 'unknown format'}`
        );
        return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        showError(
            'File Too Large',
            `Maximum file size is 20MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
        );
        return;
    }

    currentFile = file;
    processImage(file);
}

async function processImage(file) {
    isProcessing = true;

    // Clean up previous URLs
    if (originalImageURL) URL.revokeObjectURL(originalImageURL);
    if (resultBlobURL) URL.revokeObjectURL(resultBlobURL);

    // Create preview URL
    originalImageURL = URL.createObjectURL(file);

    // Show processing section
    processingPreview.src = originalImageURL;
    updateProgress(0, 'Loading AI Model...', 'This may take a moment on first use');
    showSection(processingSection);

    try {
        // Simulate progressive loading for UX
        let fakeProgress = 0;
        const progressInterval = setInterval(() => {
            if (fakeProgress < 85) {
                fakeProgress += Math.random() * 8;
                fakeProgress = Math.min(fakeProgress, 85);
                updateProgress(fakeProgress);

                // Update status messages based on progress
                if (fakeProgress > 10 && fakeProgress < 30) {
                    updateProgress(fakeProgress, 'Downloading AI Model...', 'Loading neural network weights');
                } else if (fakeProgress > 30 && fakeProgress < 60) {
                    updateProgress(fakeProgress, 'Analyzing Image...', 'Detecting foreground elements');
                } else if (fakeProgress > 60) {
                    updateProgress(fakeProgress, 'Removing Background...', 'Almost there...');
                }
            }
        }, 400);

        // Actually remove background
        const resultBlob = await removeBackground(file, {
            model: 'medium',
            output: {
                format: 'image/png',
                quality: 0.9,
                type: 'foreground',
            },
        });

        clearInterval(progressInterval);
        updateProgress(100, 'Complete!', 'Background removed successfully');

        // Short delay to show 100% completion
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create result URL
        resultBlobURL = URL.createObjectURL(resultBlob);

        // Show result
        showResult(file, resultBlob);

    } catch (err) {
        console.error('Background removal failed:', err);
        showError(
            'Processing Failed',
            err.message || 'An unexpected error occurred while removing the background. Please try again with a different image.'
        );
    } finally {
        isProcessing = false;
    }
}

function updateProgress(percent, title, subtitle) {
    progressFill.style.width = `${percent}%`;
    if (title) processingStatus.textContent = title;
    if (subtitle) processingSubstatus.textContent = subtitle;
}

// ============================================
// Result Display
// ============================================

function showResult(originalFile, resultBlob) {
    // Set images
    resultImage.src = resultBlobURL;
    comparisonOriginal.src = originalImageURL;

    // Wait for images to load before showing
    const loadPromises = [
        new Promise(resolve => {
            resultImage.onload = resolve;
            resultImage.onerror = resolve;
        }),
        new Promise(resolve => {
            comparisonOriginal.onload = resolve;
            comparisonOriginal.onerror = resolve;
        })
    ];

    Promise.all(loadPromises).then(() => {
        // Set container aspect ratio based on the result image
        const img = resultImage;
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        comparisonContainer.style.aspectRatio = `${aspectRatio}`;

        // Adjust original image width to match container
        comparisonOriginal.style.width = `${comparisonContainer.offsetWidth}px`;
        comparisonOriginal.style.height = '100%';
        comparisonOriginal.style.objectFit = 'contain';

        // Reset slider to 50%
        setSliderPosition(50);

        // Show image info
        const originalSize = formatFileSize(originalFile.size);
        const resultSize = formatFileSize(resultBlob.size);
        imageInfo.innerHTML = `
            <div class="info-item"><strong>Original:</strong> ${originalSize}</div>
            <div class="info-item"><strong>Result:</strong> ${resultSize}</div>
            <div class="info-item"><strong>Dimensions:</strong> ${img.naturalWidth} × ${img.naturalHeight}</div>
        `;

        showSection(resultSection);
        showToast('Background removed successfully!', 'success');
    });
}

// ============================================
// Comparison Slider
// ============================================

let isDragging = false;

function setSliderPosition(percent) {
    percent = Math.max(0, Math.min(100, percent));
    sliderHandle.style.left = `${percent}%`;
    comparisonOriginalWrapper.style.width = `${percent}%`;

    // Keep original image properly sized
    const containerWidth = comparisonContainer.offsetWidth;
    comparisonOriginal.style.width = `${containerWidth}px`;
}

function getSliderPercent(clientX) {
    const rect = comparisonContainer.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * 100;
}

// Mouse events
comparisonContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    setSliderPosition(getSliderPercent(e.clientX));
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        e.preventDefault();
        setSliderPosition(getSliderPercent(e.clientX));
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// Touch events
comparisonContainer.addEventListener('touchstart', (e) => {
    isDragging = true;
    setSliderPosition(getSliderPercent(e.touches[0].clientX));
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (isDragging) {
        setSliderPosition(getSliderPercent(e.touches[0].clientX));
    }
}, { passive: true });

document.addEventListener('touchend', () => {
    isDragging = false;
});

// Handle window resize — re-adjust original image width
window.addEventListener('resize', () => {
    if (resultSection.classList.contains('active')) {
        const containerWidth = comparisonContainer.offsetWidth;
        comparisonOriginal.style.width = `${containerWidth}px`;
    }
});

// ============================================
// Action Buttons
// ============================================

btnDownload.addEventListener('click', () => {
    if (!resultBlobURL) return;

    const link = document.createElement('a');
    link.href = resultBlobURL;

    // Generate filename
    const originalName = currentFile ? currentFile.name.replace(/\.[^/.]+$/, '') : 'image';
    link.download = `${originalName}_no_bg.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Image downloaded!', 'success');
});

btnNew.addEventListener('click', resetApp);
btnRetry.addEventListener('click', () => {
    if (currentFile) {
        processImage(currentFile);
    } else {
        resetApp();
    }
});

function resetApp() {
    // Clean up URLs
    if (originalImageURL) {
        URL.revokeObjectURL(originalImageURL);
        originalImageURL = null;
    }
    if (resultBlobURL) {
        URL.revokeObjectURL(resultBlobURL);
        resultBlobURL = null;
    }
    currentFile = null;
    isProcessing = false;
    showSection(uploadSection);
}

// ============================================
// Error Handling
// ============================================

function showError(title, message) {
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    showSection(errorSection);
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'success') {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

    toast.innerHTML = `${icon} ${message}`;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    // Auto-dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ============================================
// Utility
// ============================================

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

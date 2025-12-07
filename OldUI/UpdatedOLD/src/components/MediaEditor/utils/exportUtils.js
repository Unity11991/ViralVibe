/**
 * Export Utilities
 * Handles export of images and videos
 */

/**
 * Convert canvas to blob
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} format - Image format (image/png, image/jpeg)
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>}
 */
export const canvasToBlob = (canvas, format = 'image/png', quality = 0.95) => {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas to blob conversion failed'));
                }
            },
            format,
            quality
        );
    });
};

/**
 * Download blob as file
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Download filename
 */
export const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * Get export resolution dimensions
 * @param {string} preset - Resolution preset (HD, 2K, 4K)
 * @param {number} aspectRatio - Aspect ratio
 * @returns {Object} { width, height }
 */
export const getExportResolution = (preset, aspectRatio = 16 / 9) => {
    const resolutions = {
        'HD': { width: 1920, height: 1080 },
        '2K': { width: 2560, height: 1440 },
        '4K': { width: 3840, height: 2160 }
    };

    if (preset === 'Original' || !resolutions[preset]) {
        return null; // Use original dimensions
    }

    const res = resolutions[preset];

    // Maintain aspect ratio
    if (aspectRatio > res.width / res.height) {
        return {
            width: res.width,
            height: Math.round(res.width / aspectRatio)
        };
    } else {
        return {
            width: Math.round(res.height * aspectRatio),
            height: res.height
        };
    }
};

/**
 * Setup MediaRecorder for video export
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} fps - Frames per second
 * @param {string} resolution - Resolution preset
 * @returns {MediaRecorder}
 */
export const setupMediaRecorder = (canvas, fps = 30, resolution = 'HD') => {
    const stream = canvas.captureStream(fps);

    const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: resolution === '4K' ? 25000000 :
            resolution === '2K' ? 15000000 : 8000000
    };

    // Fallback to vp8 if vp9 is not supported
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8';
    }

    return new MediaRecorder(stream, options);
};

/**
 * Calculate export progress
 * @param {number} currentFrame - Current frame number
 * @param {number} totalFrames - Total number of frames
 * @returns {number} Progress percentage (0-100)
 */
export const calculateProgress = (currentFrame, totalFrames) => {
    return Math.min(100, Math.round((currentFrame / totalFrames) * 100));
};

/**
 * Generate export filename
 * @param {string} type - Export type (image/video)
 * @param {string} format - File format
 * @returns {string} Filename
 */
export const generateExportFilename = (type, format = 'png') => {
    const timestamp = Date.now();
    const extension = type === 'video' ? 'webm' : format;
    return `govyral_export_${timestamp}.${extension}`;
};

/**
 * Load image from blob
 * @param {Blob} blob - Image blob
 * @returns {Promise<HTMLImageElement>}
 */
export const loadImageFromBlob = (blob) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
};

/**
 * AI Face Retouching Service
 * Provides face detection and retouching capabilities for video frames
 */

/**
 * Detect faces in a video element using browser's built-in face detection
 * Falls back to a simple skin-tone based detection if FaceDetector API is not available
 * @param {HTMLVideoElement} videoElement - The video element to analyze
 * @returns {Promise<Array>} Array of face regions with coordinates
 */
export const detectFaces = async (videoElement) => {
    if (!videoElement || videoElement.readyState < 2) {
        return []; // Silently return - video not ready yet
    }

    // Check if video has valid dimensions
    const width = videoElement.videoWidth || videoElement.width;
    const height = videoElement.videoHeight || videoElement.height;

    if (!width || !height || width === 0 || height === 0) {
        return []; // Video dimensions not available yet
    }

    // Try using the experimental FaceDetector API if available
    if ('FaceDetector' in window) {
        try {
            const faceDetector = new window.FaceDetector({
                maxDetectedFaces: 5,
                fastMode: true
            });

            const faces = await faceDetector.detect(videoElement);

            return faces.map(face => ({
                x: face.boundingBox.x,
                y: face.boundingBox.y,
                width: face.boundingBox.width,
                height: face.boundingBox.height,
                landmarks: face.landmarks || []
            }));
        } catch (error) {
            // Silently fall back to skin-tone detection
        }
    }

    // Fallback: Use simple skin tone detection
    return detectFacesFallback(videoElement);
};

/**
 * Fallback face detection using skin tone analysis
 * @param {HTMLVideoElement} videoElement
 * @returns {Array} Detected face regions
 */
const detectFacesFallback = (videoElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple skin tone detection in the upper-center region (where faces typically are)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 3;
    const searchRadius = Math.min(canvas.width, canvas.height) / 4;

    let skinPixels = 0;
    let totalPixels = 0;

    for (let y = Math.max(0, centerY - searchRadius); y < Math.min(canvas.height, centerY + searchRadius); y += 4) {
        for (let x = Math.max(0, centerX - searchRadius); x < Math.min(canvas.width, centerX + searchRadius); x += 4) {
            const i = (y * canvas.width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Simple skin tone heuristic
            if (isSkinTone(r, g, b)) {
                skinPixels++;
            }
            totalPixels++;
        }
    }

    // If we found significant skin tones, assume there's a face
    if (skinPixels / totalPixels > 0.3) {
        return [{
            x: centerX - searchRadius,
            y: centerY - searchRadius,
            width: searchRadius * 2,
            height: searchRadius * 2,
            landmarks: []
        }];
    }

    return [];
};

/**
 * Simple skin tone detection heuristic
 */
const isSkinTone = (r, g, b) => {
    // Basic skin tone detection (works for most skin tones)
    return r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        r - Math.min(g, b) > 15;
};

/**
 * Apply skin smoothing to detected face regions
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} faces - Detected face regions
 * @param {number} intensity - Smoothing intensity (0-100)
 */
export const applySkinSmoothing = (ctx, faces, intensity = 50) => {
    if (!faces || faces.length === 0 || intensity === 0) return;

    const canvas = ctx.canvas;

    faces.forEach(face => {
        // Expand face region significantly to include neck/ears/forehead
        const padding = face.width * 0.35;
        const x = Math.max(0, face.x - padding);
        const y = Math.max(0, face.y - padding);
        const width = Math.min(canvas.width - x, face.width + padding * 2);
        const height = Math.min(canvas.height - y, face.height + padding * 2);

        // Get the face region
        const imageData = ctx.getImageData(x, y, width, height);

        // Apply bilateral filter multiple times for stronger effect
        let smoothed = imageData;
        const passes = Math.min(3, Math.ceil(intensity / 30)); // 1-3 passes

        for (let i = 0; i < passes; i++) {
            smoothed = bilateralFilter(smoothed, intensity);
        }

        // Put back with more aggressive blending
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;

        tempCtx.putImageData(smoothed, 0, 0);

        // Blend smoothed version with original - more visible
        ctx.save();
        ctx.globalAlpha = Math.min(1, intensity / 60); // Stronger effect
        ctx.drawImage(tempCanvas, x, y);
        ctx.restore();
    });
};

/**
 * Simplified bilateral filter for skin smoothing
 * Preserves edges while smoothing skin texture
 */
const bilateralFilter = (imageData, intensity) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new ImageData(width, height);
    const outData = output.data;

    const radius = Math.max(3, Math.ceil(intensity / 12)); // 3-8 pixels (larger blur)
    const sigmaColor = Math.max(30, 70 - intensity / 2); // More aggressive at high intensity
    const sigmaSpace = radius * 1.5;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;

            let r = 0, g = 0, b = 0, totalWeight = 0;

            // Sample neighborhood
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const ni = (ny * width + nx) * 4;

                        // Spatial weight
                        const spatialDist = dx * dx + dy * dy;
                        const spatialWeight = Math.exp(-spatialDist / (2 * sigmaSpace * sigmaSpace));

                        // Color weight
                        const colorDist = Math.abs(data[i] - data[ni]) +
                            Math.abs(data[i + 1] - data[ni + 1]) +
                            Math.abs(data[i + 2] - data[ni + 2]);
                        const colorWeight = Math.exp(-colorDist / (2 * sigmaColor * sigmaColor));

                        const weight = spatialWeight * colorWeight;

                        r += data[ni] * weight;
                        g += data[ni + 1] * weight;
                        b += data[ni + 2] * weight;
                        totalWeight += weight;
                    }
                }
            }

            outData[i] = r / totalWeight;
            outData[i + 1] = g / totalWeight;
            outData[i + 2] = b / totalWeight;
            outData[i + 3] = data[i + 3]; // Keep alpha
        }
    }

    return output;
};

/**
 * Apply teeth whitening to detected face regions
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} faces - Detected face regions
 * @param {number} intensity - Whitening intensity (0-100)
 */
export const applyTeethWhitening = (ctx, faces, intensity = 50) => {
    if (!faces || faces.length === 0 || intensity === 0) return;

    const canvas = ctx.canvas;

    faces.forEach(face => {
        // Estimate mouth region (lower third of face)
        const mouthY = face.y + face.height * 0.6;
        const mouthHeight = face.height * 0.3;
        const mouthX = face.x + face.width * 0.25;
        const mouthWidth = face.width * 0.5;

        const x = Math.max(0, mouthX);
        const y = Math.max(0, mouthY);
        const width = Math.min(canvas.width - x, mouthWidth);
        const height = Math.min(canvas.height - y, mouthHeight);

        const imageData = ctx.getImageData(x, y, width, height);
        const data = imageData.data;

        // Whiten teeth-colored pixels with stronger effect
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Detect teeth (yellowish-white pixels)
            if (isTeethColor(r, g, b)) {
                // More aggressive brightening
                const factor = 1 + (intensity / 100); // Doubled effect
                data[i] = Math.min(255, r * factor);
                data[i + 1] = Math.min(255, g * factor);
                data[i + 2] = Math.min(255, b * factor * 1.15); // Stronger blue boost

                // More aggressive desaturation (make whiter)
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const desatFactor = intensity / 100 * 0.6; // Doubled desaturation
                data[i] = data[i] + (avg - data[i]) * desatFactor;
                data[i + 1] = data[i + 1] + (avg - data[i + 1]) * desatFactor;
                data[i + 2] = data[i + 2] + (avg - data[i + 2]) * desatFactor;
            }
        }

        ctx.putImageData(imageData, x, y);
    });
};

/**
 * Detect if a pixel is likely to be teeth
 */
const isTeethColor = (r, g, b) => {
    // Teeth are typically light colored with slight yellow tint
    const brightness = (r + g + b) / 3;
    const isLight = brightness > 120; // Lower threshold to catch more teeth
    const isNotTooYellow = g > 100 && b > 80; // More lenient
    const isNotTooRed = r - g < 50; // More lenient
    const notTooDark = r > 100 && g > 90 && b > 80; // Additional check

    return isLight && isNotTooYellow && isNotTooRed && notTooDark;
};

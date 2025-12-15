/**
 * AI Color Grading Service
 * Analyzes video frames and suggests color corrections.
 */

/**
 * Analyze a video frame to extract color statistics
 * @param {HTMLVideoElement} videoElement 
 * @returns {Promise<Object>} Analysis results { brightness, contrast, saturation, temperature }
 */
export const analyzeFrame = async (videoElement) => {
    return new Promise((resolve, reject) => {
        try {
            if (!videoElement || !videoElement.videoWidth) {
                resolve(null);
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // Downscale for performance
            canvas.width = 160;
            canvas.height = 160 * (videoElement.videoHeight / videoElement.videoWidth);

            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let r, g, b, avg;
            let totalBrightness = 0;
            let totalSaturation = 0;
            let totalR = 0;
            let totalG = 0;
            let totalB = 0;

            for (let i = 0; i < data.length; i += 4) {
                r = data[i];
                g = data[i + 1];
                b = data[i + 2];

                // Brightness (Luma)
                avg = (r + g + b) / 3;
                totalBrightness += avg;

                // Saturation
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const delta = max - min;
                const sat = max === 0 ? 0 : (delta / max);
                totalSaturation += sat;

                totalR += r;
                totalG += g;
                totalB += b;
            }

            const pixelCount = data.length / 4;
            const avgBrightness = totalBrightness / pixelCount; // 0-255
            const avgSaturation = (totalSaturation / pixelCount) * 100; // 0-100

            const avgR = totalR / pixelCount;
            const avgG = totalG / pixelCount;
            const avgB = totalB / pixelCount;

            // Simple Temperature heuristic (Red vs Blue balance)
            // Higher R/B ratio = Warmer
            const tempRatio = avgB === 0 ? 1 : avgR / avgB;

            // Contrast calculation (Standard Deviation of brightness)
            let sumSqDiff = 0;
            for (let i = 0; i < data.length; i += 4) {
                r = data[i];
                g = data[i + 1];
                b = data[i + 2];
                avg = (r + g + b) / 3;
                sumSqDiff += Math.pow(avg - avgBrightness, 2);
            }
            const variance = sumSqDiff / pixelCount;
            const stdDev = Math.sqrt(variance);
            const avgContrast = (stdDev / 128) * 100; // Normalized roughly

            resolve({
                brightness: avgBrightness, // 0-255
                contrast: avgContrast,     // 0-100 (approx)
                saturation: avgSaturation, // 0-100
                temperature: tempRatio     // ~1.0 is neutral
            });

        } catch (error) {
            console.error("AI Analysis Failed:", error);
            resolve(null);
        }
    });
};

/**
 * Generate adjustment suggestions based on analysis
 * @param {Object} analysis 
 * @returns {Object} Adjustments { brightness, contrast, saturation, temperature, tint }
 */
export const generateGrading = (analysis) => {
    if (!analysis) return {};

    const { brightness, contrast, saturation, temperature } = analysis;
    const adjustments = {};

    // Target Values (Cinematic Look)
    // Brightness: ~100-120 (mid-range)
    // Contrast: ~40-60 (good dynamic range)
    // Saturation: ~50-60 (vibrant but not oversaturated)

    // 1. Brightness Correction
    // If too dark (<80), boost. If too bright (>180), dim.
    // Map 0-255 to -100 to 100 adjustment range
    if (brightness < 80) {
        adjustments.brightness = Math.min(30, (100 - brightness) * 0.5);
    } else if (brightness > 180) {
        adjustments.brightness = Math.max(-30, (120 - brightness) * 0.5);
    } else {
        adjustments.brightness = 0;
    }

    // 2. Contrast Correction
    // If low contrast (<30), boost significantly.
    if (contrast < 30) {
        adjustments.contrast = Math.min(40, (50 - contrast) * 1.5);
    } else if (contrast > 70) {
        adjustments.contrast = -10; // Soften slightly if too harsh
    } else {
        adjustments.contrast = 10; // Default slight pop
    }

    // 3. Saturation Correction
    // If dull (<30), boost.
    if (saturation < 30) {
        adjustments.saturation = Math.min(50, (50 - saturation) * 1.5);
    } else if (saturation > 70) {
        adjustments.saturation = -10; // Desaturate if blown out
    } else {
        adjustments.saturation = 10; // Slight vibrancy
    }

    // 4. Temperature (White Balance)
    // If too cool (<0.8), warm up. If too warm (>1.2), cool down.
    if (temperature < 0.8) {
        adjustments.temperature = 15; // Warm up
    } else if (temperature > 1.4) {
        adjustments.temperature = -15; // Cool down
    } else {
        adjustments.temperature = 0;
    }

    // Add some cinematic flair
    adjustments.vignette = 20; // Subtle vignette focus
    adjustments.sharpen = 10;  // Crisp details

    return adjustments;
};

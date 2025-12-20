/**
 * Image Processing Utilities
 * High-performance algorithms for image enhancement and restoration
 */

/**
 * Auto-leveling (Normalization)
 * Stretches the histogram of each channel to the full 0-255 range
 * @param {Uint8ClampedArray} data - Image data pixels
 */
export const normalizeImage = (data) => {
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    // Find min/max for each channel
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (g < minG) minG = g;
        if (g > maxG) maxG = g;
        if (b < minB) minB = b;
        if (b > maxB) maxB = b;
    }

    // Stretch histogram
    const rangeR = maxR - minR || 1;
    const rangeG = maxG - minG || 1;
    const rangeB = maxB - minB || 1;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = ((data[i] - minR) / rangeR) * 255;
        data[i + 1] = ((data[i + 1] - minG) / rangeG) * 255;
        data[i + 2] = ((data[i + 2] - minB) / rangeB) * 255;
    }
};

/**
 * Median Filter (Noise Reduction)
 * Removes salt-and-pepper noise while preserving edges
 * @param {Uint8ClampedArray} data - Image data pixels
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} radius - Filter radius (default 1)
 */
export const medianFilter = (data, width, height, radius = 1) => {
    const output = new Uint8ClampedArray(data.length);
    const size = (radius * 2 + 1) * (radius * 2 + 1);
    const rValues = new Uint8Array(size);
    const gValues = new Uint8Array(size);
    const bValues = new Uint8Array(size);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let count = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = Math.min(width - 1, Math.max(0, x + dx));
                    const ny = Math.min(height - 1, Math.max(0, y + dy));
                    const ni = (ny * width + nx) * 4;
                    rValues[count] = data[ni];
                    gValues[count] = data[ni + 1];
                    bValues[count] = data[ni + 2];
                    count++;
                }
            }

            rValues.sort();
            gValues.sort();
            bValues.sort();

            const i = (y * width + x) * 4;
            const median = Math.floor(size / 2);
            output[i] = rValues[median];
            output[i + 1] = gValues[median];
            output[i + 2] = bValues[median];
            output[i + 3] = data[i + 3]; // Keep alpha
        }
    }

    for (let i = 0; i < data.length; i++) {
        data[i] = output[i];
    }
};

/**
 * Unsharp Mask (Sharpening)
 * Enhances edges by subtracting a blurred version of the image
 * @param {Uint8ClampedArray} data - Image data pixels
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} amount - Sharpening amount (0-2)
 * @param {number} radius - Blur radius
 */
export const unsharpMask = (data, width, height, amount = 1, radius = 1) => {
    // 1. Create a blurred copy (Box blur for speed)
    const blurred = new Uint8ClampedArray(data.length);
    boxBlur(data, blurred, width, height, radius);

    // 2. Apply unsharp mask formula: original + (original - blurred) * amount
    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) { // R, G, B
            const idx = i + j;
            const diff = data[idx] - blurred[idx];
            data[idx] = Math.min(255, Math.max(0, data[idx] + diff * amount));
        }
    }
};

/**
 * Simple Box Blur helper
 */
const boxBlur = (src, dest, w, h, r) => {
    const iarr = 1 / (r + r + 1);
    for (let i = 0; i < h; i++) {
        let ti = i * w * 4;
        let li = ti;
        let ri = ti + r * 4;
        let fvR = src[ti], fvG = src[ti + 1], fvB = src[ti + 2];
        let lvR = src[ti + (w - 1) * 4], lvG = src[ti + (w - 1) * 4 + 1], lvB = src[ti + (w - 1) * 4 + 2];
        let valR = (r + 1) * fvR, valG = (r + 1) * fvG, valB = (r + 1) * fvB;

        for (let j = 0; j < r; j++) {
            valR += src[ti + j * 4];
            valG += src[ti + j * 4 + 1];
            valB += src[ti + j * 4 + 2];
        }

        for (let j = 0; j <= r; j++) {
            valR += src[ri] - fvR;
            valG += src[ri + 1] - fvG;
            valB += src[ri + 2] - fvB;
            dest[ti] = valR * iarr;
            dest[ti + 1] = valG * iarr;
            dest[ti + 2] = valB * iarr;
            dest[ti + 3] = src[ti + 3];
            ri += 4; ti += 4;
        }

        for (let j = r + 1; j < w - r; j++) {
            valR += src[ri] - src[li];
            valG += src[ri + 1] - src[li + 1];
            valB += src[ri + 2] - src[li + 2];
            dest[ti] = valR * iarr;
            dest[ti + 1] = valG * iarr;
            dest[ti + 2] = valB * iarr;
            dest[ti + 3] = src[ti + 3];
            li += 4; ri += 4; ti += 4;
        }

        for (let j = w - r; j < w; j++) {
            valR += lvR - src[li];
            valG += lvG - src[li + 1];
            valB += lvB - src[li + 2];
            dest[ti] = valR * iarr;
            dest[ti + 1] = valG * iarr;
            dest[ti + 2] = valB * iarr;
            dest[ti + 3] = src[ti + 3];
            li += 4; ti += 4;
        }
    }
};

/**
 * Color Balance Adjustment
 * @param {Uint8ClampedArray} data - Image data pixels
 * @param {number} temp - Temperature (-50 to 50)
 * @param {number} tint - Tint (-50 to 50)
 */
export const adjustColorBalance = (data, temp, tint) => {
    const rMod = temp * 0.5;
    const gMod = tint * 0.5;
    const bMod = -temp * 0.5;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + rMod));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + gMod));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + bMod));
    }
};

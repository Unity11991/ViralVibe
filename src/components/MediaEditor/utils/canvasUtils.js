/**
 * Canvas Utilities for MediaEditor
 * Handles all canvas rendering operations
 */

/**
 * Draw image or video frame to canvas with filters
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement|HTMLVideoElement} media - Media element
 * @param {Object} filters - Filter settings
 * @param {Object} transform - Transform settings (crop, rotation, zoom)
 */
export const drawMediaToCanvas = (ctx, media, filters, transform = {}) => {
    const canvas = ctx.canvas;
    const { crop = null, rotation = 0, zoom = 1 } = transform;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply filters
    ctx.filter = buildFilterString(filters);

    // Handle crop and transform
    if (crop) {
        const { x, y, width, height } = crop;
        ctx.drawImage(
            media,
            x, y, width, height,
            0, 0, canvas.width, canvas.height
        );
    } else {
        // Center and fit media
        const mediaAspect = media.videoWidth ? media.videoWidth / media.videoHeight : media.width / media.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        if (mediaAspect > canvasAspect) {
            drawWidth = canvas.width * zoom;
            drawHeight = (canvas.width / mediaAspect) * zoom;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            drawHeight = canvas.height * zoom;
            drawWidth = (canvas.height * mediaAspect) * zoom;
            offsetX = (canvas.width - drawWidth) / 2;
        }

        ctx.drawImage(media, offsetX, offsetY, drawWidth, drawHeight);
    }

    ctx.restore();
};

/**
 * Build CSS filter string from adjustment values
 * @param {Object} adjustments - Filter adjustment values
 * @returns {string} CSS filter string
 */
export const buildFilterString = (adjustments = {}) => {
    const {
        brightness = 0,
        contrast = 0,
        saturation = 0,
        exposure = 0,
        highlights = 0,
        shadows = 0,
        temp = 0,
        tint = 0,
        vibrance = 0,
        hue = 0,
        sharpen = 0,
        blur = 0,
        grayscale = 0,
        sepia = 0,
        fade = 0
    } = adjustments;

    const filters = [];

    // Brightness (combined exposure + brightness)
    const totalBrightness = 100 + brightness + (exposure * 0.5);
    if (totalBrightness !== 100) {
        filters.push(`brightness(${totalBrightness}%)`);
    }

    // Contrast (affected by highlights/shadows)
    const totalContrast = 100 + contrast + (highlights * 0.3) - (shadows * 0.3);
    if (totalContrast !== 100) {
        filters.push(`contrast(${totalContrast}%)`);
    }

    // Saturation (vibrance adds to saturation)
    const totalSaturation = 100 + saturation + (vibrance * 0.7);
    if (totalSaturation !== 100) {
        filters.push(`saturate(${totalSaturation}%)`);
    }

    // Hue (affected by temp and tint)
    const totalHue = hue + (temp * 0.5) + (tint * 0.3);
    if (totalHue !== 0) {
        filters.push(`hue-rotate(${totalHue}deg)`);
    }

    // Blur (inverse of sharpen, noise reduction)
    if (blur > 0) {
        filters.push(`blur(${blur * 0.05}px)`);
    }

    // Grayscale
    if (grayscale > 0) {
        filters.push(`grayscale(${grayscale}%)`);
    }

    // Sepia
    if (sepia > 0) {
        filters.push(`sepia(${sepia}%)`);
    }

    // Fade (reduce contrast and saturation)
    if (fade > 0) {
        filters.push(`contrast(${100 - fade * 0.3}%)`);
        filters.push(`saturate(${100 - fade * 0.5}%)`);
    }

    return filters.length > 0 ? filters.join(' ') : 'none';
};

/**
 * Draw vignette effect
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} intensity - Vignette intensity (0-100)
 */
export const drawVignette = (ctx, intensity) => {
    if (intensity <= 0) return;

    const canvas = ctx.canvas;
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.2,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8
    );

    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity / 100})`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
};

/**
 * Draw grain effect
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} intensity - Grain intensity (0-100)
 */
export const drawGrain = (ctx, intensity) => {
    if (intensity <= 0) return;

    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const amount = intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * amount * 255;
        data[i] += noise;     // R
        data[i + 1] += noise; // G
        data[i + 2] += noise; // B
    }

    ctx.putImageData(imageData, 0, 0);
};

/**
 * Draw text overlay
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} textOverlay - Text overlay configuration
 * @param {number} canvasWidth - Canvas width for scaling
 * @param {number} canvasHeight - Canvas height for scaling
 */
export const drawTextOverlay = (ctx, textOverlay, canvasWidth, canvasHeight) => {
    const {
        text,
        x, y,
        fontSize,
        fontFamily = 'Arial',
        fontWeight = 'normal',
        color = '#ffffff',
        rotation = 0
    } = textOverlay;

    const posX = (x / 100) * canvasWidth;
    const posY = (y / 100) * canvasHeight;
    const scaleFactor = canvasHeight / 600;
    const scaledFontSize = fontSize * scaleFactor;

    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4 * scaleFactor;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * scaleFactor;

    ctx.fillText(text, 0, 0);
    ctx.restore();
};

/**
 * Draw sticker overlay
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} sticker - Sticker overlay configuration
 * @param {HTMLImageElement} stickerImage - Loaded sticker image
 * @param {number} canvasWidth - Canvas width for scaling
 * @param {number} canvasHeight - Canvas height for scaling
 */
export const drawStickerOverlay = (ctx, sticker, stickerImage, canvasWidth, canvasHeight) => {
    const {
        x, y,
        scale = 1,
        rotation = 0
    } = sticker;

    const posX = (x / 100) * canvasWidth;
    const posY = (y / 100) * canvasHeight;
    const scaleFactor = canvasHeight / 600;
    const stickerWidth = 150 * scale * scaleFactor;
    const stickerHeight = (150 * (stickerImage.height / stickerImage.width)) * scale * scaleFactor;

    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(stickerImage, -stickerWidth / 2, -stickerHeight / 2, stickerWidth, stickerHeight);
    ctx.restore();
};

/**
 * Render complete frame with all effects and overlays
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement|HTMLVideoElement} media - Media element
 * @param {Object} state - Editor state (filters, overlays, etc.)
 */
export const renderFrame = (ctx, media, state) => {
    const { adjustments, vignette, grain, textOverlays, stickers, stickerImages, transform } = state;

    // Draw base media with filters
    drawMediaToCanvas(ctx, media, adjustments, transform);

    // Apply vignette
    if (vignette > 0) {
        drawVignette(ctx, vignette);
    }

    // Apply grain
    if (grain > 0) {
        drawGrain(ctx, grain);
    }

    // Draw text overlays
    textOverlays.forEach(textOverlay => {
        drawTextOverlay(ctx, textOverlay, ctx.canvas.width, ctx.canvas.height);
    });

    // Draw stickers
    stickers.forEach((sticker, index) => {
        if (stickerImages[index]) {
            drawStickerOverlay(ctx, sticker, stickerImages[index], ctx.canvas.width, ctx.canvas.height);
        }
    });
};

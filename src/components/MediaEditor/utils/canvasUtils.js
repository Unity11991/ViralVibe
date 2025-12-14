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
 * @param {Object} canvasDimensions - Logical canvas dimensions
 */

/**
 * Canvas Pool to reduce GC pressure
 */
const CanvasPool = {
    pool: [],
    get(width, height) {
        let canvas = this.pool.pop();
        if (!canvas) {
            canvas = document.createElement('canvas');
        }
        canvas.width = width;
        canvas.height = height;
        return canvas;
    },
    release(canvas) {
        if (this.pool.length < 10) { // Limit pool size
            this.pool.push(canvas);
        }
    }
};

/**
 * Get a cached canvas (wrapper for pool)
 */
const getCachedCanvas = (width, height) => {
    return CanvasPool.get(width, height);
};

/**
 * Release a cached canvas
 */
const releaseCanvas = (canvas) => {
    CanvasPool.release(canvas);
};


/**
 * Cubic Bezier Easing Helper
 * Based on https://github.com/gre/bezier-easing
 */
const cubicBezier = (p1x, p1y, p2x, p2y) => {
    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;

    const sampleCurveX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleCurveY = (t) => ((ay * t + by) * t + cy) * t;
    const sampleCurveDerivativeX = (t) => (3 * ax * t + 2 * bx) * t + cx;

    const solveCurveX = (x) => {
        let t0, t1, t2, x2, d2, i;
        for (t2 = x, i = 0; i < 8; i++) {
            x2 = sampleCurveX(t2) - x;
            if (Math.abs(x2) < 1e-5) return t2;
            d2 = sampleCurveDerivativeX(t2);
            if (Math.abs(d2) < 1e-5) break;
            t2 = t2 - x2 / d2;
        }
        t0 = 0;
        t1 = 1;
        t2 = x;
        if (t2 < t0) return t0;
        if (t2 > t1) return t1;
        while (t0 < t1) {
            x2 = sampleCurveX(t2);
            if (Math.abs(x2 - x) < 1e-5) return t2;
            if (x > x2) t0 = t2;
            else t1 = t2;
            t2 = (t1 - t0) * 0.5 + t0;
        }
        return t2;
    };

    return (x) => sampleCurveY(solveCurveX(x));
};

// CSS Easing Presets
const EASING = {
    linear: (t) => t,
    ease: cubicBezier(0.25, 0.1, 0.25, 1.0),
    easeIn: cubicBezier(0.42, 0.0, 1.0, 1.0),
    easeOut: cubicBezier(0.0, 0.0, 0.58, 1.0),
    easeInOut: cubicBezier(0.42, 0.0, 0.58, 1.0),
};

/**
 * Draw image or video frame to canvas with filters
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement|HTMLVideoElement} media - Media element
 * @param {Object} filters - Filter settings
 * @param {Object} transform - Transform settings (crop, rotation, zoom)
 * @param {Object} canvasDimensions - Logical canvas dimensions
 */
export const drawMediaToCanvas = (ctx, media, filters, transform = {}, canvasDimensions = null, memePadding = 0, options = {}) => {
    const canvas = ctx.canvas;
    const { width: logicalWidth, height: logicalHeight } = canvasDimensions || { width: canvas.width, height: canvas.height };
    // Destructure new transform properties with defaults
    const {
        crop = null,
        rotation = 0,
        scale = 100, // Percentage
        x = 0,
        y = 0,
        opacity = 100,
        blendMode = 'normal'
    } = transform;

    const { mask = null } = options;

    const { clearCanvas = true } = options;

    ctx.save();
    if (clearCanvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Apply filters
    if (options.applyFiltersToContext !== false) {
        ctx.filter = buildFilterString(filters);
    } else {
        ctx.filter = 'none';
    }

    // Apply Opacity and Blend Mode
    ctx.globalAlpha = opacity / 100;
    ctx.globalCompositeOperation = blendMode;

    // Handle crop and transform
    if (crop) {
        const { x: cropX, y: cropY, width: cropW, height: cropH } = crop;
        const mediaWidth = media.videoWidth || media.width;
        const mediaHeight = media.videoHeight || media.height;

        const sourceX = (cropX / 100) * mediaWidth;
        const sourceY = (cropY / 100) * mediaHeight;
        const sourceW = (cropW / 100) * mediaWidth;
        const sourceH = (cropH / 100) * mediaHeight;

        ctx.drawImage(
            media,
            sourceX, sourceY, sourceW, sourceH,
            0, 0, canvas.width, canvas.height
        );
    } else {
        // Center and fit media
        const mediaAspect = media.videoWidth ? media.videoWidth / media.videoHeight : media.width / media.height;
        const canvasAspect = logicalWidth / logicalHeight;

        let baseWidth, baseHeight;

        // Calculate base dimensions to cover or fit (Cover is standard for editors usually, but let's stick to fit-contain logic unless specified)
        // Actually, for a "transform" capable editor, we usually start with "contain" or "cover".
        // Let's stick to the previous logic which seemed to be "contain" (fit within).

        if (mediaAspect > canvasAspect) {
            baseWidth = logicalWidth;
            baseHeight = logicalWidth / mediaAspect;
        } else {
            baseHeight = logicalHeight;
            baseWidth = logicalHeight * mediaAspect;
        }

        // Apply Transform (Scale & Translate)
        const scaleFactor = scale / 100;
        const drawWidth = baseWidth * scaleFactor;
        const drawHeight = baseHeight * scaleFactor;

        // Center position + Offset
        const centerX = logicalWidth / 2 + x;
        const centerY = logicalHeight / 2 + y;

        // Soft Masking Logic
        // Text mask always uses soft masking (composite) because clip() doesn't work with fillText
        if (mask && mask.type !== 'none' && (mask.blur > 0 || mask.type === 'text')) {
            const tempCanvas = getCachedCanvas(logicalWidth, logicalHeight);
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.clearRect(0, 0, logicalWidth, logicalHeight);

            // Draw Media to Temp
            tempCtx.save();
            tempCtx.translate(centerX, centerY);
            tempCtx.rotate((rotation * Math.PI) / 180);
            tempCtx.drawImage(media, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            tempCtx.restore();

            // Composite Mask
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.filter = `blur(${mask.blur}px)`;

            tempCtx.save();
            tempCtx.translate(centerX, centerY);
            tempCtx.rotate((rotation * Math.PI) / 180);
            drawMask(tempCtx, mask, drawWidth, drawHeight, false);
            tempCtx.restore();

            // Reset
            tempCtx.globalCompositeOperation = 'source-over';
            tempCtx.filter = 'none';

            ctx.drawImage(tempCanvas, 0, 0);

            // Release temp canvas
            releaseCanvas(tempCanvas);
        } else {
            // Hard Masking
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate((rotation * Math.PI) / 180);

            if (mask && mask.type !== 'none') {
                drawMask(ctx, mask, drawWidth, drawHeight, true);
            }

            ctx.drawImage(media, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();
        }
    }

    ctx.restore();
};

/**
 * Build CSS filter string from adjustment values
 * @param {Object} adjustments - Filter adjustment values
 * @returns {string} CSS filter string
 */
export const buildFilterString = (adjustments = {}) => {
    // Helper to ensure value is a valid number
    const safeNum = (val, def = 0) => {
        const n = Number(val);
        return isNaN(n) ? def : n;
    };

    const brightness = safeNum(adjustments.brightness);
    const contrast = safeNum(adjustments.contrast);
    const saturation = safeNum(adjustments.saturation);
    const exposure = safeNum(adjustments.exposure);
    const highlights = safeNum(adjustments.highlights);
    const shadows = safeNum(adjustments.shadows);
    const temp = safeNum(adjustments.temp);
    const tint = safeNum(adjustments.tint);
    const vibrance = safeNum(adjustments.vibrance);
    const hue = safeNum(adjustments.hue);
    const hslSaturation = safeNum(adjustments.hslSaturation);
    const hslLightness = safeNum(adjustments.hslLightness);
    const blur = safeNum(adjustments.blur);
    const grayscale = safeNum(adjustments.grayscale);
    const sepia = safeNum(adjustments.sepia);
    const fade = safeNum(adjustments.fade);

    const filters = [];

    // Helper to clamp and round values
    const clamp = (val, min = 0) => Math.max(min, Math.round(val));

    // Brightness (combined exposure + brightness + hslLightness)
    const totalBrightness = clamp(100 + brightness + (exposure * 0.5) + hslLightness);
    if (totalBrightness !== 100) {
        filters.push(`brightness(${totalBrightness}%)`);
    }

    // Contrast (affected by highlights/shadows)
    const totalContrast = clamp(100 + contrast + (highlights * 0.3) - (shadows * 0.3));
    if (totalContrast !== 100) {
        filters.push(`contrast(${totalContrast}%)`);
    }

    // Saturation (vibrance + hslSaturation adds to saturation)
    const totalSaturation = clamp(100 + saturation + (vibrance * 0.7) + hslSaturation);
    if (totalSaturation !== 100) {
        filters.push(`saturate(${totalSaturation}%)`);
    }

    // Hue (affected by temp and tint)
    const totalHue = Math.round(hue + (temp * 0.5) + (tint * 0.3));
    if (totalHue !== 0) {
        filters.push(`hue-rotate(${totalHue}deg)`);
    }

    // Blur (inverse of sharpen, noise reduction)
    if (blur > 0) {
        filters.push(`blur(${Math.round(blur * 0.05 * 10) / 10}px)`);
    }

    // Grayscale
    if (grayscale > 0) {
        filters.push(`grayscale(${clamp(grayscale)}%)`);
    }

    // Sepia
    if (sepia > 0) {
        filters.push(`sepia(${clamp(sepia)}%)`);
    }

    // Fade (reduce contrast and saturation)
    if (fade > 0) {
        filters.push(`contrast(${clamp(100 - fade * 0.3)}%)`);
        filters.push(`saturate(${clamp(100 - fade * 0.5)}%)`);
    }

    return filters.length > 0 ? filters.join(' ') : 'none';
};

/**
 * Draw vignette effect
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} intensity - Vignette intensity (0-100)
 */
export const drawVignette = (ctx, intensity, canvasDimensions = null) => {
    if (intensity <= 0) return;

    const canvas = ctx.canvas;
    const { width: logicalWidth, height: logicalHeight } = canvasDimensions || { width: canvas.width, height: canvas.height };

    const gradient = ctx.createRadialGradient(
        logicalWidth / 2, logicalHeight / 2, logicalWidth * 0.2,
        logicalWidth / 2, logicalHeight / 2, logicalWidth * 0.8
    );

    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity / 100})`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
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
 * Apply dynamic effect to canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} effectId - Effect ID
 */
export const applyDynamicEffect = (ctx, effectId) => {
    if (!effectId) return;

    // We need to import EFFECTS_PRESETS to look up values, but to avoid circular dependency
    // we'll assume the effect object is passed or we'll look it up from a passed list.
    // For now, let's assume we pass the effect configuration object directly or handle lookup outside.
    // Actually, let's just implement the logic based on the ID or passed values.
    // Better approach: Pass the effect configuration object to renderFrame.
};

/**
 * Apply professional color grading using composite operations
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} filterId - Filter ID
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export const applyColorGrade = (ctx, filterId, width, height) => {
    if (!filterId || filterId === 'normal') return;

    ctx.save();

    switch (filterId) {
        case 'clarendon':
            // Blue Tint in Shadows (Overlay)
            ctx.fillStyle = 'rgba(127, 187, 227, 0.2)';
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillRect(0, 0, width, height);

            // Warm Highlights (Soft Light)
            ctx.fillStyle = 'rgba(243, 226, 195, 0.2)';
            ctx.globalCompositeOperation = 'soft-light';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'juno':
            // Warm Glow (Soft Light)
            ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
            ctx.globalCompositeOperation = 'soft-light';
            ctx.fillRect(0, 0, width, height);

            // Cool Shadows (Multiply)
            ctx.fillStyle = 'rgba(0, 0, 50, 0.1)';
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'lark':
            // Brighten (Screen)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.globalCompositeOperation = 'screen';
            ctx.fillRect(0, 0, width, height);

            // Cool Tint (Color)
            ctx.fillStyle = 'rgba(50, 100, 200, 0.1)';
            ctx.globalCompositeOperation = 'color';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'lofi':
            // High Contrast (Overlay)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillRect(0, 0, width, height);

            // Saturation Boost (Saturation)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'; // Red tint often boosts perceived saturation
            ctx.globalCompositeOperation = 'soft-light';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'gingham':
            // Vintage Yellow Tint (Soft Light)
            ctx.fillStyle = 'rgba(230, 230, 210, 0.3)';
            ctx.globalCompositeOperation = 'soft-light';
            ctx.fillRect(0, 0, width, height);

            // Low Contrast Fade (Screen)
            ctx.fillStyle = 'rgba(50, 50, 50, 0.1)';
            ctx.globalCompositeOperation = 'screen';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'valencia':
            // Warm Yellow/Brown (Multiply)
            ctx.fillStyle = 'rgba(58, 3, 57, 0.1)';
            ctx.globalCompositeOperation = 'exclusion';
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = 'rgba(230, 193, 61, 0.2)';
            ctx.globalCompositeOperation = 'soft-light';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'aden':
            // Pastel/Pink Tint (Screen)
            ctx.fillStyle = 'rgba(66, 10, 14, 0.2)';
            ctx.globalCompositeOperation = 'screen';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'sutro':
            // Dark Vignette/Purple (Multiply)
            ctx.fillStyle = 'rgba(40, 0, 60, 0.3)';
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillRect(0, 0, width, height);

            // Smoke (Screen)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.globalCompositeOperation = 'soft-light';
            ctx.fillRect(0, 0, width, height);
            break;
    }

    ctx.restore();
};

// Removed slow pixel manipulation functions (noise, rgbSplit, pixelate, halftone, duotone)
// to improve performance and use composite operations instead.

/**
 * Render complete frame with all effects and overlays
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement|HTMLVideoElement} media - Media element
 * @param {Object} state - Editor state (filters, overlays, etc.)
 */
/**
 * Render a single layer (clip, text, sticker)
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} layer 
 * @param {Object} globalState 
 */
const renderLayer = (ctx, layer, globalState) => {
    const { canvasDimensions, memePadding } = globalState;
    const {
        type,
        media,
        text,
        image,
        transform = {},
        adjustments = {},
        filter = 'normal',
        effect = null,
        mask = null,
        opacity = 100,
        blendMode = 'normal',
        transition = null
    } = layer;

    // 1. Setup Context State
    ctx.save();
    ctx.globalAlpha = opacity / 100;
    ctx.globalCompositeOperation = blendMode;

    // 2. Calculate Transform
    // We need to handle transition transforms here if they exist and aren't pre-calculated
    // But ideally, the layer object passed here already has the *current* frame's transform properties
    // (interpolated by the caller or MediaEditor).
    // Assuming 'transform' contains the final draw properties (x, y, scale, rotation).

    // 3. Draw Content
    if (transition) {
        // Handle Transition Rendering (Complex)
        // This logic is similar to the previous implementation but wrapped for layers
        // We might need a temp canvas if the transition involves masking/compositing
        const { width, height } = canvasDimensions;
        const tempCanvas = getCachedCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.clearRect(0, 0, width, height);

        // Draw base content to temp
        if (type === 'video' || type === 'image') {
            drawMediaToCanvas(tempCtx, media, adjustments, transform, canvasDimensions, memePadding, {
                applyFiltersToContext: true,
                clearCanvas: false,
                mask: mask
            });
        } else if (type === 'text') {
            // Adapt text overlay to drawTextOverlay signature
            drawTextOverlay(tempCtx, layer, width, height);
        } else if (type === 'sticker') {
            drawStickerOverlay(tempCtx, layer, image, width, height);
        }

        // Apply Transition FX & Mask
        applyTransitionFX(tempCtx, transition, width, height, media);
        applyTransitionMask(tempCtx, transition, width, height);

        // Draw Temp to Main
        ctx.drawImage(tempCanvas, 0, 0);
        releaseCanvas(tempCanvas);

    } else {
        // Standard Draw
        if (type === 'video' || type === 'image') {
            drawMediaToCanvas(ctx, media, adjustments, transform, canvasDimensions, memePadding, {
                applyFiltersToContext: true,
                clearCanvas: false,
                mask: mask
            });
        } else if (type === 'text') {
            drawTextOverlay(ctx, layer, canvasDimensions.width, canvasDimensions.height);
        } else if (type === 'sticker') {
            drawStickerOverlay(ctx, layer, image, canvasDimensions.width, canvasDimensions.height);
        } else if (type === 'adjustment') {
            // Adjustment Layer Logic: Snapshot -> Filter -> Draw Back
            const { width, height } = canvasDimensions;
            const tempCanvas = getCachedCanvas(width, height);
            const tempCtx = tempCanvas.getContext('2d');

            // 1. Snapshot current canvas state
            tempCtx.clearRect(0, 0, width, height);
            tempCtx.drawImage(ctx.canvas, 0, 0, width, height); // Copy logical or physical? 
            // We need to copy physical canvas dimensions actually because ctx.canvas is the physical one.
            // But getCachedCanvas takes logical if we use the helper? 
            // Actually ctx.canvas has physical size. logic dims might be smaller/different scale.
            // Let's use getCachedCanvas with physical dims if we want pixel perfect copy.
            // Or keep it simple: drawImage(ctx.canvas) draws the full backing store.

            // The tempCanvas from getCachedCanvas might be dirty and have wrong size?
            // Helper `getCachedCanvas(width, height)` sets size.
            // If we used logical width, we downscale?
            // Let's check getCachedCanvas impl. It sets width/height.
            // We should match ctx.canvas.width/height (physical).

            // Wait, `canvasDimensions` passed here are logical.
            // We should access ctx.canvas.width directly for physical copy

            const physWidth = ctx.canvas.width;
            const physHeight = ctx.canvas.height;

            // We need a temp canvas of PHYSICAL size
            const tempCanvasPhys = getCachedCanvas(physWidth, physHeight);
            const tempCtxPhys = tempCanvasPhys.getContext('2d');
            tempCtxPhys.clearRect(0, 0, physWidth, physHeight);
            tempCtxPhys.drawImage(ctx.canvas, 0, 0);

            // 2. Clear Main Canvas (to be replaced)
            ctx.clearRect(0, 0, width, height); // Clear rect uses logical coord space if transform is set?
            // ctx is transformed? renderLayer starts with save/restore but transform happens later?
            // Line 595: ctx.save();
            // Line 597: transform... not applied to ctx yet, logic below does it for MEDIA.
            // So ctx is Identity here (except for global scaling if any?)
            // `useCanvasRenderer` sets scale: ctx.scale(finalWidth / width, finalHeight / height);
            // So logical coords 0,0,width,height cover the whole physical canvas.
            // So `ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height)` is correct.

            ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);

            // 3. Apply Filter
            ctx.save();
            ctx.filter = buildFilterString(adjustments);

            // 4. Draw Back
            // We draw the physical temp canvas into the logical space?
            // transform is not applied to ctx, but ctx has global scale.
            // default drawImage(image, 0, 0, logicalW, logicalH) to fit?
            ctx.drawImage(tempCanvasPhys, 0, 0, canvasDimensions.width, canvasDimensions.height);

            ctx.restore();
            // Reset filter? restore handles it.

            releaseCanvas(tempCanvasPhys);
        }
    }

    // 4. Apply Per-Layer Color Grade / Effects (if not handled inside drawMedia)
    // drawMediaToCanvas handles filters/adjustments for media.
    // But for text/stickers, we might want to apply them too?
    // Currently drawTextOverlay doesn't support filters.
    // If we want to support filters on text, we'd need to apply them to ctx before drawing text.

    // Apply Clip Filters (Color Grade) - mostly for media
    if (filter && filter !== 'normal' && (type === 'video' || type === 'image')) {
        applyColorGrade(ctx, filter, canvasDimensions.width, canvasDimensions.height);
    }

    // Apply Clip Effects
    if (effect) {
        const intensity = globalState.effectIntensity || 50; // Or layer specific
        applyEffectToCanvas(ctx, effect, intensity, canvasDimensions.width, canvasDimensions.height, media);
    }

    // 5. Draw Selection Box (if active)
    if (globalState.activeOverlayId === layer.id) {
        if (type === 'text') {
            drawTextSelectionBox(ctx, layer, canvasDimensions);
        } else {
            // Media/Sticker
            const mediaW = media?.videoWidth || media?.width || 100;
            const mediaH = media?.videoHeight || media?.height || 100;
            // For stickers, we might need image dims
            const dims = (type === 'sticker' && image) ? { width: image.width, height: image.height } : { width: mediaW, height: mediaH };

            // Re-calculate draw transform for selection box if needed
            // But drawSelectionBox expects the transform object.
            drawSelectionBox(ctx, transform, canvasDimensions, dims);
        }
    }

    ctx.restore();
};

/**
 * Render complete frame with all effects and overlays
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement|HTMLVideoElement} media - Media element
 * @param {Object} state - Editor state (filters, overlays, etc.)
 */
export const renderFrame = (ctx, media, state, options = { applyFiltersToContext: true }) => {
    const {
        adjustments,
        transform,
        canvasDimensions,
        memePadding,
        activeEffectId,
        effectIntensity = 50,
        activeFilterId,
        visibleClips,
        textOverlays,
        stickers,
        visibleLayers // New unified property
    } = state;

    // Use provided logical dimensions or fallback to physical dimensions
    const dimensions = canvasDimensions || { width: ctx.canvas.width, height: ctx.canvas.height };

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Prepare Layers
    let layers = [];

    if (visibleLayers) {
        // Use the new unified list if available
        layers = visibleLayers;
    } else {
        // Backward compatibility: Merge existing lists
        // 1. Clips (Background/Main)
        if (visibleClips) {
            layers.push(...visibleClips.map(c => ({ ...c, type: c.type || 'video' })));
        } else if (state.hasActiveClip !== false) {
            // Legacy single clip
            layers.push({
                id: 'main',
                type: 'video',
                media: media,
                adjustments,
                transform,
                filter: activeFilterId,
                effect: activeEffectId
            });
        }

        // 2. Stickers
        if (stickers) {
            layers.push(...stickers.map(s => ({ ...s, type: 'sticker' })));
        }

        // 3. Text (Top)
        if (textOverlays) {
            layers.push(...textOverlays.map(t => ({ ...t, type: 'text' })));
        }
    }

    // Sort Layers by Z-Index (if present)
    // If zIndex is not present, we assume the array order is correct (bottom to top)
    layers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    // Render Layers
    layers.forEach(layer => {
        renderLayer(ctx, layer, {
            canvasDimensions: dimensions,
            memePadding,
            activeOverlayId: state.activeOverlayId,
            effectIntensity
        });
    });

    // Apply Global Effects (Post-Processing)
    if (activeEffectId && !visibleLayers) {
        // Only apply global effect if we are in legacy mode or if explicitly requested as global
        // In multi-track, effects are usually per-clip.
        // But if we have a "Master Track" effect, apply it here.
        // For now, let's assume activeEffectId in state is a global override if not handled per clip
        // applyEffectToCanvas(ctx, activeEffectId, effectIntensity, dimensions.width, dimensions.height, null);
    }
};

/**
 * Apply effect to canvas
 */
export const applyEffectToCanvas = (ctx, effectId, intensityValue, width, height, media) => {
    const intensity = intensityValue / 100;
    ctx.save();

    switch (effectId) {
        case 'glow':
            ctx.filter = `blur(${15 * intensity}px) brightness(${100 + 10 * intensity}%)`;
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.6 * intensity;
            if (media) ctx.drawImage(media, 0, 0, width, height);
            break;

        case 'grain':
            drawGrain(ctx, 80 * intensity);
            ctx.filter = `contrast(${100 + 10 * intensity}%) grayscale(${30 * intensity}%)`;
            ctx.globalCompositeOperation = 'overlay';
            if (media) ctx.drawImage(media, 0, 0, width, height);
            break;

        case 'vintage-cam':
            ctx.filter = `sepia(${40 * intensity}%) contrast(${110 * intensity}%) saturate(${80 * intensity}%)`;
            if (media) ctx.drawImage(media, 0, 0, width, height);
            drawGrain(ctx, 40 * intensity);
            if (intensity > 0.5) {
                ctx.font = `bold ${height * 0.05}px monospace`;
                ctx.fillStyle = '#ff9900';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 2;
                ctx.textAlign = 'right';
                ctx.fillText('01 01 98', width - 20, height - 20);
            }
            break;

        case 'teal-orange':
            ctx.fillStyle = '#008080';
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = 0.4 * intensity;
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#ff8000';
            ctx.globalCompositeOperation = 'soft-light';
            ctx.globalAlpha = 0.5 * intensity;
            ctx.fillRect(0, 0, width, height);
            break;

        case 'polaroid':
            // Simplified for multi-track: just apply a border or overlay
            // const borderSize = width * 0.05;
            // const bottomBorder = width * 0.15;
            break;

        case 'flash-warn':
            // const flashIntensity = (Math.sin(Date.now() / 100) + 1) / 2;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * intensity})`;
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'motion-blur':
            ctx.globalAlpha = 0.1;
            for (let i = 1; i < 10; i++) {
                if (media) {
                    ctx.drawImage(media, i * 2 * intensity, 0, width, height);
                    ctx.drawImage(media, -i * 2 * intensity, 0, width, height);
                }
            }
            break;

        case 'color-pop':
            if (media) {
                ctx.filter = 'grayscale(100%)';
                ctx.drawImage(media, 0, 0, width, height);
                ctx.save();
                ctx.beginPath();
                ctx.arc(width / 2, height / 2, (width / 3) * (1 + (1 - intensity)), 0, Math.PI * 2);
                ctx.clip();
                ctx.filter = 'none';
                ctx.drawImage(media, 0, 0, width, height);
                ctx.restore();
            }
            break;

        case 'chromatic':
            const offset = width * 0.01 * (intensity || 0.5);
            if (media) {
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'red';
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'multiply';
                ctx.drawImage(media, -offset, 0, width, height);
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'blue';
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'multiply';
                ctx.drawImage(media, offset, 0, width, height);
                ctx.globalCompositeOperation = 'destination-over';
                ctx.drawImage(media, 0, 0, width, height);
            }
            break;

        case 'vhs':
            drawGrain(ctx, 40 * intensity);
            ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * intensity})`;
            for (let y = 0; y < height; y += 4) {
                ctx.fillRect(0, y, width, 2);
            }
            ctx.filter = `blur(${2 * intensity}px) saturate(${100 + 100 * intensity}%)`;
            ctx.globalCompositeOperation = 'overlay';
            if (media) ctx.drawImage(media, 0, 0, width, height);
            break;

        case 'glitch':
            // Complex glitch logic omitted
            break;

        case 'retro':
            ctx.filter = `sepia(${50 * intensity}%) contrast(${100 + 20 * intensity}%)`;
            if (media) ctx.drawImage(media, 0, 0, width, height);
            drawGrain(ctx, 20 * intensity);
            break;

        case 'vintage':
            ctx.fillStyle = `rgba(243, 226, 195, ${0.3 * intensity})`;
            ctx.fillRect(0, 0, width, height);
            ctx.filter = `contrast(${100 - 20 * intensity}%) brightness(${100 + 10 * intensity}%)`;
            if (media) ctx.drawImage(media, 0, 0, width, height);
            break;

        case 'noise':
            drawGrain(ctx, 100 * intensity);
            break;

        case 'soft':
            ctx.filter = `blur(${20 * intensity}px)`;
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.5 * intensity;
            if (media) ctx.drawImage(media, 0, 0, width, height);
            break;

        case 'flash':
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, `rgba(255, 200, 150, ${0.6 * intensity})`);
            gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.globalCompositeOperation = 'screen';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'duotone':
            ctx.fillStyle = '#8b5cf6';
            ctx.globalCompositeOperation = 'color';
            ctx.globalAlpha = intensity;
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'invert':
            ctx.filter = `invert(${100 * intensity}%)`;
            if (media) ctx.drawImage(media, 0, 0, width, height);
            break;
    }

    ctx.restore();
};







/**
 * Apply mask clipping path or draw mask shape
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} mask 
 * @param {number} width 
 * @param {number} height 
 * @param {boolean} clip - If true, applies clip(). If false, fills the shape.
 */
export const drawMask = (ctx, mask, width, height, clip = true) => {
    const { type, x = 0, y = 0, scale = 100, rotation = 0 } = mask;

    // Mask is relative to the media size (width/height)
    const maskX = (x / 100) * width;
    const maskY = (y / 100) * height;

    // Size base: min of width/height
    const baseSize = Math.min(width, height);
    const maskSize = baseSize * (scale / 100);

    ctx.beginPath();
    ctx.save();

    // Move to mask center (relative to media center which is 0,0 here)
    ctx.translate(maskX, maskY);
    ctx.rotate((rotation * Math.PI) / 180);

    if (type === 'circle') {
        ctx.arc(0, 0, maskSize / 2, 0, Math.PI * 2);
    } else if (type === 'rectangle') {
        ctx.rect(-maskSize / 2, -maskSize / 2, maskSize, maskSize);
    } else if (type === 'filmstrip') {
        // Filmstrip: Wide rectangle with aspect ratio ~2.35:1
        const stripWidth = width; // Full width
        const stripHeight = width / 2.35; // Cinematic aspect ratio
        // Scale affects the height of the strip relative to the standard cinematic ratio
        const scaledHeight = stripHeight * (scale / 100);
        ctx.rect(-width / 2, -scaledHeight / 2, width, scaledHeight);
    } else if (type === 'text') {
        const { text = 'Default text', fontSize = 40, fontFamily = 'Arial', isBold, isItalic, textAlign = 'center' } = mask;

        ctx.save();
        const s = scale / 100;
        ctx.scale(s, s);

        ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'middle';

        // Note: For text as a mask, we need to draw it.
        // If clip is true, we need a path. Text to path is complex in canvas.
        // However, ctx.clip() usually works with the current path.
        // ctx.fillText does NOT create a path for clipping.
        // We must use a different approach for Text Masking if we want to use it as a clip.
        // BUT, since we implemented soft masking (composite operations), 
        // we can just draw the text filled with white (or any color) and use destination-in.

        // If clip is true (Hard Mask), text masking is very hard with standard canvas API (no textToPath).
        // So for Text Mask, we might force Soft Masking path or use composite operation even for "Hard" mode.
        // Or we just draw the text and use 'destination-in' globalCompositeOperation immediately if clip is false.

        // Wait, `drawMask` is called with `clip=true` for hard masking.
        // If we can't create a path from text, we can't use `ctx.clip()`.
        // So Text Mask MUST use the soft masking logic (composite ops).

        // Let's assume the caller handles this or we handle it here.
        // If clip is true, we can't do anything for text.
        // We should probably force `drawMediaToCanvas` to use the soft mask path for text type.

        // For now, let's just draw the text if clip is false (which is used in soft mask path).
        if (!clip) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, 0, 0);
        }
        // If clip is true, we do nothing? That would result in no mask.
        // We need to update drawMediaToCanvas to force soft mask path for text.

        ctx.restore();

    } else if (type === 'heart') {
        const s = maskSize / 2; // Scale factor
        // Heart path
        ctx.moveTo(0, -s * 0.3);
        ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.5, 0, s);
        ctx.bezierCurveTo(-s, -s * 0.5, -s * 0.5, -s, 0, -s * 0.3);
    } else if (type === 'star') {
        const outer = maskSize / 2;
        const inner = maskSize / 4;
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * outer,
                -Math.sin((18 + i * 72) * Math.PI / 180) * outer);
            ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * inner,
                -Math.sin((54 + i * 72) * Math.PI / 180) * inner);
        }
        ctx.closePath();
    }

    ctx.restore();

    if (clip) {
        ctx.clip();
    } else {
        ctx.fill();
    }
};

/**
 * Apply transition mask to context
 */
export const applyTransitionMask = (ctx, transition, width, height) => {
    const { type, progress } = transition;
    const p = progress;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';

    if (type === 'fade' || type === 'dissolve' || type === 'none') {
        ctx.globalAlpha = p;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
    } else if (type === 'fade_black') {
        // For fade to black, we just fade in opacity, but the background should be black.
        // Since we are masking, 'white' means opaque.
        // We might need to handle this differently in renderFrame (draw black bg).
        // For now, treat as fade.
        ctx.globalAlpha = p;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
    } else if (type.startsWith('wipe_')) {
        ctx.beginPath();
        if (type === 'wipe_left') ctx.rect(0, 0, width * p, height);
        else if (type === 'wipe_right') ctx.rect(width * (1 - p), 0, width * p, height);
        else if (type === 'wipe_up') ctx.rect(0, height * (1 - p), width, height * p);
        else if (type === 'wipe_down') ctx.rect(0, 0, width, height * p);
        else if (type === 'wipe_tl') ctx.moveTo(0, 0), ctx.lineTo(width * p * 2, 0), ctx.lineTo(0, height * p * 2);
        else if (type === 'wipe_tr') ctx.moveTo(width, 0), ctx.lineTo(width - width * p * 2, 0), ctx.lineTo(width, height * p * 2);
        else if (type === 'wipe_bl') ctx.moveTo(0, height), ctx.lineTo(width * p * 2, height), ctx.lineTo(0, height - height * p * 2);
        else if (type === 'wipe_br') ctx.moveTo(width, height), ctx.lineTo(width - width * p * 2, height), ctx.lineTo(width, height - height * p * 2);
        else if (type === 'wipe_center_h') ctx.rect(width / 2 - (width * p) / 2, 0, width * p, height);
        else if (type === 'wipe_center_v') ctx.rect(0, height / 2 - (height * p) / 2, width, height * p);
        else if (type === 'clock_cw') {
            ctx.moveTo(width / 2, height / 2);
            ctx.arc(width / 2, height / 2, Math.max(width, height), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        } else if (type === 'clock_ccw') {
            ctx.moveTo(width / 2, height / 2);
            ctx.arc(width / 2, height / 2, Math.max(width, height), -Math.PI / 2, -Math.PI / 2 - Math.PI * 2 * p, true);
        } else if (type === 'barn_door_h') {
            ctx.rect(0, 0, width * p / 2, height);
            ctx.rect(width - width * p / 2, 0, width * p / 2, height);
        } else if (type === 'barn_door_v') {
            ctx.rect(0, 0, width, height * p / 2);
            ctx.rect(0, height - height * p / 2, width, height * p / 2);
        } else if (type === 'matrix_wipe') {
            const cols = 10;
            const rows = 10;
            const cellW = width / cols;
            const cellH = height / rows;
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    if (Math.random() < p) {
                        ctx.rect(i * cellW, j * cellH, cellW, cellH);
                    }
                }
            }
        }
        ctx.fill();
    } else if (type.startsWith('iris_')) {
        ctx.beginPath();
        const maxRadius = Math.sqrt(width * width + height * height) / 2;
        if (type === 'iris_circle_in') ctx.arc(width / 2, height / 2, maxRadius * p, 0, Math.PI * 2);
        else if (type === 'iris_circle_out') {
            ctx.rect(0, 0, width, height);
            ctx.arc(width / 2, height / 2, maxRadius * (1 - p), 0, Math.PI * 2, true);
        }
        else if (type === 'iris_rect_in') {
            const w = width * p;
            const h = height * p;
            ctx.rect((width - w) / 2, (height - h) / 2, w, h);
        }
        else if (type === 'iris_diamond_in') {
            const s = maxRadius * p;
            ctx.moveTo(width / 2, height / 2 - s);
            ctx.lineTo(width / 2 + s, height / 2);
            ctx.lineTo(width / 2, height / 2 + s);
            ctx.lineTo(width / 2 - s, height / 2);
        }
        else if (type === 'iris_star_in') {
            const cx = width / 2;
            const cy = height / 2;
            const outer = maxRadius * p;
            const inner = outer / 2;
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(cx + Math.cos((18 + i * 72) * Math.PI / 180) * outer,
                    cy - Math.sin((18 + i * 72) * Math.PI / 180) * outer);
                ctx.lineTo(cx + Math.cos((54 + i * 72) * Math.PI / 180) * inner,
                    cy - Math.sin((54 + i * 72) * Math.PI / 180) * inner);
            }
        } else if (type === 'iris_heart_in') {
            const s = maxRadius * p / 2;
            ctx.translate(width / 2, height / 2);
            ctx.moveTo(0, -s * 0.3);
            ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.5, 0, s);
            ctx.bezierCurveTo(-s, -s * 0.5, -s * 0.5, -s, 0, -s * 0.3);
            ctx.translate(-width / 2, -height / 2);
        }
        ctx.fill();
    } else if (type.startsWith('shape_')) {
        // Simple shape patterns
        if (type === 'shape_checker') {
            const size = 50;
            const cols = Math.ceil(width / size);
            const rows = Math.ceil(height / size);
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    if ((i + j) % 2 === 0) {
                        const s = size * p;
                        ctx.fillRect(i * size + (size - s) / 2, j * size + (size - s) / 2, s, s);
                    } else {
                        const s = size * p;
                        ctx.fillRect(i * size + (size - s) / 2, j * size + (size - s) / 2, s, s);
                    }
                }
            }
        } else if (type === 'shape_blinds') {
            const count = 10;
            const h = height / count;
            for (let i = 0; i < count; i++) {
                ctx.fillRect(0, i * h, width, h * p);
            }
        } else if (type === 'shape_stripes_h') {
            const count = 10;
            const h = height / count;
            for (let i = 0; i < count; i += 2) {
                ctx.fillRect(0, i * h, width * p * 2, h);
                ctx.fillRect(width * (1 - p * 2), (i + 1) * h, width, h);
            }
        } else if (type === 'shape_stripes_v') {
            const count = 10;
            const w = width / count;
            for (let i = 0; i < count; i += 2) {
                ctx.fillRect(i * w, 0, w, height * p * 2);
                ctx.fillRect((i + 1) * w, height * (1 - p * 2), w, height);
            }
        } else if (type === 'shape_dots') {
            const size = 50;
            const cols = Math.ceil(width / size);
            const rows = Math.ceil(height / size);
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const cx = i * size + size / 2;
                    const cy = j * size + size / 2;
                    const r = (size / 2) * p;
                    ctx.moveTo(cx, cy);
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                }
            }
        } else if (type === 'shape_spiral') {
            // Simplified spiral (concentric circles)
            const maxR = Math.sqrt(width * width + height * height) / 2;
            const rings = 10;
            for (let i = 0; i < rings; i++) {
                ctx.arc(width / 2, height / 2, maxR * (i / rings) * p, 0, Math.PI * 2);
                ctx.lineTo(width / 2, height / 2); // Close to center to fill ring? No.
                // Just fill circles
            }
        }
    } else {
        // Default fallback
        ctx.globalAlpha = p;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
};

/**
 * Apply transition special effects (Glitch, Blur, Color, Light)
 * These are applied BEFORE the mask to the content itself.
 */
export const applyTransitionFX = (ctx, transition, width, height, media) => {
    const { type, progress } = transition;
    const p = progress;

    ctx.save();

    if (type.startsWith('glitch_')) {
        const intensity = Math.sin(p * Math.PI) * 20; // Peak at 50%

        if (type === 'glitch_rgb') {
            // RGB Split
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(ctx.canvas, -intensity, 0);

            ctx.fillStyle = 'blue';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(ctx.canvas, intensity, 0);
        } else if (type === 'glitch_analog') {
            // Analog Noise/Displacement
            const numSlices = 10;
            const sliceHeight = height / numSlices;
            for (let i = 0; i < numSlices; i++) {
                const offset = (Math.random() - 0.5) * intensity * 2;
                ctx.drawImage(ctx.canvas,
                    0, i * sliceHeight, width, sliceHeight,
                    offset, i * sliceHeight, width, sliceHeight
                );
            }
        }
    } else if (type.startsWith('blur_')) {
        const maxBlur = 20;
        const currentBlur = type === 'blur_zoom' ? p * maxBlur : Math.sin(p * Math.PI) * maxBlur;

        if (type === 'blur_gaussian') {
            ctx.filter = `blur(${currentBlur}px)`;
            ctx.drawImage(ctx.canvas, 0, 0);
        } else if (type === 'blur_zoom') {
            // Simulated zoom blur by drawing scaled up copies with low opacity
            ctx.globalAlpha = 0.1;
            for (let i = 1; i <= 5; i++) {
                const s = 1 + (i * 0.05 * p);
                const w = width * s;
                const h = height * s;
                ctx.drawImage(ctx.canvas, (width - w) / 2, (height - h) / 2, w, h);
            }
        }
    } else if (type.startsWith('color_')) {
        const intensity = Math.sin(p * Math.PI);
        ctx.globalAlpha = intensity;

        if (type === 'color_burn') {
            ctx.globalCompositeOperation = 'color-burn';
            ctx.fillStyle = '#ff0000'; // Dynamic color?
            ctx.fillRect(0, 0, width, height);
        } else if (type === 'color_dodge') {
            ctx.globalCompositeOperation = 'color-dodge';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }
    } else if (type.startsWith('light_')) {
        const intensity = Math.sin(p * Math.PI);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = intensity;

        if (type === 'flash') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
        } else if (type === 'glow') {
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 50;
            ctx.drawImage(ctx.canvas, 0, 0);
        }
    }

    ctx.restore();
};

/**
 * Draw selection box with handles
 */
export const drawSelectionBox = (ctx, transform, canvasDimensions, mediaDimensions) => {
    const { width, height } = canvasDimensions;
    const { x = 0, y = 0, scale = 100, rotation = 0 } = transform;

    // Calculate drawn dimensions
    // Note: This logic must match drawMediaToCanvas positioning logic
    // We assume "contain" logic or explicit transform
    // For now, let's replicate the basic transform logic

    // Base dimensions (assuming contain logic from drawMediaToCanvas)
    const mediaAspect = mediaDimensions.width / mediaDimensions.height;
    const canvasAspect = width / height;

    let baseWidth, baseHeight;
    if (mediaAspect > canvasAspect) {
        baseWidth = width;
        baseHeight = width / mediaAspect;
    } else {
        baseHeight = height;
        baseWidth = height * mediaAspect;
    }

    const scaleFactor = scale / 100;
    const drawWidth = baseWidth * scaleFactor;
    const drawHeight = baseHeight * scaleFactor;

    const centerX = width / 2 + x;
    const centerY = height / 2 + y;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw Border
    ctx.strokeStyle = '#00a8ff'; // Selection Blue
    ctx.lineWidth = 2;
    ctx.strokeRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // Draw Handles
    const handleSize = 6;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00a8ff';
    ctx.lineWidth = 1;

    const handles = [
        { x: -drawWidth / 2, y: -drawHeight / 2 }, // Top-Left
        { x: drawWidth / 2, y: -drawHeight / 2 },  // Top-Right
        { x: drawWidth / 2, y: drawHeight / 2 },   // Bottom-Right
        { x: -drawWidth / 2, y: drawHeight / 2 },  // Bottom-Left
    ];

    handles.forEach(h => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, handleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    // Rotation Handle (Top Center + Offset)
    ctx.beginPath();
    ctx.moveTo(0, -drawHeight / 2);
    ctx.lineTo(0, -drawHeight / 2 - 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -drawHeight / 2 - 20, handleSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
};

/**
 * Draw selection box for text
 */
export const drawTextSelectionBox = (ctx, textOverlay, canvasDimensions) => {
    const { width, height } = canvasDimensions;
    const { x: tx, y: ty, fontSize, fontFamily, fontWeight, text, rotation } = textOverlay;

    // Convert % position to px
    const centerX = (tx / 100) * width;
    const centerY = (ty / 100) * height;

    // Measure text
    const scaleFactor = height / 600;
    const scaledFontSize = fontSize * scaleFactor;
    ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = scaledFontSize; // Approximation

    const drawWidth = textWidth + 20; // Padding
    const drawHeight = textHeight + 20; // Padding

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw Border
    ctx.strokeStyle = '#00a8ff'; // Selection Blue
    ctx.lineWidth = 2;
    ctx.strokeRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // Draw Handles
    const handleSize = 6;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00a8ff';
    ctx.lineWidth = 1;

    const handles = [
        { x: -drawWidth / 2, y: -drawHeight / 2 }, // Top-Left
        { x: drawWidth / 2, y: -drawHeight / 2 },  // Top-Right
        { x: drawWidth / 2, y: drawHeight / 2 },   // Bottom-Right
        { x: -drawWidth / 2, y: drawHeight / 2 },  // Bottom-Left
    ];

    handles.forEach(h => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, handleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    // Rotation Handle (Top Center + Offset)
    ctx.beginPath();
    ctx.moveTo(0, -drawHeight / 2);
    ctx.lineTo(0, -drawHeight / 2 - 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -drawHeight / 2 - 20, handleSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
};

/**
 * Check if a point is inside a clip's bounding box
 */
export const isPointInClip = (x, y, clip, canvasDimensions, mediaDimensions) => {
    const { width, height } = canvasDimensions;
    const transform = clip.transform || {};
    const { x: cx = 0, y: cy = 0, scale = 100, rotation = 0 } = transform;

    // Calculate clip dimensions (similar to drawSelectionBox)
    const mediaAspect = mediaDimensions.width / mediaDimensions.height;
    const canvasAspect = width / height;

    let baseWidth, baseHeight;
    if (mediaAspect > canvasAspect) {
        baseWidth = width;
        baseHeight = width / mediaAspect;
    } else {
        baseHeight = height;
        baseWidth = height * mediaAspect;
    }

    const scaleFactor = scale / 100;
    const drawWidth = baseWidth * scaleFactor;
    const drawHeight = baseHeight * scaleFactor;
    const centerX = width / 2 + cx;
    const centerY = height / 2 + cy;

    // Rotate point around center to align with unrotated box
    const rad = -rotation * Math.PI / 180; // Negative for reverse rotation
    const dx = x - centerX;
    const dy = y - centerY;
    const rotatedX = dx * Math.cos(rad) - dy * Math.sin(rad);
    const rotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);

    // Check bounds
    const halfWidth = drawWidth / 2;
    const halfHeight = drawHeight / 2;

    return (
        rotatedX >= -halfWidth &&
        rotatedX <= halfWidth &&
        rotatedY >= -halfHeight &&
        rotatedY <= halfHeight
    );
};

/**
 * Check if a point is inside a text overlay's bounding box
 */
export const isPointInText = (x, y, textOverlay, canvasDimensions) => {
    const { width, height } = canvasDimensions;
    const { x: tx, y: ty, fontSize, fontFamily, fontWeight, text, rotation } = textOverlay;

    // Convert % position to px
    const centerX = (tx / 100) * width;
    const centerY = (ty / 100) * height;

    // Measure text
    const scaleFactor = height / 600;
    const scaledFontSize = fontSize * scaleFactor;
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = scaledFontSize; // Approximation, or use metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

    // Rotate point around center
    const rad = -rotation * Math.PI / 180;
    const dx = x - centerX;
    const dy = y - centerY;
    const rotatedX = dx * Math.cos(rad) - dy * Math.sin(rad);
    const rotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);

    // Check bounds (with some padding)
    const padding = 10;
    const halfWidth = textWidth / 2 + padding;
    const halfHeight = textHeight / 2 + padding;

    return (
        rotatedX >= -halfWidth &&
        rotatedX <= halfWidth &&
        rotatedY >= -halfHeight &&
        rotatedY <= halfHeight
    );
};

/**
 * Get handle at point for text/media
 */
export const getHandleAtPoint = (x, y, clip, canvasDimensions, mediaDimensions) => {
    const { width, height } = canvasDimensions;
    const transform = clip.transform || {}; // For media
    // For text, clip is the text object itself, so we need to normalize properties
    const isText = clip.type === 'text';

    let cx, cy, scale, rotation, drawWidth, drawHeight;

    if (isText) {
        cx = (clip.x / 100) * width;
        cy = (clip.y / 100) * height;
        scale = 100; // Text scale handled by fontSize
        rotation = clip.rotation || 0;

        // Measure text
        const scaleFactor = height / 600;
        const scaledFontSize = clip.fontSize * scaleFactor;
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${clip.fontWeight} ${scaledFontSize}px ${clip.fontFamily}`;
        const metrics = ctx.measureText(clip.text);
        drawWidth = metrics.width + 20;
        drawHeight = scaledFontSize + 20;
    } else {
        const { x: tx = 0, y: ty = 0, scale: s = 100, rotation: r = 0 } = transform;
        cx = width / 2 + tx;
        cy = height / 2 + ty;
        scale = s;
        rotation = r;

        // Calculate media dimensions
        const mediaAspect = mediaDimensions.width / mediaDimensions.height;
        const canvasAspect = width / height;
        let baseWidth, baseHeight;
        if (mediaAspect > canvasAspect) {
            baseWidth = width;
            baseHeight = width / mediaAspect;
        } else {
            baseHeight = height;
            baseWidth = height * mediaAspect;
        }
        const scaleFactor = scale / 100;
        drawWidth = baseWidth * scaleFactor;
        drawHeight = baseHeight * scaleFactor;
    }

    // Rotate point around center to align with unrotated box
    const rad = -rotation * Math.PI / 180;
    const dx = x - cx;
    const dy = y - cy;
    const rotatedX = dx * Math.cos(rad) - dy * Math.sin(rad);
    const rotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);

    const handleSize = 10; // Hit area size
    const halfWidth = drawWidth / 2;
    const halfHeight = drawHeight / 2;

    // Check handles
    const handles = [
        { name: 'tl', x: -halfWidth, y: -halfHeight },
        { name: 'tr', x: halfWidth, y: -halfHeight },
        { name: 'br', x: halfWidth, y: halfHeight },
        { name: 'bl', x: -halfWidth, y: halfHeight },
        { name: 'rot', x: 0, y: -halfHeight - 20 }
    ];

    for (const h of handles) {
        if (
            rotatedX >= h.x - handleSize &&
            rotatedX <= h.x + handleSize &&
            rotatedY >= h.y - handleSize &&
            rotatedY <= h.y + handleSize
        ) {
            return h;
        }
    }

    return null;
};

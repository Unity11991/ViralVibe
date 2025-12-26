/**
 * Canvas Utilities for MediaEditor
 * Handles all canvas rendering operations
 * OPTIMIZED FOR HD VIDEO PERFORMANCE
 */

import { detectFaces, applySkinSmoothing, applyTeethWhitening } from './aiFaceService';
import { getGrainTexture, getVignetteGradient } from './textureCache';
import { getBackgroundRemovalProcessor } from './BackgroundRemovalProcessor';

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
 * OPTIMIZED: Added LRU eviction, size tracking, and automatic cleanup
 */
const CanvasPool = {
    pool: [],
    maxPoolSize: 15,
    lastCleanup: Date.now(),
    cleanupInterval: 30000, // Clean up every 30 seconds

    get(width, height) {
        // Periodic cleanup to prevent memory leaks
        this.periodicCleanup();

        // Try to find a canvas with matching or larger dimensions
        const index = this.pool.findIndex(c =>
            c.width >= width && c.height >= height &&
            c.width <= width * 1.2 && c.height <= height * 1.2 // Avoid huge canvases
        );

        let canvas;
        if (index !== -1) {
            canvas = this.pool.splice(index, 1)[0];
        } else {
            canvas = document.createElement('canvas');
        }

        canvas.width = width;
        canvas.height = height;
        canvas._lastUsed = Date.now();
        return canvas;
    },

    release(canvas) {
        if (!canvas) return;

        // Only keep canvases that are reasonably sized
        const size = canvas.width * canvas.height * 4; // RGBA bytes
        const maxSize = 1920 * 1080 * 4 * 2; // Max 2x 1080p canvases

        if (this.pool.length < this.maxPoolSize && size < maxSize) {
            canvas._lastUsed = Date.now();
            this.pool.push(canvas);
        }
    },

    periodicCleanup() {
        const now = Date.now();
        if (now - this.lastCleanup < this.cleanupInterval) return;

        // Remove canvases not used in last 60 seconds
        this.pool = this.pool.filter(c => now - (c._lastUsed || 0) < 60000);
        this.lastCleanup = now;
    },

    clear() {
        this.pool = [];
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

    const { mask = null, faceRetouch = null, isPlaying = false, backgroundRemoval = null, clipId = null, currentTime = 0 } = options;

    const { clearCanvas = true } = options;

    ctx.save();
    if (clearCanvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // HD VIDEO OPTIMIZATION: Skip heavy filters during playback for performance
    // Only apply full filters when paused or during export
    if (options.applyFiltersToContext !== false && !isPlaying) {
        let filterString = buildFilterString(filters);

        // DEEP PIXEL ENGINE: Append SVG Filter reference
        if (filters.pixelMode && filters.pixelMode !== 'none') {
            filterString = `${filterString} url(#${filters.pixelMode})`.trim();
        }

        ctx.filter = filterString;
    } else if (isPlaying) {
        // Apply only basic adjustments during playback (faster)
        const brightness = filters.brightness || 0;
        const contrast = filters.contrast || 0;
        const saturation = filters.saturation || 0;

        const quickFilters = [];
        if (brightness !== 0) quickFilters.push(`brightness(${100 + brightness}%)`);
        if (contrast !== 0) quickFilters.push(`contrast(${100 + contrast}%)`);
        if (saturation !== 0) quickFilters.push(`saturate(${100 + saturation}%)`);

        // Enable lighter SVG filters during playback if needed, or skip for performance
        // For now, let's skip deep pixel filters during playback to ensure 60fps

        ctx.filter = quickFilters.length > 0 ? quickFilters.join(' ') : 'none';
    } else {
        ctx.filter = 'none';
    }

    // Apply Opacity and Blend Mode
    ctx.globalAlpha = opacity / 100;
    ctx.globalCompositeOperation = blendMode;

    // 1. Calculate Source Rectangle (Crop)
    const mediaWidth = media.videoWidth || media.width;
    const mediaHeight = media.videoHeight || media.height;

    // Default to full media
    let sourceX = 0, sourceY = 0, sourceW = mediaWidth, sourceH = mediaHeight;
    let cropLeft = 0, cropTop = 0, cropRight = 0, cropBottom = 0;

    if (crop) {
        const { left = 0, top = 0, right = 0, bottom = 0 } = crop;
        cropLeft = left;
        cropTop = top;
        cropRight = right;
        cropBottom = bottom;

        sourceX = (left / 100) * mediaWidth;
        sourceY = (top / 100) * mediaHeight;
        sourceW = mediaWidth - ((left + right) / 100) * mediaWidth;
        sourceH = mediaHeight - ((top + bottom) / 100) * mediaHeight;
    }

    // 2. Calculate Destination Rectangle (Transform)
    // PREMIERE STYLE: Calculate fit based on ORIGINAL (uncropped) dimensions
    // This ensures the image scale doesn't change when cropping
    const mediaAspect = mediaWidth / mediaHeight;
    const canvasAspect = logicalWidth / logicalHeight;

    let baseWidth, baseHeight;

    // "Contain" logic (Fit within canvas) based on ORIGINAL media
    if (mediaAspect > canvasAspect) {
        baseWidth = logicalWidth;
        baseHeight = logicalWidth / mediaAspect;
    } else {
        baseHeight = logicalHeight;
        baseWidth = logicalHeight * mediaAspect;
    }

    // Apply User Transform (Scale/Rotation)
    const scaleFactor = scale / 100;
    const fullDrawWidth = baseWidth * scaleFactor;
    const fullDrawHeight = baseHeight * scaleFactor;

    // Calculate the destination size of the CROPPED portion
    // It should be proportional to the source crop
    const drawWidth = fullDrawWidth * (sourceW / mediaWidth);
    const drawHeight = fullDrawHeight * (sourceH / mediaHeight);

    // Calculate Center Position
    // The "center" (x, y) refers to the center of the FULL image (or the layer's anchor point)
    // We need to find where to draw the top-left of the cropped piece relative to that center.

    // Center of the canvas + user offset
    const centerX = logicalWidth / 2 + x;
    const centerY = logicalHeight / 2 + y;

    // Offset of the cropped piece relative to the full image center
    // Full image top-left relative to center is (-fullDrawWidth/2, -fullDrawHeight/2)
    // Crop starts at (cropLeft% * fullDrawWidth) from the left
    const cropOffsetX = (cropLeft / 100) * fullDrawWidth;
    const cropOffsetY = (cropTop / 100) * fullDrawHeight;

    // The draw position (relative to the translated center)
    // We want to draw at: (OriginalTopLeft + CropOffset)
    const drawX = -fullDrawWidth / 2 + cropOffsetX;
    const drawY = -fullDrawHeight / 2 + cropOffsetY;



    // 3. Draw with Filters, Transforms, and Masks

    // Check Readiness
    const isReady = media instanceof HTMLVideoElement
        ? media.readyState >= 1
        : (media instanceof HTMLImageElement ? media.complete : true);

    const drawIt = (context) => {
        if (isReady) {
            try {
                context.drawImage(
                    media,
                    sourceX, sourceY, sourceW, sourceH,
                    drawX, drawY, drawWidth, drawHeight
                );
            } catch (e) {
                // Fallback
                context.fillStyle = '#000000';
                context.fillRect(drawX, drawY, drawWidth, drawHeight);
            }
        } else {
            context.fillStyle = '#000000';
            context.fillRect(drawX, drawY, drawWidth, drawHeight);
        }
    };

    // Background Removal Processing (for videos with backgroundRemoval enabled)
    if (backgroundRemoval && backgroundRemoval.enabled && media instanceof HTMLVideoElement) {
        const processor = getBackgroundRemovalProcessor();

        // Ensure processor is initialized with current quality setting
        const quality = backgroundRemoval.quality || 'balanced';
        if (!processor.isInitialized || processor.currentQuality !== quality) {
            processor.initialize(quality).catch(err => console.error('BG Removal init error:', err));
        }

        // Process current frame to get segmentation mask (async but cached)
        processor.processFrame(media, currentTime, clipId).then(maskData => {
            if (!maskData) return;

            // Apply background removal mask in a separate compositing pass
            // This modifies the canvas after the main draw
            const tempCanvas = getCachedCanvas(logicalWidth, logicalHeight);
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

            // Copy current canvas content to temp
            tempCtx.clearRect(0, 0, logicalWidth, logicalHeight);
            tempCtx.drawImage(canvas, 0, 0);

            // Create mask image from mask data
            const maskCanvas = getCachedCanvas(maskData.width, maskData.height);
            const maskCtx = maskCanvas.getContext('2d');
            maskCtx.putImageData(maskData, 0, 0);

            // Apply mask as alpha channel
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(maskCanvas, 0, 0, logicalWidth, logicalHeight);

            //'Clear main canvas and draw masked result
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);

            releaseCanvas(tempCanvas);
            releaseCanvas(maskCanvas);
        }).catch(err => {
            console.error('Background removal error:', err);
            // Continue without background removal on error
        });
    }


    // Soft Masking (Composite)
    if (mask && mask.type !== 'none' && (mask.blur > 0 || mask.type === 'text' || mask.type === 'image')) {
        const tempCanvas = getCachedCanvas(logicalWidth, logicalHeight);
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.clearRect(0, 0, logicalWidth, logicalHeight);

        // Draw Media to Temp
        tempCtx.save();
        tempCtx.translate(centerX, centerY);
        tempCtx.rotate((rotation * Math.PI) / 180);
        drawIt(tempCtx);
        tempCtx.restore();

        // Composite Mask
        tempCtx.globalCompositeOperation = 'destination-in';
        const blurAmount = mask.blur || 0;
        tempCtx.filter = `blur(${blurAmount}px)`;

        if (mask.type === 'image' && mask.media) {
            const maskCanvas = getCachedCanvas(logicalWidth, logicalHeight);
            const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
            maskCtx.clearRect(0, 0, logicalWidth, logicalHeight);

            // Check readiness
            const isReady = mask.media instanceof HTMLVideoElement
                ? mask.media.readyState >= 1
                : (mask.media instanceof HTMLImageElement ? mask.media.complete : true);

            if (isReady) {
                maskCtx.save();
                maskCtx.translate(centerX, centerY);
                maskCtx.rotate((rotation * Math.PI) / 180);
                drawMask(maskCtx, mask, fullDrawWidth, fullDrawHeight, false);
                maskCtx.restore();

                // Convert Luma to Alpha
                const imgData = maskCtx.getImageData(0, 0, logicalWidth, logicalHeight);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    data[i + 3] = data[i]; // Red -> Alpha
                }
                maskCtx.putImageData(imgData, 0, 0);
            } else {
                // Not ready: Draw White (Keep everything)
                maskCtx.fillStyle = '#FFFFFF';
                maskCtx.fillRect(0, 0, logicalWidth, logicalHeight);
            }

            // Apply Alpha Mask
            tempCtx.save();
            tempCtx.setTransform(1, 0, 0, 1, 0, 0);
            tempCtx.drawImage(maskCanvas, 0, 0);
            tempCtx.restore();

            releaseCanvas(maskCanvas);
        } else {
            // Standard Shape/Text Mask
            tempCtx.save();
            tempCtx.translate(centerX, centerY);
            tempCtx.rotate((rotation * Math.PI) / 180);
            drawMask(tempCtx, mask, fullDrawWidth, fullDrawHeight, false);
            tempCtx.restore();
        }

        // Reset
        tempCtx.globalCompositeOperation = 'source-over';
        tempCtx.filter = 'none';

        ctx.drawImage(tempCanvas, 0, 0);

        // Release temp canvas
        releaseCanvas(tempCanvas);
    } else {
        // Hard Masking or No Mask
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);

        if (mask && mask.type !== 'none') {
            drawMask(ctx, mask, fullDrawWidth, fullDrawHeight, true);
        }

        // NEURAL ENHANCE ALGORITHM: Multi-pass compositing
        // Check if we need advanced processing
        const hasEnhance = filters.sharpen > 0 || filters.clarity > 0 || filters.superRes || (faceRetouch && faceRetouch.smoothSkin > 0);

        if (hasEnhance && !isPlaying) { // Only run full algorithm when paused/exporting for performance
            // 1. Draw Base Layer
            drawIt(ctx);

            // SUPER RESOLUTION (AI Upscaling Simulation)
            if (filters.superRes) {
                // Creates a "fake" high-res look by aggressively enhancing micro-contrast
                // This simulates the "hallucinated" details of GAN upscalers
                ctx.save();
                ctx.globalCompositeOperation = 'overlay';
                ctx.globalAlpha = 0.6; // Strong effect

                // Frequency Separation Trick:
                // High contrast + Grayscale + Slight Blur = Extracts structural edges
                ctx.filter = `contrast(200%) grayscale(100%) brightness(120%) drop-shadow(0 0 1px rgba(255,255,255,0.5))`;
                drawIt(ctx);

                // Second pass to fill in the "texture"
                ctx.globalCompositeOperation = 'soft-light';
                ctx.globalAlpha = 0.4;
                ctx.filter = `contrast(150%) sepia(10%)`; // Slight warmth adds "richness"
                drawIt(ctx);

                ctx.restore();
            }

            // 2. "Clarity/Structure" Pass (Overlay High-Pass Sim)
            if (filters.clarity > 0 || filters.sharpen > 0) {
                // ... (Existing logic) ...
                ctx.save();
                ctx.globalCompositeOperation = 'overlay';
                ctx.globalAlpha = (filters.clarity / 200) + (filters.sharpen / 400);
                ctx.filter = `contrast(150%) grayscale(100%)`;
                drawIt(ctx);
                ctx.restore();
            }

            // 3. "Edge Sharpen" Pass 
            if (filters.sharpen > 50) {
                // ... (Existing logic) ...
                ctx.save();
                ctx.globalCompositeOperation = 'soft-light';
                ctx.globalAlpha = (filters.sharpen - 50) / 200;
                ctx.filter = `contrast(200%) brightness(110%) grayscale(100%)`;
                drawIt(ctx);
                ctx.restore();
            }

            // 4. "Soft Skin / Beauty" Pass 
            if (faceRetouch && faceRetouch.smoothSkin > 0) {
                // ... (Existing logic) ...
                ctx.save();
                ctx.globalCompositeOperation = 'soft-light';
                ctx.globalAlpha = faceRetouch.smoothSkin / 200;
                ctx.filter = `blur(${Math.max(2, faceRetouch.smoothSkin / 10)}px) brightness(110%)`;
                drawIt(ctx);
                ctx.restore();
            }

        } else {
            // Standard Render (Fast)
            drawIt(ctx);
        }

        ctx.restore();
    }

    ctx.restore();

    // Apply face retouching if enabled (after drawing and restoring context)
    if (faceRetouch && (faceRetouch.smoothSkin > 0 || faceRetouch.whitenTeeth > 0)) {
        applyFaceRetouchingToCanvas(ctx, media, faceRetouch, transform, canvasDimensions);
    }
};

/**
 * Apply face retouching effects to the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLVideoElement|HTMLImageElement} media - Media element
 * @param {Object} faceRetouch - Face retouch settings
 * @param {Object} transform - Transform settings
 * @param {Object} canvasDimensions - Canvas dimensions
 */
const applyFaceRetouchingToCanvas = async (ctx, media, faceRetouch, transform, canvasDimensions) => {
    try {
        // Detect faces in the media
        const faces = await detectFaces(media);

        if (faces.length === 0) {
            return; // No faces detected
        }

        const { width: logicalWidth, height: logicalHeight } = canvasDimensions;
        const mediaWidth = media.videoWidth || media.width;
        const mediaHeight = media.videoHeight || media.height;

        // 1. Calculate Full Image Dimensions (same as drawMediaToCanvas)
        const mediaAspect = mediaWidth / mediaHeight;
        const canvasAspect = logicalWidth / logicalHeight;

        let baseWidth, baseHeight;
        if (mediaAspect > canvasAspect) {
            baseWidth = logicalWidth;
            baseHeight = logicalWidth / mediaAspect;
        } else {
            baseHeight = logicalHeight;
            baseWidth = logicalHeight * mediaAspect;
        }

        const scaleFactor = (transform.scale || 100) / 100;
        const fullDrawWidth = baseWidth * scaleFactor;
        const fullDrawHeight = baseHeight * scaleFactor;

        // 2. Calculate Position of Full Image Top-Left
        const centerX = logicalWidth / 2 + (transform.x || 0);
        const centerY = logicalHeight / 2 + (transform.y || 0);

        const fullImageX = centerX - fullDrawWidth / 2;
        const fullImageY = centerY - fullDrawHeight / 2;

        // 3. Calculate Clipping Region (Crop)
        const { crop } = transform;
        let clipX = fullImageX;
        let clipY = fullImageY;
        let clipW = fullDrawWidth;
        let clipH = fullDrawHeight;

        if (crop) {
            const { left = 0, top = 0, right = 0, bottom = 0 } = crop;
            const cropLeftPx = (left / 100) * fullDrawWidth;
            const cropTopPx = (top / 100) * fullDrawHeight;
            const cropRightPx = (right / 100) * fullDrawWidth;
            const cropBottomPx = (bottom / 100) * fullDrawHeight;

            clipX = fullImageX + cropLeftPx;
            clipY = fullImageY + cropTopPx;
            clipW = fullDrawWidth - cropLeftPx - cropRightPx;
            clipH = fullDrawHeight - cropTopPx - cropBottomPx;
        }

        // 4. Map Faces
        const canvasFaces = faces.map(face => ({
            x: fullImageX + (face.x / mediaWidth) * fullDrawWidth,
            y: fullImageY + (face.y / mediaHeight) * fullDrawHeight,
            width: (face.width / mediaWidth) * fullDrawWidth,
            height: (face.height / mediaHeight) * fullDrawHeight,
            landmarks: face.landmarks
        }));

        // 5. Apply Effects with Clipping
        ctx.save();
        ctx.beginPath();
        ctx.rect(clipX, clipY, clipW, clipH);
        ctx.clip();

        if (faceRetouch.smoothSkin > 0) {
            applySkinSmoothing(ctx, canvasFaces, faceRetouch.smoothSkin);
        }

        if (faceRetouch.whitenTeeth > 0) {
            applyTeethWhitening(ctx, canvasFaces, faceRetouch.whitenTeeth);
        }

        ctx.restore();

    } catch (error) {
        // Silently fail - face detection may not be ready yet
    }
};

/**
 * Build CSS filter string from adjustment values
 * OPTIMIZED: Added caching to avoid rebuilding on every frame
 * @param {Object} adjustments - Filter adjustment values
 * @returns {string} CSS filter string
 */

// Filter cache to avoid rebuilding expensive strings
const filterStringCache = new Map();
let cacheHits = 0;
let cacheMisses = 0;

export const buildFilterString = (adjustments = {}) => {
    // Create cache key from adjustments
    const cacheKey = JSON.stringify(adjustments);

    if (filterStringCache.has(cacheKey)) {
        cacheHits++;
        return filterStringCache.get(cacheKey);
    }

    cacheMisses++;

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

    const result = filters.length > 0 ? filters.join(' ') : 'none';

    // Cache the result (limit cache size)
    if (filterStringCache.size > 100) {
        // Clear oldest entries (simple FIFO)
        const firstKey = filterStringCache.keys().next().value;
        filterStringCache.delete(firstKey);
    }
    filterStringCache.set(cacheKey, result);

    return result;
};

// Export cache clear function
export const clearFilterCache = () => {
    filterStringCache.clear();
    cacheHits = 0;
    cacheMisses = 0;
};

/**
 * Draw vignette effect
 * OPTIMIZED: Uses cached gradient texture instead of creating on every call
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} intensity - Vignette intensity (0-100)
 */
export const drawVignette = (ctx, intensity, canvasDimensions = null) => {
    if (intensity <= 0) return;

    const canvas = ctx.canvas;
    const { width: logicalWidth, height: logicalHeight } = canvasDimensions || { width: canvas.width, height: canvas.height };

    // Use cached vignette gradient
    const vignetteTexture = getVignetteGradient(logicalWidth, logicalHeight, intensity);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(vignetteTexture, 0, 0, logicalWidth, logicalHeight);
    ctx.restore();
};

/**
 * Draw grain effect
 * OPTIMIZED: Uses pre-generated cached texture instead of pixel manipulation
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} intensity - Grain intensity (0-100)
 */
export const drawGrain = (ctx, intensity) => {
    if (intensity <= 0) return;

    const canvas = ctx.canvas;

    // Use cached grain texture (much faster than getImageData/putImageData)
    const grainTexture = getGrainTexture(canvas.width, canvas.height, intensity);

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(intensity / 100, 0.8); // Cap opacity
    ctx.drawImage(grainTexture, 0, 0);
    ctx.restore();
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
    const mediaW = stickerImage instanceof HTMLVideoElement ? stickerImage.videoWidth : stickerImage.width;
    const mediaH = stickerImage instanceof HTMLVideoElement ? stickerImage.videoHeight : stickerImage.height;

    if (!stickerImage || !mediaW || !mediaH) return;

    const {
        transform = {}
    } = sticker;

    const {
        x = 0, y = 0,
        scale = 100,
        rotation = 0
    } = transform;

    // Normalizing scale (from percentage to factor)
    const normScale = scale / 100;

    const posX = canvasWidth / 2 + x;
    const posY = canvasHeight / 2 + y;
    const scaleFactor = canvasHeight / 600;

    // Base size 150px at 600p height
    const stickerWidth = 150 * normScale * scaleFactor;
    const stickerHeight = (150 * (mediaH / mediaW)) * normScale * scaleFactor;

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
        transition = null,
        faceRetouch = null,
        backgroundRemoval = null
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
    if ((type === 'video' || type === 'image') && transition) {
        // --- OFF-SCREEN TRANSITION RENDERING ---
        // Render layer to temp canvas, apply transition mask, then draw to main
        const { width, height } = canvasDimensions;

        // 1. Get temp canvas (Physical size to match context)
        // ensure we use the same dimensions as the context (which are physical)
        // logic passed 'canvasDimensions' which might be logical. 
        // drawMediaToCanvas handles scaling if needed.
        // Let's rely on standard flow:

        const tempCanvas = getCachedCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.clearRect(0, 0, width, height);

        // 2. Draw Media to Temp (Standard Draw)
        drawMediaToCanvas(tempCtx, media, adjustments, transform, canvasDimensions, memePadding, {
            applyFiltersToContext: true,
            clearCanvas: false,
            mask: mask,
            faceRetouch: faceRetouch,
            backgroundRemoval: backgroundRemoval,
            clipId: layer.id,
            currentTime: globalState.currentTime || 0
        });

        // 3. Apply Transition Mask (Destination-In)
        applyTransitionMask(tempCtx, transition, width, height);

        // 4. Draw Templ to Main
        ctx.save();
        // The temp canvas matches the logical dimensions we are drawing into?
        // drawMediaToCanvas renders to tempCtx filling it based on logic.
        ctx.drawImage(tempCanvas, 0, 0, width, height);
        ctx.restore();

        releaseCanvas(tempCanvas);

    } else if (type === 'video' || type === 'image') {
        // Standard Draw (No Transition)
        drawMediaToCanvas(ctx, media, adjustments, transform, canvasDimensions, memePadding, {
            applyFiltersToContext: true,
            clearCanvas: false,
            mask: mask,
            faceRetouch: faceRetouch,
            backgroundRemoval: backgroundRemoval,
            clipId: layer.id,
            currentTime: globalState.currentTime || 0
        });
    } else if (type === 'text') {
        drawTextOverlay(ctx, layer, canvasDimensions.width, canvasDimensions.height);
    } else if (type === 'sticker') {
        drawStickerOverlay(ctx, layer, layer.media, canvasDimensions.width, canvasDimensions.height);
    }

    else if (type === 'adjustment') {
        // Adjustment Layer Logic: Snapshot -> Filter -> Draw Back
        // We need a temp canvas of PHYSICAL size to maintain quality
        const physWidth = ctx.canvas.width;
        const physHeight = ctx.canvas.height;

        const tempCanvasPhys = getCachedCanvas(physWidth, physHeight);
        const tempCtxPhys = tempCanvasPhys.getContext('2d', { willReadFrequently: true });
        tempCtxPhys.clearRect(0, 0, physWidth, physHeight);
        tempCtxPhys.drawImage(ctx.canvas, 0, 0);

        // 2. Clear Main Canvas (to be replaced)

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
        ctx.filter = buildFilterString(adjustments || {});

        // 4. Draw Back
        // We draw the physical temp canvas into the logical space?
        // transform is not applied to ctx, but ctx has global scale.
        // default drawImage(image, 0, 0, logicalW, logicalH) to fit?
        ctx.drawImage(tempCanvasPhys, 0, 0, canvasDimensions.width, canvasDimensions.height);

        ctx.restore();
        // Reset filter? restore handles it.

        releaseCanvas(tempCanvasPhys);
    }
    // Duplicate else-if blocks removed


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
            drawSelectionBox(ctx, transform, canvasDimensions, dims, type);

            if (layer.mask && layer.mask.type === 'filmstrip') {
                drawMaskOverlay(ctx, transform, layer.mask, mediaW, mediaH, canvasDimensions);
            }
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
export const renderFrame = (ctx, media, state, options = { applyFiltersToContext: true, isPreview: false }) => {
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
            effectIntensity,
            isPreview: options.isPreview // Pass preview flag to layers
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

    // Draw Watermark (Export Only)
    if (options.isExport) {
        drawWatermark(ctx, dimensions.width, dimensions.height);
    }
};

/**
 * Draw GoVyral Watermark
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} width 
 * @param {number} height 
 */
const drawWatermark = (ctx, width, height) => {
    ctx.save();

    // Scale font based on resolution (base 1080p)
    const scale = Math.max(0.5, height / 1080);
    const fontSize = Math.round(40 * scale);
    const padding = Math.round(30 * scale);

    ctx.globalAlpha = 0.6; // Faded
    ctx.font = `${fontSize}px "Rock Salt", cursive`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    // Shadow for visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4 * scale;
    ctx.shadowOffsetX = 2 * scale;
    ctx.shadowOffsetY = 2 * scale;

    ctx.fillText('GoVyral', width - padding, height - padding);

    ctx.restore();
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
    const { type, x = 0, y = 0, scale = 100, scaleX, scaleY, rotation = 0 } = mask;

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
        // Support non-uniform scaling if provided
        // Default to square based on min dimension if only scale is provided
        let rectW = maskSize;
        let rectH = maskSize;

        if (scaleX !== undefined) rectW = width * (scaleX / 100);
        if (scaleY !== undefined) rectH = height * (scaleY / 100);

        ctx.rect(-rectW / 2, -rectH / 2, rectW, rectH);
    } else if (type === 'filmstrip') {
        // Filmstrip: Wide rectangle with aspect ratio ~2.35:1
        // scaleX affects width, scaleY affects height (opening)

        const sX = (scaleX !== undefined ? scaleX : scale) / 100;
        const sY = (scaleY !== undefined ? scaleY : scale) / 100;

        const stripWidth = width * sX;
        const stripHeight = (width / 2.35) * sY;

        ctx.rect(-stripWidth / 2, -stripHeight / 2, stripWidth, stripHeight);
    } else if (type === 'text') {
        const { text = 'Default text', fontSize = 40, fontFamily = 'Arial', isBold, isItalic, textAlign = 'center' } = mask;

        ctx.save();
        const s = scale / 100;
        ctx.scale(s, s);

        // Apply resolution scaling to match drawTextOverlay (Design Ref: 600px height)
        const refScale = ctx.canvas.height / 600;
        const scaledFontSize = fontSize * refScale;

        ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${scaledFontSize}px ${fontFamily}`;
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
    } else if (type === 'image' && mask.media) {
        // Image/Video Mask
        // Draw the mask media to fill the mask area
        // We assume the mask media is black/white or alpha
        // If it's a video mask, it should be playing in sync (handled by renderLogic passing the right element)

        // Ensure media is ready
        const isReady = mask.media instanceof HTMLVideoElement
            ? mask.media.readyState >= 1
            : (mask.media instanceof HTMLImageElement ? mask.media.complete : true);

        // console.log('Drawing Mask:', { isReady, media: mask.media, width, height });

        if (isReady) {
            // Draw mask media covering the area
            // We use the same dimensions as the main media (width/height)
            // But we are translated to maskX, maskY (relative to center?)
            // Wait, drawMask logic:
            // ctx.translate(maskX, maskY); where maskX/Y are offsets from 0,0 (top-left of media?)
            // drawMediaToCanvas translates to center of canvas, then rotates.
            // Then it calls drawMask.
            // If mask.x/y are 0 (default), we are at the center of the media.
            // We want to draw the mask matching the media exactly.

            // If mask is generated from the video, it should match 1:1.
            // So we draw it centered at 0,0 with width/height.

            // However, drawMask context is already translated/rotated to match the media.
            // So drawing at -width/2, -height/2 should align it perfectly.

            // Note: maskX/Y allow offsetting the mask.
            // If mask is "attached" to video, x/y should be 0.

            // Also, we need to handle aspect ratio if mask differs?
            // For generated masks, they match source.

            ctx.drawImage(mask.media, -width / 2, -height / 2, width, height);

            // If this is a hard clip (clip=true), we need a path.
            // Image cannot be a path.
            // So for image masks, we MUST use soft masking (composite operations).
            // If clip is true, we can't do anything here.
            // We need to ensure drawMediaToCanvas uses soft masking for 'image' type.
        }
    }

    ctx.restore();

    if (clip) {
        ctx.clip();
    } else {
        ctx.fill();
    }
};

/**
 * Draw overlay controls for mask (Filmstrip handles)
 */
/**
 * Draw overlay controls for mask (Filmstrip handles)
 */
export const drawMaskOverlay = (ctx, transform, mask, width, height, canvasDimensions) => {
    const { type, x = 0, y = 0, scale = 100, scaleX, scaleY, rotation = 0 } = mask;
    if (type !== 'filmstrip') return;

    // 1. Apply Clip Transform
    const { x: cxOffset = 0, y: cyOffset = 0, scale: cScale = 100, rotation: cRotation = 0 } = transform;
    const cx = canvasDimensions.width / 2 + cxOffset;
    const cy = canvasDimensions.height / 2 + cyOffset;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((cRotation * Math.PI) / 180);
    ctx.scale(cScale / 100, cScale / 100);

    // 2. Apply Mask Transform (Relative to Clip)
    const maskX = (x / 100) * width;
    const maskY = (y / 100) * height;

    const sX = (scaleX !== undefined ? scaleX : scale) / 100;
    const sY = (scaleY !== undefined ? scaleY : scale) / 100;

    const stripWidth = width * sX;
    const stripHeight = (width / 2.35) * sY;

    ctx.translate(maskX, maskY);
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2 / (cScale / 100); // Counter-scale linewidth
    ctx.setLineDash([5, 5]);

    // Draw bounding box
    ctx.strokeRect(-stripWidth / 2, -stripHeight / 2, stripWidth, stripHeight);

    ctx.setLineDash([]);
    ctx.fillStyle = '#ff0000';

    // Draw Handles
    // Scale handles inversely to clip scale so they remain constant size on screen?
    // Or just let them scale. Let's keep them constant size for better UX.
    const globalScale = cScale / 100;
    const handleSize = 8 / globalScale;

    const halfW = stripWidth / 2;
    const halfH = stripHeight / 2;

    // Top Handle
    ctx.beginPath();
    ctx.arc(0, -halfH, handleSize, 0, Math.PI * 2);
    ctx.fill();

    // Bottom Handle
    ctx.beginPath();
    ctx.arc(0, halfH, handleSize, 0, Math.PI * 2);
    ctx.fill();

    // Left Handle
    ctx.beginPath();
    ctx.arc(-halfW, 0, handleSize, 0, Math.PI * 2);
    ctx.fill();

    // Right Handle
    ctx.beginPath();
    ctx.arc(halfW, 0, handleSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
};

/**
 * Hit test for mask handles
 */
export const getMaskHandleAtPoint = (px, py, mask, width, height) => {
    const { type, x = 0, y = 0, scale = 100, scaleX, scaleY, rotation = 0 } = mask;
    if (type !== 'filmstrip') return null;

    const maskX = (x / 100) * width;
    const maskY = (y / 100) * height;

    // Transform point to local mask space
    // 1. Translate back
    let dx = px - maskX;
    let dy = py - maskY;

    // 2. Rotate back
    const rad = -(rotation * Math.PI) / 180;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    const sX = (scaleX !== undefined ? scaleX : scale) / 100;
    const sY = (scaleY !== undefined ? scaleY : scale) / 100;

    const stripWidth = width * sX;
    const stripHeight = (width / 2.35) * sY;
    const halfW = stripWidth / 2;
    const halfH = stripHeight / 2;
    const hitRadius = 15;

    // Check Handles
    if (Math.abs(lx - 0) < hitRadius && Math.abs(ly - (-halfH)) < hitRadius) return 'mask-top';
    if (Math.abs(lx - 0) < hitRadius && Math.abs(ly - halfH) < hitRadius) return 'mask-bottom';
    if (Math.abs(lx - (-halfW)) < hitRadius && Math.abs(ly - 0) < hitRadius) return 'mask-left';
    if (Math.abs(lx - halfW) < hitRadius && Math.abs(ly - 0) < hitRadius) return 'mask-right';

    return null;
};

/**
 * Apply transition mask to context
 */
export const applyTransitionMask = (ctx, transition, width, height) => {
    const { type, progress } = transition;
    const p = progress;

    ctx.save();

    // Default operation for masking incoming clip
    ctx.globalCompositeOperation = 'destination-in';

    if (type === 'fade' || type === 'mix' || type === 'gradual_fade' || type === 'none') {
        ctx.globalAlpha = p;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

    } else if (type === 'fade_black') {
        // Fallback to Cross Fade for mask logic
        ctx.globalAlpha = p;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

    } else if (type === 'blur_focus' || type === 'blur' || type === 'vertical_blur' || type === 'bubble_blur') {
        // Blur transition: Incoming clip starts blurry and fades in
        ctx.globalAlpha = p;
        const blurAmount = (1 - p) * 30;
        ctx.filter = `blur(${blurAmount}px)`;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

    } else if (type === 'whirl' || type === 'swirl_in' || type === 'paper_ball') {
        // Swirl In
        ctx.globalAlpha = p;
        const maxRadius = Math.sqrt(width * width + height * height) / 2;
        const spiralTurns = 2;
        const steps = 50;
        ctx.beginPath();
        ctx.moveTo(width / 2, height / 2);
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * p;
            const angle = t * spiralTurns * Math.PI * 2;
            const r = maxRadius * t;
            const x = width / 2 + Math.cos(angle) * r;
            const y = height / 2 + Math.sin(angle) * r;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width / 2, height / 2);
        ctx.fill();

    } else if (type === 'comparision' || type === 'wipe_left' || type === 'left') {
        // Simple Wipe Left
        ctx.beginPath();
        ctx.rect(0, 0, width * p, height);
        ctx.fill();

    } else if (type === 'wipe_right') {
        ctx.beginPath();
        ctx.rect(width * (1 - p), 0, width * p, height);
        ctx.fill();

    } else if (type === 'shake_zoom_in' || type === 'shaky_inhale' || type === 'tremble_zoom' || type === 'shock_zoom') {
        // Zoom reveal
        const maxRadius = Math.sqrt(width * width + height * height) / 1.5;
        ctx.beginPath();
        const r = maxRadius * p;
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'blink') {
        // Strobe
        const visible = Math.floor(p * 6) % 2 === 0; // 3 blinks
        ctx.globalAlpha = visible ? 1 : 0;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

    } else if (type === 'glare' || type === 'glasre' || type === 'gloss_wipe') {
        // Wipe with a "Glare" leading edge
        // 1. Mask
        ctx.beginPath();
        ctx.rect(0, 0, width * p, height);
        ctx.fill();

        // 2. Glare (Additive on top)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0 - Math.abs(0.5 - p) * 2;
        const grad = ctx.createLinearGradient(width * p - 50, 0, width * p + 50, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(width * p - 50, 0, 100, height);

    } else if (type === 'fast_swipe' || type === 'slide_fast') {
        // Slide with blur approximation
        ctx.filter = 'blur(10px)';
        ctx.beginPath();
        ctx.rect(0, 0, width * p, height);
        ctx.fill();
        ctx.filter = 'none';

    } else if (type === 'app_switch') {
        // Zoom reveal rect
        ctx.beginPath();
        const w = width * p;
        const h = height * p;
        const r = 20 * (1 - p);
        ctx.roundRect((width - w) / 2, (height - h) / 2, w, h, r);
        ctx.fill();

    } else if (type === 'slice_reveal' || type === 'slice_strips') {
        // Vertical strips
        const strips = 10;
        const stripW = width / strips;
        ctx.beginPath();
        for (let i = 0; i < strips; i++) {
            const delay = i * 0.05;
            const adjP = Math.max(0, Math.min(1, (p - delay) * 2));
            ctx.rect(i * stripW, 0, stripW, height * adjP);
        }
        ctx.fill();

    } else if (type === 'pull_in' || type === 'zoom_in') {
        const maxRadius = Math.sqrt(width * width + height * height) / 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, maxRadius * p, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'pull_out' || type === 'zoom_out') {
        // Iris In (Zoom out reveal)
        const maxRadius = Math.sqrt(width * width + height * height) / 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, maxRadius * p, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'twist_turn' || type === 'zoom_rotate_in') {
        const maxRadius = Math.sqrt(width * width + height * height) / 2;
        const r = maxRadius * p;
        const segments = 8;
        ctx.beginPath();
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2 - p * Math.PI * 2;
            const angle2 = ((i + 0.5) / segments) * Math.PI * 2 - p * Math.PI * 2;
            ctx.moveTo(width / 2, height / 2);
            ctx.arc(width / 2, height / 2, r, angle1, angle2);
            ctx.lineTo(width / 2, height / 2);
        }
        ctx.fill();

    } else if (type === 'film_erase' || type === 'dissolve') {
        // Noise Dissolve
        const scale = 0.1;
        const w = Math.ceil(width * scale);
        const h = Math.ceil(height * scale);
        const offCanvas = document.createElement('canvas');
        offCanvas.width = w;
        offCanvas.height = h;
        const offCtx = offCanvas.getContext('2d');
        const imageData = offCtx.createImageData(w, h);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = Math.random() < p ? 255 : 0;
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = alpha;
        }
        offCtx.putImageData(imageData, 0, 0);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offCanvas, 0, 0, width, height);
        ctx.restore();

    } else if (type === 'shake') {
        ctx.globalAlpha = p;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

    } else if (type === 'delay_zoom' || type === 'zoom_step') {
        const stepP = p < 0.5 ? 0.1 : (p - 0.5) * 2;
        const maxRadius = Math.sqrt(width * width + height * height) / 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, maxRadius * stepP, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'rotating_spotlight') {
        // Rotating Spotlight Effect (Radar Sweep)
        try {
            const gradient = ctx.createConicGradient(-Math.PI / 2, width / 2, height / 2);
            if (p > 0) {
                // White = Reveal, Transparent = Hide
                gradient.addColorStop(0, 'white');
                // Harder edge for the 'beam' start, smoother tail?
                // Or soft lead edge?
                // Let's do: 0 to P is WHITE. The edge at P fades out.
                gradient.addColorStop(Math.max(0, p - 0.1), 'white');
                gradient.addColorStop(p, 'rgba(255,255,255,0.5)');
                gradient.addColorStop(Math.min(1, p + 0.1), 'transparent');
                gradient.addColorStop(1, 'transparent');
            } else {
                gradient.addColorStop(0, 'transparent');
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        } catch (e) {
            // Fallback
            ctx.beginPath();
            ctx.moveTo(width / 2, height / 2);
            ctx.arc(width / 2, height / 2, Math.max(width, height), -Math.PI / 2, -Math.PI / 2 + (p * Math.PI * 2));
            ctx.lineTo(width / 2, height / 2);
            ctx.fill();
        }

    } else {
        // Fallback
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
export const applyTransitionFX = (ctx, transition, width, height, media, isPreview = false) => {
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
        } else if (type === 'glitch_digital') {
            // Digital artifacts
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const w = Math.random() * 100;
                const h = Math.random() * 20;
                ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, ${intensity / 40})`;
                ctx.fillRect(x, y, w, h);
            }
        } else if (type === 'glitch_scanline') {
            // Scanline effect
            for (let y = 0; y < height; y += 2) {
                ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * (intensity / 20)})`;
                ctx.fillRect(0, y, width, 1);
            }
        } else if (type === 'glitch_noise') {
            // Static noise
            // HD OPTIMIZATION: Skip expensive pixel manipulation during preview
            if (isPreview) {
                // Fast approximation using simple grain overlay
                drawGrain(ctx, intensity);
            } else {
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    if (Math.random() < intensity / 100) {
                        const noise = Math.random() * 255;
                        data[i] = noise;
                        data[i + 1] = noise;
                        data[i + 2] = noise;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            }
        } else if (type === 'glitch_displacement') {
            // Wave displacement
            const numSlices = 20;
            const sliceHeight = height / numSlices;
            for (let i = 0; i < numSlices; i++) {
                const offset = Math.sin(i * 0.5 + p * 10) * intensity;
                ctx.drawImage(ctx.canvas,
                    0, i * sliceHeight, width, sliceHeight,
                    offset, i * sliceHeight, width, sliceHeight
                );
            }
        } else if (type === 'glitch_block') {
            // Blocky compression artifacts
            const blockSize = 16;
            for (let x = 0; x < width; x += blockSize) {
                for (let y = 0; y < height; y += blockSize) {
                    if (Math.random() < intensity / 100) {
                        const offset = (Math.random() - 0.5) * blockSize;
                        ctx.drawImage(ctx.canvas,
                            x, y, blockSize, blockSize,
                            x + offset, y, blockSize, blockSize
                        );
                    }
                }
            }
        } else if (type === 'glitch_slice') {
            // Horizontal slicing
            const slices = 15;
            for (let i = 0; i < slices; i++) {
                const y = (height / slices) * i;
                const h = height / slices;
                const offset = (Math.random() - 0.5) * intensity * 3;
                ctx.drawImage(ctx.canvas, 0, y, width, h, offset, y, width, h);
            }
        } else if (type === 'glitch_shake') {
            // Camera shake
            const offsetX = (Math.random() - 0.5) * intensity;
            const offsetY = (Math.random() - 0.5) * intensity;
            ctx.drawImage(ctx.canvas, offsetX, offsetY);
        } else if (type === 'glitch_warp') {
            // Warp/distortion
            const segments = 5;
            for (let i = 0; i < segments; i++) {
                const y = (height / segments) * i;
                const h = height / segments;
                const scale = 1 + (Math.random() - 0.5) * (intensity / 50);
                const w = width * scale;
                ctx.drawImage(ctx.canvas, 0, y, width, h, (width - w) / 2, y, w, h);
            }
        }
    } else if (type.startsWith('blur_') || type === 'pixelate' || type === 'mosaic' || type === 'crystallize' || type === 'kaleidoscope' || type === 'dreamy') {
        const maxBlur = 20;
        const currentBlur = (type === 'blur_zoom' || type === 'dreamy') ? p * maxBlur : Math.sin(p * Math.PI) * maxBlur;

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
        } else if (type === 'blur_motion') {
            // Motion blur - directional
            ctx.globalAlpha = 0.2;
            for (let i = 1; i <= 5; i++) {
                ctx.drawImage(ctx.canvas, i * 5 * p, 0);
            }
        } else if (type === 'blur_radial') {
            // Radial blur from center
            ctx.globalAlpha = 0.15;
            for (let i = 1; i <= 6; i++) {
                const s = 1 + (i * 0.04 * p);
                const w = width * s;
                const h = height * s;
                ctx.drawImage(ctx.canvas, (width - w) / 2, (height - h) / 2, w, h);
            }
        } else if (type === 'blur_directional') {
            // Diagonal blur
            ctx.globalAlpha = 0.2;
            for (let i = 1; i <= 5; i++) {
                const offset = i * 4 * p;
                ctx.drawImage(ctx.canvas, offset, offset);
            }
        } else if (type === 'pixelate') {
            // Pixelation effect
            const pixelSize = Math.max(1, Math.floor(20 * Math.sin(p * Math.PI)));
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(ctx.canvas, 0, 0, width / pixelSize, height / pixelSize);
            ctx.drawImage(ctx.canvas, 0, 0, width / pixelSize, height / pixelSize, 0, 0, width, height);
            ctx.imageSmoothingEnabled = true;
        } else if (type === 'mosaic') {
            // Mosaic tiles
            const tileSize = Math.max(8, Math.floor(30 * Math.sin(p * Math.PI)));
            for (let x = 0; x < width; x += tileSize) {
                for (let y = 0; y < height; y += tileSize) {
                    const avgColor = ctx.getImageData(x + tileSize / 2, y + tileSize / 2, 1, 1).data;
                    ctx.fillStyle = `rgb(${avgColor[0]}, ${avgColor[1]}, ${avgColor[2]})`;
                    ctx.fillRect(x, y, tileSize, tileSize);
                }
            }
        } else if (type === 'crystallize') {
            // Crystalline effect
            const crystalSize = Math.max(15, Math.floor(50 * Math.sin(p * Math.PI)));
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(Math.random() * Math.PI);
                ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * Math.sin(p * Math.PI)})`;
                ctx.fillRect(-crystalSize / 2, -crystalSize / 2, crystalSize, crystalSize);
                ctx.restore();
            }
        } else if (type === 'kaleidoscope') {
            // Kaleidoscope mirror effect
            const segments = 6;
            for (let i = 0; i < segments; i++) {
                ctx.save();
                ctx.translate(width / 2, height / 2);
                ctx.rotate((i / segments) * Math.PI * 2);
                ctx.scale(i % 2 === 0 ? 1 : -1, 1);
                ctx.globalAlpha = 0.3;
                ctx.drawImage(ctx.canvas, -width / 2, -height / 2);
                ctx.restore();
            }
        } else if (type === 'dreamy') {
            // Soft dreamy glow
            ctx.filter = `blur(${currentBlur}px) brightness(110%)`;
            ctx.globalAlpha = 0.7;
            ctx.drawImage(ctx.canvas, 0, 0);
        }
    } else if (type.startsWith('color_') || type === 'hue_rotate' || type === 'saturation_fade' || type === 'sepia_fade' || type === 'grayscale_fade' || type === 'invert_fade' || type === 'posterize' || type === 'threshold' || type === 'solarize') {
        const intensity = Math.sin(p * Math.PI);

        if (type === 'color_burn') {
            ctx.globalCompositeOperation = 'color-burn';
            ctx.globalAlpha = intensity;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, width, height);
        } else if (type === 'color_dodge') {
            ctx.globalCompositeOperation = 'color-dodge';
            ctx.globalAlpha = intensity;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        } else if (type === 'hue_rotate') {
            const hue = p * 360;
            ctx.filter = `hue-rotate(${hue}deg)`;
            ctx.drawImage(ctx.canvas, 0, 0);
        } else if (type === 'saturation_fade') {
            const sat = 100 - (p * 100);
            ctx.filter = `saturate(${sat}%)`;
            ctx.drawImage(ctx.canvas, 0, 0);
        } else if (type === 'sepia_fade') {
            const sepia = p * 100;
            ctx.filter = `sepia(${sepia}%)`;
            ctx.drawImage(ctx.canvas, 0, 0);
        } else if (type === 'grayscale_fade') {
            const gray = p * 100;
            ctx.filter = `grayscale(${gray}%)`;
            ctx.drawImage(ctx.canvas, 0, 0);
        } else if (type === 'invert_fade') {
            const invert = p * 100;
            ctx.filter = `invert(${invert}%)`;
            ctx.drawImage(ctx.canvas, 0, 0);
        } else if (type === 'posterize') {
            // Posterization effect
            // HD OPTIMIZATION: Skip expensive pixel manipulation during preview
            if (isPreview) return;

            const levels = Math.max(2, Math.floor(8 * (1 - intensity)));
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.floor(data[i] / (256 / levels)) * (256 / levels);
                data[i + 1] = Math.floor(data[i + 1] / (256 / levels)) * (256 / levels);
                data[i + 2] = Math.floor(data[i + 2] / (256 / levels)) * (256 / levels);
            }
            ctx.putImageData(imageData, 0, 0);
        } else if (type === 'threshold') {
            // Black and white threshold
            // HD OPTIMIZATION: Fast approximation
            if (isPreview) {
                ctx.filter = `grayscale(100%) contrast(1000%)`;
                ctx.drawImage(ctx.canvas, 0, 0);
                return;
            }

            const threshold = 128 + (intensity * 100);
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const val = avg > threshold ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = val;
            }
            ctx.putImageData(imageData, 0, 0);
        } else if (type === 'solarize') {
            // Solarization effect
            // HD OPTIMIZATION: Fast approximation using difference blending
            if (isPreview) {
                ctx.globalCompositeOperation = 'difference';
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'source-over';
                return;
            }

            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const threshold = 128;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > threshold) data[i] = 255 - data[i];
                if (data[i + 1] > threshold) data[i + 1] = 255 - data[i + 1];
                if (data[i + 2] > threshold) data[i + 2] = 255 - data[i + 2];
            }
            ctx.putImageData(imageData, 0, 0);
        }
    } else if (type.startsWith('light_') || type === 'flash' || type === 'flare' || type === 'glow' || type === 'rays' || type === 'strobe' || type === 'flicker' || type === 'ghosting' || type === 'bloom' || type === 'neon' || type === 'leak') {
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
        } else if (type === 'flare') {
            // Lens flare effect
            const cx = width / 2;
            const cy = height / 2;
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, width / 2);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
            gradient.addColorStop(0.3, `rgba(255, 200, 100, ${intensity * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        } else if (type === 'rays') {
            // God rays
            const numRays = 12;
            ctx.save();
            ctx.translate(width / 2, height / 2);
            for (let i = 0; i < numRays; i++) {
                ctx.rotate((Math.PI * 2) / numRays);
                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, `rgba(255, 255, 200, ${intensity})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(-20, 0, 40, height);
            }
            ctx.restore();
        } else if (type === 'strobe') {
            // Strobe light (flicker on/off)
            const strobeOn = Math.floor(p * 10) % 2 === 0;
            if (strobeOn) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
            }
        } else if (type === 'flicker') {
            // Random flicker
            const flickerIntensity = Math.random() * intensity;
            ctx.globalAlpha = flickerIntensity;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
        } else if (type === 'ghosting') {
            // Trail/ghosting effect
            ctx.globalAlpha = 0.3 * intensity;
            ctx.globalCompositeOperation = 'lighten';
            ctx.drawImage(ctx.canvas, 10, 0);
            ctx.drawImage(ctx.canvas, -10, 0);
        } else if (type === 'bloom') {
            // Bloom/glow expansion
            ctx.filter = `blur(${intensity * 20}px) brightness(${150}%)`;
            ctx.globalAlpha = intensity * 0.5;
            ctx.drawImage(ctx.canvas, 0, 0);
        } else if (type === 'neon') {
            // Neon glow
            ctx.shadowColor = `hsl(${p * 360}, 100%, 50%)`;
            ctx.shadowBlur = 30 * intensity;
            ctx.strokeStyle = `hsl(${p * 360}, 100%, 50%)`;
            ctx.lineWidth = 3;
            ctx.strokeRect(50, 50, width - 100, height - 100);
        } else if (type === 'leak') {
            // Light leak
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, `rgba(255, 100, 50, ${intensity * 0.5})`);
            gradient.addColorStop(0.5, `rgba(255, 200, 100, ${intensity * 0.3})`);
            gradient.addColorStop(1, `rgba(255, 150, 200, ${intensity * 0.5})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }
    }

    ctx.restore();
};

/**
 * Draw selection box with handles
 */
export const drawSelectionBox = (ctx, transform, canvasDimensions, mediaDimensions, type = 'video') => {
    const { width, height } = canvasDimensions;
    const { x = 0, y = 0, scale = 100, rotation = 0, crop } = transform;

    let drawWidth, drawHeight;
    let boxCenterX = 0;
    let boxCenterY = 0;

    if (type === 'sticker') {
        const scaleFactor = height / 600;
        const normScale = scale / 100;
        drawWidth = 150 * normScale * scaleFactor;
        drawHeight = (150 * (mediaDimensions.height / mediaDimensions.width)) * normScale * scaleFactor;
    } else {
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
        const fullDrawWidth = baseWidth * scaleFactor;
        const fullDrawHeight = baseHeight * scaleFactor;

        // Default to full size
        drawWidth = fullDrawWidth;
        drawHeight = fullDrawHeight;

        // Apply Crop if exists
        if (crop) {
            const { left = 0, top = 0, right = 0, bottom = 0 } = crop;

            // Calculate cropped dimensions
            const cropW = 100 - left - right;
            const cropH = 100 - top - bottom;

            drawWidth = fullDrawWidth * (cropW / 100);
            drawHeight = fullDrawHeight * (cropH / 100);

            // Calculate Offset from Center (Anchor Point)
            const cropLeftPx = (left / 100) * fullDrawWidth;
            const cropTopPx = (top / 100) * fullDrawHeight;

            // Center of the cropped rect relative to the Top-Left of the Full Image
            const cropCenterRelX = cropLeftPx + drawWidth / 2;
            const cropCenterRelY = cropTopPx + drawHeight / 2;

            // Top-Left of Full Image relative to Anchor Point (Center)
            const fullTLRelX = -fullDrawWidth / 2;
            const fullTLRelY = -fullDrawHeight / 2;

            // Final Offset relative to Anchor Point
            boxCenterX = fullTLRelX + cropCenterRelX;
            boxCenterY = fullTLRelY + cropCenterRelY;
        }
    }

    const centerX = width / 2 + x;
    const centerY = height / 2 + y;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw Border
    ctx.strokeStyle = '#00a8ff'; // Selection Blue
    ctx.lineWidth = 2;
    ctx.strokeRect(boxCenterX - drawWidth / 2, boxCenterY - drawHeight / 2, drawWidth, drawHeight);

    // Draw Handles
    const handleSize = 6;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00a8ff';
    ctx.lineWidth = 1;

    const handles = [
        { x: boxCenterX - drawWidth / 2, y: boxCenterY - drawHeight / 2 }, // Top-Left
        { x: boxCenterX + drawWidth / 2, y: boxCenterY - drawHeight / 2 },  // Top-Right
        { x: boxCenterX + drawWidth / 2, y: boxCenterY + drawHeight / 2 },   // Bottom-Right
        { x: boxCenterX - drawWidth / 2, y: boxCenterY + drawHeight / 2 },  // Bottom-Left
    ];

    handles.forEach(h => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, handleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    // Rotation Handle (Top Center + Offset)
    ctx.beginPath();
    ctx.moveTo(boxCenterX, boxCenterY - drawHeight / 2);
    ctx.lineTo(boxCenterX, boxCenterY - drawHeight / 2 - 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(boxCenterX, boxCenterY - drawHeight / 2 - 20, handleSize, 0, Math.PI * 2);
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
    const crop = transform.crop || clip.crop;

    const centerX = width / 2 + cx;
    const centerY = height / 2 + cy;

    let drawWidth, drawHeight;
    let boxCenterX = 0;
    let boxCenterY = 0;

    if (clip.type === 'sticker') {
        const scaleFactor = height / 600;
        const normScale = scale / 100;
        drawWidth = 150 * normScale * scaleFactor;
        drawHeight = (150 * (mediaDimensions.height / mediaDimensions.width)) * normScale * scaleFactor;
    } else {
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
        const fullDrawWidth = baseWidth * scaleFactor;
        const fullDrawHeight = baseHeight * scaleFactor;

        drawWidth = fullDrawWidth;
        drawHeight = fullDrawHeight;

        if (crop) {
            const { left = 0, top = 0, right = 0, bottom = 0 } = crop;
            const cropW = 100 - left - right;
            const cropH = 100 - top - bottom;

            drawWidth = fullDrawWidth * (cropW / 100);
            drawHeight = fullDrawHeight * (cropH / 100);

            const cropLeftPx = (left / 100) * fullDrawWidth;
            const cropTopPx = (top / 100) * fullDrawHeight;

            const cropCenterRelX = cropLeftPx + drawWidth / 2;
            const cropCenterRelY = cropTopPx + drawHeight / 2;

            const fullTLRelX = -fullDrawWidth / 2;
            const fullTLRelY = -fullDrawHeight / 2;

            boxCenterX = fullTLRelX + cropCenterRelX;
            boxCenterY = fullTLRelY + cropCenterRelY;
        }
    }

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
        rotatedX >= boxCenterX - halfWidth &&
        rotatedX <= boxCenterX + halfWidth &&
        rotatedY >= boxCenterY - halfHeight &&
        rotatedY <= boxCenterY + halfHeight
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
    let boxCenterX = 0;
    let boxCenterY = 0;

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
        const crop = transform.crop || clip.crop;
        cx = width / 2 + tx;
        cy = height / 2 + ty;
        scale = s;
        rotation = r;

        // Calculate media dimensions
        if (clip.type === 'sticker') {
            const scaleFactor = height / 600;
            const normScale = scale / 100;
            drawWidth = 150 * normScale * scaleFactor;
            drawHeight = (150 * (mediaDimensions.height / mediaDimensions.width)) * normScale * scaleFactor;
        } else {
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
            const fullDrawWidth = baseWidth * scaleFactor;
            const fullDrawHeight = baseHeight * scaleFactor;

            drawWidth = fullDrawWidth;
            drawHeight = fullDrawHeight;

            if (crop) {
                const { left = 0, top = 0, right = 0, bottom = 0 } = crop;
                const cropW = 100 - left - right;
                const cropH = 100 - top - bottom;

                drawWidth = fullDrawWidth * (cropW / 100);
                drawHeight = fullDrawHeight * (cropH / 100);

                const cropLeftPx = (left / 100) * fullDrawWidth;
                const cropTopPx = (top / 100) * fullDrawHeight;

                const cropCenterRelX = cropLeftPx + drawWidth / 2;
                const cropCenterRelY = cropTopPx + drawHeight / 2;

                const fullTLRelX = -fullDrawWidth / 2;
                const fullTLRelY = -fullDrawHeight / 2;

                boxCenterX = fullTLRelX + cropCenterRelX;
                boxCenterY = fullTLRelY + cropCenterRelY;
            }
        }
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
        { name: 'tl', x: boxCenterX - halfWidth, y: boxCenterY - halfHeight },
        { name: 'tr', x: boxCenterX + halfWidth, y: boxCenterY - halfHeight },
        { name: 'br', x: boxCenterX + halfWidth, y: boxCenterY + halfHeight },
        { name: 'bl', x: boxCenterX - halfWidth, y: boxCenterY + halfHeight },
        { name: 'rot', x: boxCenterX, y: boxCenterY - halfHeight - 20 }
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



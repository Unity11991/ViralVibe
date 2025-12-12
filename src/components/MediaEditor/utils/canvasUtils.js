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
export const renderFrame = (ctx, media, state, options = { applyFiltersToContext: true }) => {
    const { adjustments, vignette, grain, textOverlays, stickers, stickerImages, transform, canvasDimensions, memePadding, activeEffectId, effectIntensity = 50, activeFilterId, visibleClips } = state;

    // Use provided logical dimensions or fallback to physical dimensions (not recommended for high DPI)
    const dimensions = canvasDimensions || { width: ctx.canvas.width, height: ctx.canvas.height };

    // Clear canvas first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    if (visibleClips && visibleClips.length > 0) {
        // Multi-track rendering
        visibleClips.forEach((clip, index) => {
            // Prepare clip-specific state
            const clipAdjustments = clip.adjustments || adjustments;
            const clipFilterId = clip.filter || activeFilterId;
            const clipEffectId = clip.effect || activeEffectId;
            const clipTransform = clip.transform || transform;

            // Draw clip
            // Note: clearCanvas=false because we cleared it once at the start
            drawMediaToCanvas(ctx, clip.media, clipAdjustments, clipTransform, dimensions, memePadding, {
                applyFiltersToContext: options.applyFiltersToContext,
                clearCanvas: false,
                mask: clip.mask
            });

            // Apply Clip Filters (Color Grade)
            if (clipFilterId && clipFilterId !== 'normal') {
                applyColorGrade(ctx, clipFilterId, dimensions.width, dimensions.height);
            }

            // Apply Clip Effects
            if (clipEffectId) {
                // We need to pass effect intensity. Assuming global for now or clip specific if added.
                // For now using global effectIntensity
                const intensity = effectIntensity;
                applyEffectToCanvas(ctx, clipEffectId, intensity, dimensions.width, dimensions.height, clip.media);
            }

            // Draw Selection Box if active
            if (state.activeOverlayId === clip.id) {
                const mediaWidth = clip.media.videoWidth || clip.media.width;
                const mediaHeight = clip.media.videoHeight || clip.media.height;
                drawSelectionBox(ctx, clipTransform, dimensions, { width: mediaWidth, height: mediaHeight });
            }
        });

        // Apply Global Effects (if any, on top of everything?)
        // Or maybe we just rely on clip effects.
        // Let's stick to the original logic for now:
        // If we have visibleClips, we rendered them.
        // Now apply global effects if activeEffectId is set and not handled per clip?
        // Actually, the original code applied effects AFTER drawing media.

        // Let's extract the effect logic to a function `applyEffectToCanvas` first.
    } else if (state.hasActiveClip !== false) {
        // Legacy Single Track Fallback
        drawMediaToCanvas(ctx, media, adjustments, transform, dimensions, memePadding, { applyFiltersToContext: options.applyFiltersToContext });

        if (activeFilterId && activeFilterId !== 'normal') {
            applyColorGrade(ctx, activeFilterId, dimensions.width, dimensions.height);
        }
    }

    // Apply Effects (Global or Last Clip?)
    // If we are in multi-track, we might want to apply effects per clip.
    // But the current structure has a huge switch case for effects inside renderFrame.
    // I should move that switch case to a helper function.

    if (activeEffectId) {
        applyEffectToCanvas(ctx, activeEffectId, effectIntensity, dimensions.width, dimensions.height, media);
    }

    // Draw text overlays
    if (textOverlays && textOverlays.length > 0) {
        textOverlays.forEach(textOverlay => {
            // If we are editing this overlay (it's active), we might want to skip drawing it 
            // if the editor UI handles it (e.g. a separate input box on top).
            // But usually we want to draw it unless it's being dragged by a separate system.
            // For now, let's ALWAYS draw it to be safe, unless specifically told not to.
            // if (state.activeOverlayId === textOverlay.id) return; 

            let overlayToDraw = { ...textOverlay };

            // Adjust for crop if active (using global transform for now)
            if (transform.crop) {
                const { x, y, width, height } = transform.crop;
                const scaleX = 100 / width;
                const scaleY = 100 / height;
                overlayToDraw.x = (textOverlay.x - x) * scaleX;
                overlayToDraw.y = (textOverlay.y - y) * scaleY;
                overlayToDraw.fontSize = textOverlay.fontSize * scaleY;
            }

            drawTextOverlay(ctx, overlayToDraw, dimensions.width, dimensions.height);
        });
    }

    // Draw stickers
    if (stickers && stickers.length > 0) {
        stickers.forEach((sticker, index) => {
            // We need to find the image for this sticker. 
            // In the new state, we might not have stickerImages array populated in the same order?
            // MediaEditor passes `stickerImages: []` currently! 
            // We need to handle sticker images differently. 
            // The sticker object itself should probably contain the image source or element.

            const img = sticker.image; // We updated MediaEditor to pass image object in sticker
            if (img) {
                let stickerToDraw = { ...sticker };
                if (transform.crop) {
                    const { x, y, width, height } = transform.crop;
                    const scaleX = 100 / width;
                    const scaleY = 100 / height;
                    stickerToDraw.x = (sticker.x - x) * scaleX;
                    stickerToDraw.y = (sticker.y - y) * scaleY;
                    stickerToDraw.scale = sticker.scale * scaleY;
                }
                drawStickerOverlay(ctx, stickerToDraw, img, dimensions.width, dimensions.height);
            }
        });
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
 * Draw selection box with handles around a transformed clip
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} transform - Clip transform properties (x, y, scale, rotation)
 * @param {Object} dimensions - Canvas dimensions
 * @param {Object} mediaDimensions - Original media dimensions
 */
export const drawSelectionBox = (ctx, transform, dimensions, mediaDimensions) => {
    const { width, height } = dimensions;
    const { x = 0, y = 0, scale = 100, rotation = 0 } = transform;

    // Calculate base dimensions (similar to drawMediaToCanvas logic)
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
    ctx.strokeStyle = '#3b82f6'; // Blue-500
    ctx.lineWidth = 2;
    ctx.strokeRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // Draw Handles
    const handleSize = 8;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;

    const handles = [
        { x: -drawWidth / 2, y: -drawHeight / 2 }, // Top-left
        { x: drawWidth / 2, y: -drawHeight / 2 },  // Top-right
        { x: -drawWidth / 2, y: drawHeight / 2 },  // Bottom-left
        { x: drawWidth / 2, y: drawHeight / 2 },   // Bottom-right
    ];

    handles.forEach(handle => {
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, handleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    // Rotation Handle (Top Center extended)
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



// Cached canvas for soft masking to avoid garbage collection
let cachedMaskCanvas = null;

const getCachedCanvas = (width, height) => {
    if (!cachedMaskCanvas) {
        cachedMaskCanvas = document.createElement('canvas');
    }
    if (cachedMaskCanvas.width !== width || cachedMaskCanvas.height !== height) {
        cachedMaskCanvas.width = width;
        cachedMaskCanvas.height = height;
    }
    return cachedMaskCanvas;
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

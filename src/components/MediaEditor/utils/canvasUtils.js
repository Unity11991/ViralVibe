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
    const { crop = null, rotation = 0, zoom = 1 } = transform;
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

    // Handle crop and transform
    if (crop) {
        const { x, y, width, height } = crop;
        const mediaWidth = media.videoWidth || media.width;
        const mediaHeight = media.videoHeight || media.height;

        const sourceX = (x / 100) * mediaWidth;
        const sourceY = (y / 100) * mediaHeight;
        const sourceW = (width / 100) * mediaWidth;
        const sourceH = (height / 100) * mediaHeight;

        ctx.drawImage(
            media,
            sourceX, sourceY, sourceW, sourceH,
            0, 0, canvas.width, canvas.height
        );
    } else {
        // Center and fit media
        const mediaAspect = media.videoWidth ? media.videoWidth / media.videoHeight : media.width / media.height;
        const canvasAspect = logicalWidth / logicalHeight;

        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        if (mediaAspect > canvasAspect) {
            drawWidth = logicalWidth * zoom;
            drawHeight = (logicalWidth / mediaAspect) * zoom;
            offsetY = (logicalHeight - drawHeight) / 2;
        } else {
            drawHeight = logicalHeight * zoom;
            drawWidth = (logicalHeight * mediaAspect) * zoom;
            offsetX = (logicalWidth - drawWidth) / 2;
        }

        if (memePadding > 0) {
            // Draw white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, logicalWidth, logicalHeight);

            // Calculate header height fraction: p / (1+p)
            const headerFraction = memePadding / (1 + memePadding);
            const headerHeight = logicalHeight * headerFraction;

            // Draw media below header
            // Assume media fills width
            const mediaDrawHeight = logicalHeight - headerHeight;

            // Recalculate draw dimensions to fit in the bottom area while maintaining aspect
            // But typically memes just fill width.
            const targetY = headerHeight;

            // Fit media in the remaining space (bottom part)
            if (mediaAspect > canvasAspect) {
                // Media is wider than canvas slot (unlikely if we set canvas based on media width)
                // But if it happens, fit width
                drawWidth = logicalWidth * zoom;
                drawHeight = (logicalWidth / mediaAspect) * zoom;
                offsetY = targetY + (mediaDrawHeight - drawHeight) / 2;
                offsetX = (logicalWidth - drawWidth) / 2; // Should be 0 usually

            } else {
                // Media is taller/same
                // In our resize logic, we set width = containerWidth.
                // So logicalWidth should match media width roughly.

                drawWidth = logicalWidth * zoom;
                drawHeight = (logicalWidth / mediaAspect) * zoom;
                offsetX = (logicalWidth - drawWidth) / 2;
                offsetY = targetY + (mediaDrawHeight - drawHeight) / 2;
            }

            ctx.drawImage(media, offsetX, offsetY, drawWidth, drawHeight);

        } else {
            ctx.drawImage(media, offsetX, offsetY, drawWidth, drawHeight);
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
                clearCanvas: false
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

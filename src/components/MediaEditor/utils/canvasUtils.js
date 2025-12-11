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
export const drawMediaToCanvas = (ctx, media, filters, transform = {}, canvasDimensions = null, memePadding = 0, applyFiltersToContext = true) => {
    const canvas = ctx.canvas;
    const { width: logicalWidth, height: logicalHeight } = canvasDimensions || { width: canvas.width, height: canvas.height };
    const { crop = null, rotation = 0, zoom = 1 } = transform;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply filters
    if (applyFiltersToContext) {
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
    const { adjustments, vignette, grain, textOverlays, stickers, stickerImages, transform, canvasDimensions, memePadding, activeEffectId, effectIntensity = 50, activeFilterId } = state;

    // Use provided logical dimensions or fallback to physical dimensions (not recommended for high DPI)
    const dimensions = canvasDimensions || { width: ctx.canvas.width, height: ctx.canvas.height };

    // Draw base media with filters
    drawMediaToCanvas(ctx, media, adjustments, transform, dimensions, memePadding, options.applyFiltersToContext);

    // Apply Professional Color Grading (Instagram-style)
    if (activeFilterId && activeFilterId !== 'normal') {
        applyColorGrade(ctx, activeFilterId, dimensions.width, dimensions.height);
    }

    // Apply Dynamic Effects
    if (activeEffectId) {
        // Use performant composite operations instead of pixel manipulation
        const width = dimensions.width;
        const height = dimensions.height;
        const intensity = effectIntensity / 100;

        ctx.save();

        switch (activeEffectId) {
            case 'glow':
                // Soft Glow (Blur + Screen)
                ctx.filter = `blur(${15 * intensity}px) brightness(${100 + 10 * intensity}%)`;
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.6 * intensity;
                ctx.drawImage(media, 0, 0, width, height);
                break;

            case 'grain':
                // Heavy Film Grain
                drawGrain(ctx, 80 * intensity);
                ctx.filter = `contrast(${100 + 10 * intensity}%) grayscale(${30 * intensity}%)`;
                ctx.globalCompositeOperation = 'overlay';
                ctx.drawImage(media, 0, 0, width, height);
                break;

            case 'vintage-cam':
                // Sepia + Noise + Date Stamp look
                ctx.filter = `sepia(${40 * intensity}%) contrast(${110 * intensity}%) saturate(${80 * intensity}%)`;
                ctx.drawImage(media, 0, 0, width, height);
                drawGrain(ctx, 40 * intensity);

                // Date Stamp (Simulated)
                if (intensity > 0.5) {
                    ctx.font = `bold ${height * 0.05}px monospace`;
                    ctx.fillStyle = '#ff9900'; // Orange-ish date color
                    ctx.shadowColor = 'black';
                    ctx.shadowBlur = 2;
                    ctx.textAlign = 'right';
                    ctx.fillText('01 01 98', width - 20, height - 20);
                }
                break;

            case 'teal-orange':
                // Teal shadows, Orange highlights
                // Teal Overlay (Multiply)
                ctx.fillStyle = '#008080'; // Teal
                ctx.globalCompositeOperation = 'overlay';
                ctx.globalAlpha = 0.4 * intensity;
                ctx.fillRect(0, 0, width, height);

                // Orange Overlay (Soft Light)
                ctx.fillStyle = '#ff8000'; // Orange
                ctx.globalCompositeOperation = 'soft-light';
                ctx.globalAlpha = 0.5 * intensity;
                ctx.fillRect(0, 0, width, height);
                break;

            case 'polaroid':
                // White Border + Vintage Filter
                const borderSize = width * 0.05;
                const bottomBorder = width * 0.15;

                // Draw Image Scaled Down
                ctx.drawImage(media, borderSize, borderSize, width - (borderSize * 2), height - borderSize - bottomBorder);

                // Draw White Frame
                ctx.lineWidth = borderSize;
                ctx.strokeStyle = '#ffffff';
                ctx.strokeRect(0, 0, width, height);

                // Bottom part
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, height - bottomBorder, width, bottomBorder);

                // Apply vintage filter to the image area
                ctx.filter = `sepia(${30 * intensity}%) contrast(110%)`;
                ctx.globalCompositeOperation = 'multiply'; // Blend with existing
                break;

            case 'flash-warn':
                // Rapid brightness oscillation
                // Simulate beat sync by using a sine wave based on time (mocked here with random for now or just high brightness)
                // For a static editor, we just show the "Flash" state
                const flashIntensity = (Math.sin(Date.now() / 100) + 1) / 2; // Pulse if animated, else static high
                ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * intensity})`;
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillRect(0, 0, width, height);
                break;

            case 'motion-blur':
                // Directional Blur (Simulated with multiple offset draws)
                ctx.globalAlpha = 0.1;
                for (let i = 1; i < 10; i++) {
                    ctx.drawImage(media, i * 2 * intensity, 0, width, height);
                    ctx.drawImage(media, -i * 2 * intensity, 0, width, height);
                }
                break;

            case 'color-pop':
                // Grayscale background, color center
                // Draw Grayscale version
                ctx.filter = 'grayscale(100%)';
                ctx.drawImage(media, 0, 0, width, height);

                // Draw Color Center (Circular Mask)
                ctx.save();
                ctx.beginPath();
                ctx.arc(width / 2, height / 2, (width / 3) * (1 + (1 - intensity)), 0, Math.PI * 2);
                ctx.clip();
                ctx.filter = 'none'; // Reset filter
                ctx.drawImage(media, 0, 0, width, height); // Draw original color image
                ctx.restore();
                break;

            case 'chromatic':
                // RGB Shift using composite operations
                const offset = width * 0.01 * (intensity || 0.5); // Max 1% width shift

                // Draw Red Channel
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'red';
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'multiply';
                ctx.drawImage(media, -offset, 0, width, height);

                // Draw Blue Channel
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'blue';
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'multiply';
                ctx.drawImage(media, offset, 0, width, height);

                // Restore original (Green channel effectively)
                ctx.globalCompositeOperation = 'destination-over';
                ctx.drawImage(media, 0, 0, width, height);
                break;

            case 'vhs':
                // Noise Overlay
                drawGrain(ctx, 40 * intensity);

                // Scanlines
                ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * intensity})`;
                for (let y = 0; y < height; y += 4) {
                    ctx.fillRect(0, y, width, 2);
                }

                // Color Bleed (Simple blur + saturate)
                ctx.filter = `blur(${2 * intensity}px) saturate(${100 + 100 * intensity}%)`;
                ctx.globalCompositeOperation = 'overlay';
                ctx.drawImage(media, 0, 0, width, height);
                break;

            case 'glitch':
                // Random slices
                const sliceHeight = height / 10;
                const glitchChance = 0.3 + (0.7 * intensity); // 30% to 100% chance
                const maxOffset = 50 * intensity;

                for (let i = 0; i < 10; i++) {
                    if (Math.random() < glitchChance) {
                        const xOffset = (Math.random() - 0.5) * maxOffset;
                        ctx.drawImage(media,
                            0, i * sliceHeight, width, sliceHeight,
                            xOffset, i * sliceHeight, width, sliceHeight
                        );
                    }
                }

                // Color shift on top
                if (Math.random() < intensity) {
                    ctx.globalCompositeOperation = 'color-dodge';
                    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,0,0,0.2)' : 'rgba(0,0,255,0.2)';
                    ctx.fillRect(0, 0, width, height);
                }
                break;

            case 'retro':
                // Sepia + Noise + Vignette
                ctx.filter = `sepia(${50 * intensity}%) contrast(${100 + 20 * intensity}%)`;
                ctx.drawImage(media, 0, 0, width, height);
                drawGrain(ctx, 20 * intensity);
                drawVignette(ctx, 40 * intensity, dimensions);
                break;

            case 'vintage':
                // Warm tint + Fade
                ctx.fillStyle = `rgba(243, 226, 195, ${0.3 * intensity})`; // Warm overlay
                ctx.fillRect(0, 0, width, height);
                ctx.filter = `contrast(${100 - 20 * intensity}%) brightness(${100 + 10 * intensity}%)`;
                ctx.drawImage(media, 0, 0, width, height);
                break;

            case 'noise':
                drawGrain(ctx, 100 * intensity);
                break;

            case 'soft':
                // Soft Glow (Blur + Screen)
                ctx.filter = `blur(${20 * intensity}px)`;
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.5 * intensity;
                ctx.drawImage(media, 0, 0, width, height);
                break;

            case 'flash':
                // Light Leak
                const gradient = ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, `rgba(255, 200, 150, ${0.6 * intensity})`);
                gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.globalCompositeOperation = 'screen';
                ctx.fillRect(0, 0, width, height);
                break;

            case 'duotone':
                // Purple/Cyan Duotone using composite
                ctx.fillStyle = '#8b5cf6'; // Purple
                ctx.globalCompositeOperation = 'color';
                ctx.globalAlpha = intensity;
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = '#06b6d4'; // Cyan
                ctx.fillRect(0, 0, width, height);
                break;

            case 'invert':
                ctx.filter = `invert(${100 * intensity}%)`;
                ctx.drawImage(media, 0, 0, width, height);
                break;
        }

        ctx.restore();
    }

    // Apply vignette
    if (vignette > 0) {
        drawVignette(ctx, vignette, dimensions);
    }

    // Apply grain
    if (grain > 0) {
        drawGrain(ctx, grain);
    }

    // Draw text overlays
    textOverlays.forEach(textOverlay => {
        if (state.activeOverlayId === textOverlay.id) return; // Skip drawing active text overlay (handled by HTML editor)

        let overlayToDraw = { ...textOverlay };

        // Adjust for crop if active
        if (transform.crop) {
            const { x, y, width, height } = transform.crop;

            // Calculate scale factors relative to the crop area
            const scaleX = 100 / width;
            const scaleY = 100 / height;

            // Transform position: relative to crop origin, then scaled up
            overlayToDraw.x = (textOverlay.x - x) * scaleX;
            overlayToDraw.y = (textOverlay.y - y) * scaleY;

            // Scale font size
            overlayToDraw.fontSize = textOverlay.fontSize * scaleY; // Use Y scale for uniform scaling
        }

        drawTextOverlay(ctx, overlayToDraw, dimensions.width, dimensions.height);
    });

    // Draw stickers
    stickers.forEach((sticker, index) => {
        if (stickerImages[index]) {
            let stickerToDraw = { ...sticker };

            // Adjust for crop if active
            if (transform.crop) {
                const { x, y, width, height } = transform.crop;

                const scaleX = 100 / width;
                const scaleY = 100 / height;

                stickerToDraw.x = (sticker.x - x) * scaleX;
                stickerToDraw.y = (sticker.y - y) * scaleY;
                stickerToDraw.scale = sticker.scale * scaleY;
            }

            drawStickerOverlay(ctx, stickerToDraw, stickerImages[index], dimensions.width, dimensions.height);
        }
    });
};

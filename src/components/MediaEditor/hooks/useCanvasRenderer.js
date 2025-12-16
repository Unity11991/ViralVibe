import { useState, useRef, useCallback, useEffect } from 'react';
import { renderFrame } from '../utils/canvasUtils';
import performanceOptimizer, { recordFrame, getRecommendedSettings } from '../utils/performanceOptimizer';

/**
 * Custom hook for canvas rendering
 */
export const useCanvasRenderer = (mediaElementRef, mediaType) => {
    const canvasRef = useRef(null);
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
    const rafIdRef = useRef(null);

    /**
     * Initialize canvas with proper dimensions
     * OPTIMIZED FOR HD VIDEO PERFORMANCE
     */
    const initializeCanvas = useCallback((containerWidth, containerHeight, mediaAspectRatio, memePadding = 0) => {
        if (!canvasRef.current) return;

        let width, height;
        const containerAspect = containerWidth / containerHeight;

        // If meme mode, the effective media aspect ratio changes (it gets taller)
        // newHeight = oldHeight * (1 + memePadding)
        // so newAspect = width / (height * (1 + memePadding)) = oldAspect / (1 + memePadding)
        const effectiveAspect = memePadding > 0 ? mediaAspectRatio / (1 + memePadding) : mediaAspectRatio;

        if (effectiveAspect > containerAspect) {
            width = containerWidth;
            height = containerWidth / effectiveAspect;
        } else {
            height = containerHeight;
            width = containerHeight * effectiveAspect;
        }

        // HD VIDEO OPTIMIZATION: Adaptive resolution based on source video
        // Get source video dimensions if available
        const sourceWidth = mediaElementRef.current?.videoWidth || width;
        const sourceHeight = mediaElementRef.current?.videoHeight || height;
        const sourceMaxDim = Math.max(sourceWidth, sourceHeight);

        // Adaptive max dimension based on source resolution
        let MAX_PREVIEW_DIMENSION;
        if (sourceMaxDim >= 3840) {
            // 4K/8K video → aggressive downscale for performance
            MAX_PREVIEW_DIMENSION = 960;
        } else if (sourceMaxDim >= 1920) {
            // 1080p video → moderate downscale
            MAX_PREVIEW_DIMENSION = 720;
        } else if (sourceMaxDim >= 1280) {
            // 720p video → light downscale
            MAX_PREVIEW_DIMENSION = 720;
        } else {
            // SD video → no downscale needed
            MAX_PREVIEW_DIMENSION = 1280;
        }

        // Disable pixel ratio scaling for HD videos (performance)
        const scale = sourceMaxDim >= 1920 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

        let finalWidth = width * scale;
        let finalHeight = height * scale;

        // Downscale if too large
        if (finalWidth > MAX_PREVIEW_DIMENSION || finalHeight > MAX_PREVIEW_DIMENSION) {
            const ratio = Math.min(MAX_PREVIEW_DIMENSION / finalWidth, MAX_PREVIEW_DIMENSION / finalHeight);
            finalWidth *= ratio;
            finalHeight *= ratio;
        }

        canvasRef.current.width = Math.floor(finalWidth);
        canvasRef.current.height = Math.floor(finalHeight);

        // Set display size
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;

        // Scale context to match
        // HD OPTIMIZATION: Use performance-optimized context settings
        const ctx = canvasRef.current.getContext('2d', {
            willReadFrequently: false,  // Better GPU usage
            alpha: false,               // No transparency = faster
            desynchronized: true        // Reduces latency
        });

        if (ctx) {
            ctx.scale(finalWidth / width, finalHeight / height);
            // Disable smoothing for preview (faster rendering)
            ctx.imageSmoothingEnabled = false;
        }

        // IMPORTANT: We expose the LOGICAL dimensions to the app, so all calculations (hit testing, etc.)
        // happen in CSS pixels. The canvas internal resolution is hidden implementation detail.
        setCanvasDimensions({ width: width, height: height });
    }, [mediaElementRef]);

    /**
     * Render single frame
     * OPTIMIZED FOR HD VIDEO with performance monitoring
     */
    const render = useCallback((state, options) => {
        if (!canvasRef.current || !mediaElementRef.current) return;

        const startTime = performance.now();

        // Use optimized context settings
        const ctx = canvasRef.current.getContext('2d', {
            willReadFrequently: false,
            alpha: false,
            desynchronized: true
        });
        const media = mediaElementRef.current;

        // Get performance-based settings
        const perfSettings = getRecommendedSettings();
        const enhancedOptions = {
            ...options,
            applyFiltersToContext: perfSettings.applyFilters && (options.applyFiltersToContext !== false),
            skipHeavyEffects: perfSettings.skipHeavyEffects,
            performanceMode: true
        };

        renderFrame(ctx, media, state, enhancedOptions);

        const endTime = performance.now();
        recordFrame(startTime, endTime);
    }, [mediaElementRef]);

    /**
     * Debounced render for editing operations
     * OPTIMIZED: Different delays for different operations
     * Reduces render frequency during drag/transform for HD performance
     */
    const debounceTimeoutRef = useRef(null);
    const lastDebounceType = useRef(null);

    const renderDebounced = useCallback((state, options, delay = 16, operationType = 'default') => {
        // Clear previous timeout if operation type changed
        if (lastDebounceType.current !== operationType && debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        lastDebounceType.current = operationType;

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            render(state, options);
        }, delay);
    }, [render]);

    /**
     * Start continuous rendering (for video)
     * OPTIMIZED: Adaptive FPS based on performance
     */
    const lastRenderTimeRef = useRef(0);
    const frameSkipCounter = useRef(0);

    const startRendering = useCallback((state, options = {}) => {
        const perfSettings = getRecommendedSettings();
        const targetFPS = options.isPlaying ? perfSettings.targetFPS : 60;
        const frameInterval = 1000 / targetFPS;

        const renderLoop = (timestamp) => {
            // Frame dropping for performance
            if (performanceOptimizer.shouldSkipFrame(timestamp) && options.isPlaying) {
                frameSkipCounter.current++;
                rafIdRef.current = requestAnimationFrame(renderLoop);
                return;
            }

            const elapsed = timestamp - lastRenderTimeRef.current;

            // Throttle rendering to target FPS
            if (elapsed >= frameInterval || !options.isPlaying) {
                render(state, options);
                lastRenderTimeRef.current = timestamp;
            }

            rafIdRef.current = requestAnimationFrame(renderLoop);
        };

        lastRenderTimeRef.current = performance.now();
        renderLoop(performance.now());
    }, [render]);

    /**
     * Stop continuous rendering
     */
    const stopRendering = useCallback(() => {
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
            debounceTimeoutRef.current = null;
        }
    }, []);

    /**
     * Get canvas as blob
     */
    const getCanvasBlob = useCallback((format = 'image/png', quality = 0.95) => {
        if (!canvasRef.current) return Promise.reject(new Error('Canvas not initialized'));

        return new Promise((resolve, reject) => {
            canvasRef.current.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to create blob'));
                },
                format,
                quality
            );
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRendering();
        };
    }, [stopRendering]);

    return {
        canvasRef,
        canvasDimensions,
        initializeCanvas,
        render,
        renderDebounced,  // NEW: For drag/transform operations
        startRendering,
        stopRendering,
        getCanvasBlob
    };
};

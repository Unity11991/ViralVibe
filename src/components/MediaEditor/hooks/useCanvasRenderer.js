import { useState, useRef, useCallback, useEffect } from 'react';
import { renderFrame } from '../utils/canvasUtils';

/**
 * Custom hook for canvas rendering
 */
export const useCanvasRenderer = (mediaElementRef, mediaType) => {
    const canvasRef = useRef(null);
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
    const rafIdRef = useRef(null);

    /**
     * Initialize canvas with proper dimensions
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

        // Set internal resolution (higher for quality, but capped for performance)
        const MAX_PREVIEW_DIMENSION = 1280;
        const scale = Math.min(window.devicePixelRatio || 1, 2); // Cap pixel ratio at 2x

        let finalWidth = width * scale;
        let finalHeight = height * scale;

        // Downscale if too large
        if (finalWidth > MAX_PREVIEW_DIMENSION || finalHeight > MAX_PREVIEW_DIMENSION) {
            const ratio = Math.min(MAX_PREVIEW_DIMENSION / finalWidth, MAX_PREVIEW_DIMENSION / finalHeight);
            finalWidth *= ratio;
            finalHeight *= ratio;
        }

        canvasRef.current.width = finalWidth;
        canvasRef.current.height = finalHeight;

        // Set display size
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;

        // Scale context to match
        const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
        ctx.scale(finalWidth / width, finalHeight / height);

        // IMPORTANT: We expose the LOGICAL dimensions to the app, so all calculations (hit testing, etc.)
        // happen in CSS pixels. The canvas internal resolution is hidden implementation detail.
        setCanvasDimensions({ width: width, height: height });
    }, []);

    /**
     * Render single frame
     */
    const render = useCallback((state, options) => {
        if (!canvasRef.current || !mediaElementRef.current) return;

        const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
        const media = mediaElementRef.current;

        renderFrame(ctx, media, state, options);
    }, [mediaElementRef]);

    /**
     * Start continuous rendering (for video)
     */
    const startRendering = useCallback((state) => {
        const renderLoop = () => {
            render(state);
            rafIdRef.current = requestAnimationFrame(renderLoop);
        };
        renderLoop();
    }, [render]);

    /**
     * Stop continuous rendering
     */
    const stopRendering = useCallback(() => {
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
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
        startRendering,
        stopRendering,
        getCanvasBlob
    };
};

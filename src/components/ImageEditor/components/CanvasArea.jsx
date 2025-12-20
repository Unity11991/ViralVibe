import React, { useRef, useEffect } from 'react';
import { useImageCanvas } from '../hooks/useImageCanvas';

export const CanvasArea = ({
    layers,
    canvasSize,
    activeLayerId,
    onCanvasClick,
    activeTool,
    toolSettings,
    onUpdateLayer,
    viewState,
    onViewStateChange,
    isCropping,
    cropRect,
    onUpdateCropRect
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Initialize Renderer
    useImageCanvas(
        canvasRef,
        layers,
        canvasSize,
        activeLayerId,
        activeTool,
        toolSettings,
        onUpdateLayer,
        viewState,
        onViewStateChange,
        // Crop
        isCropping,
        cropRect,
        onUpdateCropRect
    );

    // Handle Auto-Fit (Only on mount/resize, not on every render)
    // Handle Auto-Fit and Resize
    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            if (!containerRef.current || !canvasRef.current) return;

            const container = containerRef.current;
            const canvas = canvasRef.current;

            // Update canvas resolution to match display size
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-[#1a1a1a] relative overflow-hidden cursor-crosshair"
            onClick={onCanvasClick}
        >
            <canvas
                ref={canvasRef}
                className="block"
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

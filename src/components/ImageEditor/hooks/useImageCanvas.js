import { useEffect, useRef, useState, useCallback } from 'react';

export const useImageCanvas = (
    canvasRef,
    layers,
    canvasSize,
    activeLayerId,
    activeTool = 'move',
    toolSettings = {},
    onUpdateLayer,
    // Controlled View State
    controlledViewState,
    onViewStateChange,
    // Crop State
    isCropping = false,
    cropRect = null,
    onUpdateCropRect
) => {
    // --- View State (Zoom/Pan) ---
    // If controlled, use props. Else use local state.
    const [localViewState, setLocalViewState] = useState({ scale: 1, x: 0, y: 0 });

    const viewState = controlledViewState || localViewState;
    const setViewState = onViewStateChange || setLocalViewState;

    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    // --- Interaction State ---
    const [dragState, setDragState] = useState(null); // { type: 'move'|'resize'|'rotate', startX, startY, initialTransform }

    // --- Helper: Get Layer Bounding Box ---
    const getLayerBounds = (layer) => {
        // This is a simplified bounding box. 
        // In a real app, we'd calculate this based on image size or text metrics.
        const width = layer.width || (layer.type === 'text' ? layer.content.length * 20 : 200);
        const height = layer.height || (layer.type === 'text' ? 40 : 200);

        return {
            x: layer.transform?.x || 0,
            y: layer.transform?.y || 0,
            width: width * (layer.transform?.scaleX || 1),
            height: height * (layer.transform?.scaleY || 1),
            rotation: layer.transform?.rotation || 0
        };
    };

    // --- Auto-Fit on Load ---
    useEffect(() => {
        if (canvasRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
            const canvas = canvasRef.current;
            const containerW = canvas.width;
            const containerH = canvas.height;

            const scaleW = containerW / canvasSize.width;
            const scaleH = containerH / canvasSize.height;
            const newScale = Math.min(scaleW, scaleH) * 0.85; // 85% fit to leave some margin

            const newX = (containerW - canvasSize.width * newScale) / 2;
            const newY = (containerH - canvasSize.height * newScale) / 2;

            setViewState({
                scale: newScale,
                x: newX,
            }, [activeTool]);

            // --- Attach Listeners ---
            useEffect(() => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                canvas.addEventListener('mousedown', handleMouseDown);
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
                canvas.addEventListener('wheel', handleWheel, { passive: false });

                return () => {
                    canvas.removeEventListener('mousedown', handleMouseDown);
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('mouseup', handleMouseUp);
                    canvas.removeEventListener('wheel', handleWheel);
                };
            }, [handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);


            // --- Render Loop ---
            useEffect(() => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                const ctx = canvas.getContext('2d');

                // Clear
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Save Context for Global Zoom/Pan
                ctx.save();
                ctx.translate(viewState.x, viewState.y);
                ctx.scale(viewState.scale, viewState.scale);

                // Render Background (Transparent with Border)
                // We don't fill with white anymore.
                // Draw Canvas Bounds
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.strokeRect(0, 0, canvasSize.width, canvasSize.height);

                // Render Layers
                layers.forEach(layer => {
                    if (!layer.visible) return;

                    ctx.save();
                    ctx.globalAlpha = layer.opacity / 100;
                    ctx.globalCompositeOperation = layer.blendMode || 'source-over';

                    const { x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1 } = layer.transform || {};

                    ctx.translate(x, y);
                    ctx.rotate((rotation * Math.PI) / 180);
                    ctx.scale(scaleX, scaleY);

                    if (layer.type === 'image' && layer.image) {
                        // Draw centered: Image origin is top-left, but we want to position by center
                        // So we draw at -width/2, -height/2 relative to the translated (x,y)
                        ctx.drawImage(layer.image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
                    } else if (layer.type === 'text') {
                        ctx.font = `${layer.style?.fontSize || 40}px ${layer.style?.fontFamily || 'Inter'}`;
                        ctx.fillStyle = layer.style?.color || '#000000';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(layer.content, 0, 0);
                    }

                    ctx.restore();
                });

                // Render Selection Overlay (Move Tool)
                if (!isCropping && activeLayerId && activeTool === 'move' && toolSettings.showTransform) {
                    const activeLayer = layers.find(l => l.id === activeLayerId);
                    if (activeLayer) {
                        const bounds = getLayerBounds(activeLayer);

                        ctx.save();
                        ctx.translate(bounds.x, bounds.y);
                        ctx.rotate((bounds.rotation * Math.PI) / 180);

                        // Border (Centered)
                        ctx.strokeStyle = '#3b82f6';
                        ctx.lineWidth = 2 / viewState.scale;
                        ctx.strokeRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);

                        // Handles (Corners)
                        const handleSize = 8 / viewState.scale;
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#3b82f6';

                        const drawHandle = (cx, cy) => {
                            ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
                            ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
                        };

                        drawHandle(-bounds.width / 2, -bounds.height / 2); // TL
                        drawHandle(bounds.width / 2, -bounds.height / 2); // TR
                        drawHandle(-bounds.width / 2, bounds.height / 2); // BL
                        drawHandle(bounds.width / 2, bounds.height / 2); // BR

                        ctx.restore();
                    }
                }

                // Render Crop Overlay
                if (isCropping && cropRect) {
                    // Dimming (Overlay outside crop rect)
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

                    // Draw 4 rectangles around the crop area to create the "hole"
                    // Top
                    ctx.fillRect(0, 0, canvasSize.width, cropRect.y);
                    // Bottom
                    ctx.fillRect(0, cropRect.y + cropRect.height, canvasSize.width, canvasSize.height - (cropRect.y + cropRect.height));
                    // Left
                    ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.height);
                    // Right
                    ctx.fillRect(cropRect.x + cropRect.width, cropRect.y, canvasSize.width - (cropRect.x + cropRect.width), cropRect.height);

                    // Crop Border
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2 / viewState.scale;
                    ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

                    // Grid (Rule of Thirds)
                    ctx.beginPath();
                    ctx.lineWidth = 1 / viewState.scale;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';

                    // Verticals
                    ctx.moveTo(cropRect.x + cropRect.width / 3, cropRect.y);
                    ctx.lineTo(cropRect.x + cropRect.width / 3, cropRect.y + cropRect.height);
                    ctx.moveTo(cropRect.x + (cropRect.width * 2) / 3, cropRect.y);
                    ctx.lineTo(cropRect.x + (cropRect.width * 2) / 3, cropRect.y + cropRect.height);

                    // Horizontals
                    ctx.moveTo(cropRect.x, cropRect.y + cropRect.height / 3);
                    ctx.lineTo(cropRect.x + cropRect.width, cropRect.y + cropRect.height / 3);
                    ctx.moveTo(cropRect.x, cropRect.y + (cropRect.height * 2) / 3);
                    ctx.lineTo(cropRect.x + cropRect.width, cropRect.y + (cropRect.height * 2) / 3);

                    ctx.stroke();

                    // Handles (Corners and Sides)
                    const handleSize = 10 / viewState.scale;
                    const handleLength = 20 / viewState.scale; // For L-shaped corners
                    ctx.lineWidth = 3 / viewState.scale;
                    ctx.strokeStyle = '#ffffff';

                    // Helper for corner L-shapes
                    const drawCorner = (x, y, type) => {
                        ctx.beginPath();
                        if (type === 'tl') {
                            ctx.moveTo(x, y + handleLength);
                            ctx.lineTo(x, y);
                            ctx.lineTo(x + handleLength, y);
                        } else if (type === 'tr') {
                            ctx.moveTo(x - handleLength, y);
                            ctx.lineTo(x, y);
                            ctx.lineTo(x, y + handleLength);
                        } else if (type === 'bl') {
                            ctx.moveTo(x, y - handleLength);
                            ctx.lineTo(x, y);
                            ctx.lineTo(x + handleLength, y);
                        } else if (type === 'br') {
                            ctx.moveTo(x - handleLength, y);
                            ctx.lineTo(x, y);
                            ctx.lineTo(x, y - handleLength);
                        }
                        ctx.stroke();
                    };

                    drawCorner(cropRect.x, cropRect.y, 'tl');
                    drawCorner(cropRect.x + cropRect.width, cropRect.y, 'tr');
                    drawCorner(cropRect.x, cropRect.y + cropRect.height, 'bl');
                    drawCorner(cropRect.x + cropRect.width, cropRect.y + cropRect.height, 'br');
                }

                ctx.restore(); // Restore Global Zoom/Pan

            }, [layers, canvasSize, activeLayerId, activeTool, toolSettings, viewState, isCropping, cropRect]);

            return {
                viewState,
                setViewState
            };
        };

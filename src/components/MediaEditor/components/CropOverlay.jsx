import React, { useState, useEffect, useRef } from 'react';

/**
 * CropOverlay Component
 * Draggable and resizable crop rectangle
 */
export const CropOverlay = ({
    canvasRef,
    cropData,
    onCropChange,
    onCropEnd,
    aspectRatio = null,
    isActive = false,
    transform = {},
    mediaDimensions, // Optional, for aspect ratio if needed
    canvasDimensions // Required for correct aspect ratio fitting
}) => {
    const { x: tx = 0, y: ty = 0, scale = 100, rotation = 0 } = transform || {};
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const overlayRef = useRef(null);

    const { left = 0, top = 0, right = 0, bottom = 0 } = cropData;

    const [displayScale, setDisplayScale] = useState(1);

    useEffect(() => {
        if (canvasRef.current && canvasDimensions?.width) {
            const updateScale = () => {
                const rect = canvasRef.current.getBoundingClientRect();
                if (rect.width > 0 && canvasDimensions.width > 0) {
                    setDisplayScale(rect.width / canvasDimensions.width);
                }
            };

            updateScale();
            // Optional: Listen to resize
            window.addEventListener('resize', updateScale);
            return () => window.removeEventListener('resize', updateScale);
        }
    }, [canvasRef, canvasDimensions]);

    // Calculate Fitted Dimensions (Same logic as drawMediaToCanvas)
    let fittedWidth = 0;
    let fittedHeight = 0;

    // Fallbacks if data missing (graceful degradation to canvas size)
    const cw = canvasDimensions?.width || 800;
    const ch = canvasDimensions?.height || 450;

    if (mediaDimensions && canvasDimensions) {
        const mediaAspect = mediaDimensions.width / mediaDimensions.height;
        const canvasAspect = canvasDimensions.width / canvasDimensions.height;

        if (mediaAspect > canvasAspect) {
            fittedWidth = canvasDimensions.width;
            fittedHeight = canvasDimensions.width / mediaAspect;
        } else {
            fittedHeight = canvasDimensions.height;
            fittedWidth = canvasDimensions.height * mediaAspect;
        }
    } else {
        fittedWidth = cw;
        fittedHeight = ch;
    }

    // Derived visual values
    const x = left;
    const y = top;
    const width = 100 - left - right;
    const height = 100 - top - bottom;

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (!canvasRef.current) return;

            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();

            // 1. Normalize pointer to canvas space (0-width, 0-height)
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;

            // 2. Inverse Transform to get Media Local Coordinates
            // Media Center (relative to canvas top-left)
            const cx = rect.width / 2 + tx;
            const cy = rect.height / 2 + ty;

            // Translate to center
            const dx = canvasX - cx;
            const dy = canvasY - cy;

            // Inverse Rotation
            const rad = (-rotation * Math.PI) / 180;
            const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

            // Inverse Scale
            const finalX = rx / (scale / 100);
            const finalY = ry / (scale / 100); // Corrected property access

            // Convert to Percentage (Media Space)
            // Use FITTED dimensions instead of Canvas "Rect" dimensions
            // This ensures 0-100% maps to the EDGE of the media content, not the canvas
            const localWidth = fittedWidth;
            const localHeight = fittedHeight;

            const pointerX = Math.max(0, Math.min(100, ((finalX + localWidth / 2) / localWidth) * 100));
            const pointerY = Math.max(0, Math.min(100, ((finalY + localHeight / 2) / localHeight) * 100));

            if (isDragging) {
                const dx = pointerX - dragStart.x;
                const dy = pointerY - dragStart.y;

                // Calculate new positions clamping to bounds
                // We want to move the box, so width/height remain constant
                // newLeft + newRight + width = 100
                // newTop + newBottom + height = 100

                let newLeft = Math.max(0, Math.min(100 - width, left + dx));
                let newTop = Math.max(0, Math.min(100 - height, top + dy));

                // Recalculate right/bottom based on new position and fixed size
                const newRight = 100 - newLeft - width;
                const newBottom = 100 - newTop - height;

                onCropChange({ ...cropData, left: newLeft, top: newTop, right: newRight, bottom: newBottom });
                setDragStart({ x: pointerX, y: pointerY });
            } else if (isResizing) {
                handleResize(pointerX, pointerY);
            }
        };

        const handlePointerUp = () => {
            if (isDragging || isResizing) {
                if (onCropEnd) onCropEnd();
            }
            setIsDragging(false);
            setIsResizing(null);
        };

        if (isDragging || isResizing) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            return () => {
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
            };
        }
    }, [isDragging, isResizing, dragStart, cropData, onCropChange, canvasRef, left, top, right, bottom, width, height]);

    const handleResize = (pointerX, pointerY) => {
        let newLeft = left;
        let newTop = top;
        let newRight = right;
        let newBottom = bottom;

        // Minimum size constraint (e.g. 10%)
        const minSize = 10;

        if (isResizing.includes('left')) {
            // Adjust left edge
            // pointerX is the new left position
            // Constraint: pointerX < (100 - right - minSize)
            newLeft = Math.min(pointerX, 100 - right - minSize);
        }
        if (isResizing.includes('right')) {
            // Adjust right edge
            // pointerX is the new right edge position (from left)
            // right = 100 - pointerX
            // Constraint: pointerX > (left + minSize)
            const newRightPos = Math.max(pointerX, left + minSize);
            newRight = 100 - newRightPos;
        }
        if (isResizing.includes('top')) {
            // Adjust top edge
            newTop = Math.min(pointerY, 100 - bottom - minSize);
        }
        if (isResizing.includes('bottom')) {
            // Adjust bottom edge
            const newBottomPos = Math.max(pointerY, top + minSize);
            newBottom = 100 - newBottomPos;
        }

        // Aspect Ratio logic removed as requested (or simplified if needed, but "Edge Crop" usually implies free form)
        // If aspect ratio is strictly required, we'd need to adjust adjacent edges.
        // But user asked to "remove current aspect ratio crop", so I assume free form edge crop.

        onCropChange({ left: newLeft, top: newTop, right: newRight, bottom: newBottom });
    };

    const handleDragStart = (e) => {
        if (!canvasRef.current) return;
        e.stopPropagation();

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Similar math to pointer move
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        const { x: tx = 0, y: ty = 0, scale = 100, rotation = 0 } = transform || {}; // Re-destructure local if needed or use prop

        const cx = rect.width / 2 + tx;
        const cy = rect.height / 2 + ty;
        const dx = canvasX - cx;
        const dy = canvasY - cy;
        const rad = (-rotation * Math.PI) / 180;
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
        const finalX = rx / (scale / 100);
        const finalY = ry / (scale / 100);

        const localWidth = fittedWidth;
        const localHeight = fittedHeight;

        const x = Math.max(0, Math.min(100, ((finalX + localWidth / 2) / localWidth) * 100));
        const y = Math.max(0, Math.min(100, ((finalY + localHeight / 2) / localHeight) * 100));

        e.target.setPointerCapture(e.pointerId);
        setIsDragging(true);
        setDragStart({ x, y });
    };

    const handleResizeStart = (e, position) => {
        e.stopPropagation();
        e.target.setPointerCapture(e.pointerId);
        setIsResizing(position);
    };

    if (!isActive || !canvasRef.current) return null;

    return (
        <div
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none" // Clip to canvas if needed, or let it overflow? transform might push it out.
        >
            <div
                className="absolute"
                style={{
                    width: fittedWidth * displayScale,
                    height: fittedHeight * displayScale,
                    left: '50%',
                    top: '50%',
                    // Scale translation by displayScale.
                    // Scale rotation? No.
                    // Scale scale? No, clip scale applies to the content.
                    // But wait, if we resized the box 'fittedWidth * displayScale', 
                    // then applying 'scale(clipScale)' naturally scales it relative to that new size. Correct.
                    transform: `translate(-50%, -50%) translate(${tx * displayScale}px, ${ty * displayScale}px) scale(${scale / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center' // Rotation happens around its center
                }}
            >
                {/* Darkened areas outside crop */}
                <div className="absolute inset-0">
                    {/* Top */}
                    <div className="absolute bg-black/60" style={{ left: 0, top: 0, width: '100%', height: `${y}%` }} />
                    {/* Left */}
                    <div className="absolute bg-black/60" style={{ left: 0, top: `${y}%`, width: `${x}%`, height: `${height}%` }} />
                    {/* Right */}
                    <div className="absolute bg-black/60" style={{ left: `${x + width}%`, top: `${y}%`, width: `${100 - x - width}%`, height: `${height}%` }} />
                    {/* Bottom */}
                    <div className="absolute bg-black/60" style={{ left: 0, top: `${y + height}%`, width: '100%', height: `${100 - y - height}%` }} />
                </div>

                {/* Crop rectangle */}
                <div
                    onPointerDown={handleDragStart}
                    className="absolute border-2 border-white shadow-lg pointer-events-auto cursor-move"
                    style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        touchAction: 'none'
                    }}
                >
                    {/* Grid lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="border border-white/30" />
                        ))}
                    </div>

                    {/* Resize handles */}
                    {['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'].map(position => {
                        const isCorner = position.includes('-');
                        const positionStyles = {
                            'top-left': { top: '-6px', left: '-6px', cursor: 'nwse-resize' },
                            'top-right': { top: '-6px', right: '-6px', cursor: 'nesw-resize' },
                            'bottom-left': { bottom: '-6px', left: '-6px', cursor: 'nesw-resize' },
                            'bottom-right': { bottom: '-6px', right: '-6px', cursor: 'nwse-resize' },
                            'top': { top: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
                            'bottom': { bottom: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
                            'left': { left: '-4px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
                            'right': { right: '-4px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }
                        };

                        const inverseScale = 100 / (scale || 100) / displayScale;

                        return (
                            <div
                                key={position}
                                onPointerDown={(e) => handleResizeStart(e, position)}
                                className="absolute flex items-center justify-center pointer-events-auto shadow-md group"
                                style={{
                                    ...positionStyles[position],
                                    width: `${30 * inverseScale}px`, // Scaled hit area
                                    height: `${30 * inverseScale}px`, // Scaled hit area
                                    // Adjust offset to keep centered on corner despite size change
                                    // If we increase size, we might need to adjust top/left if they are hardcoded pixels.
                                    // But since they are centered via flex, let's just scale the hit box?
                                    // Actually, if we use width/height, the transform origin matters?
                                    // Let's just use transform scale instead.
                                    transform: `${positionStyles[position].transform || ''} scale(${inverseScale})`,
                                    zIndex: 10,
                                    touchAction: 'none',
                                    backgroundColor: 'transparent'
                                }}
                            >
                                {/* Visible Handle - Scaled relative to the hit area? No, parent is scaled inverse, so this is now "normal" size visually? 
                                    Wait, if parent is scaled up 2x, child is 2x. 
                                    If we set width/height of parent to 30 * inverse, it is physically larger in local space.
                                    If we use transform: scale(inverse), then parent is larger.
                                    Let's stick to transform.
                                */}
                                <div className={`bg-white border-2 border-blue-500 transition-transform group-hover:scale-125 ${isCorner ? 'w-3.5 h-3.5 rounded' : 'w-2.5 h-2.5 rounded-sm'}`} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

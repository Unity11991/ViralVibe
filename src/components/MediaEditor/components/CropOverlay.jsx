import React, { useState, useEffect, useRef } from 'react';

/**
 * CropOverlay Component
 * Draggable and resizable crop rectangle
 */
export const CropOverlay = ({
    canvasRef,
    cropData,
    onCropChange,
    aspectRatio = null,
    isActive = false
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const overlayRef = useRef(null);

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (!canvasRef.current) return;

            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            if (isDragging) {
                const dx = x - dragStart.x;
                const dy = y - dragStart.y;

                const newX = Math.max(0, Math.min(100 - cropData.width, cropData.x + dx));
                const newY = Math.max(0, Math.min(100 - cropData.height, cropData.y + dy));

                onCropChange({ ...cropData, x: newX, y: newY });
                setDragStart({ x, y });
            } else if (isResizing) {
                handleResize(x, y);
            }
        };

        const handlePointerUp = () => {
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
    }, [isDragging, isResizing, dragStart, cropData, onCropChange, canvasRef]);

    const handleResize = (x, y) => {
        const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = cropData;

        let newX = cropX;
        let newY = cropY;
        let newWidth = cropWidth;
        let newHeight = cropHeight;

        // Calculate new dimensions based on resize handle
        if (isResizing.includes('right')) {
            newWidth = Math.max(10, Math.min(100 - cropX, x - cropX));
        }
        if (isResizing.includes('left')) {
            const diff = x - cropX;
            newX = Math.max(0, Math.min(cropX + cropWidth - 10, x));
            newWidth = cropWidth + (cropX - newX);
        }
        if (isResizing.includes('bottom')) {
            newHeight = Math.max(10, Math.min(100 - cropY, y - cropY));
        }
        if (isResizing.includes('top')) {
            const diff = y - cropY;
            newY = Math.max(0, Math.min(cropY + cropHeight - 10, y));
            newHeight = cropHeight + (cropY - newY);
        }

        // Maintain aspect ratio if specified
        if (aspectRatio) {
            if (isResizing.includes('right') || isResizing.includes('left')) {
                newHeight = newWidth / aspectRatio;
                // Adjust if exceeds bounds
                if (newY + newHeight > 100) {
                    newHeight = 100 - newY;
                    newWidth = newHeight * aspectRatio;
                }
            } else {
                newWidth = newHeight * aspectRatio;
                // Adjust if exceeds bounds
                if (newX + newWidth > 100) {
                    newWidth = 100 - newX;
                    newHeight = newWidth / aspectRatio;
                }
            }
        }

        onCropChange({ x: newX, y: newY, width: newWidth, height: newHeight });
    };

    const handleDragStart = (e) => {
        if (!canvasRef.current) return;
        e.stopPropagation();

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setIsDragging(true);
        setDragStart({ x, y });
    };

    const handleResizeStart = (e, position) => {
        e.stopPropagation();
        setIsResizing(position);
    };

    if (!isActive || !canvasRef.current) return null;

    const { x, y, width, height } = cropData;
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const parentRect = canvas.parentElement.getBoundingClientRect();

    // Calculate offset to position overlay exactly on the canvas
    const offsetLeft = canvasRect.left - parentRect.left;
    const offsetTop = canvasRect.top - parentRect.top;

    return (
        <div
            ref={overlayRef}
            className="absolute pointer-events-none"
            style={{
                left: `${offsetLeft}px`,
                top: `${offsetTop}px`,
                width: `${canvasRect.width}px`,
                height: `${canvasRect.height}px`
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
                    height: `${height}%`
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

                    return (
                        <div
                            key={position}
                            onPointerDown={(e) => handleResizeStart(e, position)}
                            className="absolute bg-white border-2 border-blue-500 pointer-events-auto hover:scale-125 transition-transform shadow-md"
                            style={{
                                ...positionStyles[position],
                                width: isCorner ? '14px' : '10px',
                                height: isCorner ? '14px' : '10px',
                                borderRadius: isCorner ? '4px' : '3px'
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

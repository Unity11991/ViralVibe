import React from 'react';
import { X } from 'lucide-react';

/**
 * Editor Canvas Component
 * Displays the media preview with all effects applied
 */
export const EditorCanvas = ({
    canvasRef,
    overlayRef,
    textOverlays, // We might not need these props here anymore if we draw on canvas
    stickers,
    stickerImages,
    activeOverlayId,
    onOverlayPointerDown, // This will change to onCanvasPointerDown
    onUpdateText,
    onDeleteOverlay,
    onBackgroundClick,
    filterString = 'none',
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp
}) => {
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black/50">
            {/* Canvas */}
            <canvas
                ref={canvasRef}
                className="max-w-full max-h-full shadow-2xl touch-none" // touch-none for better gesture handling
                style={{
                    imageRendering: 'high-quality',
                    filter: filterString,
                    WebkitFilter: filterString // Safari support
                }}
                onPointerDown={onCanvasPointerDown}
                onPointerMove={onCanvasPointerMove}
                onPointerUp={onCanvasPointerUp}
                onPointerLeave={onCanvasPointerUp}
            />

            {/* We removed HTML overlays to avoid duplication and use Canvas for everything */}
        </div>
    );
};

const AutoResizingTextarea = ({ value, onChange, style }) => {
    const ref = React.useRef(null);

    React.useEffect(() => {
        if (ref.current && document.activeElement !== ref.current) {
            ref.current.innerText = value;
        }
    }, [value]);

    return (
        <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => onChange(e.currentTarget.innerText)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="bg-transparent outline-none w-full h-full text-center"
            style={{
                ...style,
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                minWidth: '1em'
            }}
        />
    );
};

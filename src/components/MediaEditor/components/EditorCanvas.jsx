import React from 'react';
import { X } from 'lucide-react';

/**
 * Editor Canvas Component
 * Displays the media preview with all effects applied
 */
export const EditorCanvas = ({
    canvasRef,
    overlayRef,
    textOverlays,
    stickers,
    stickerImages,
    activeOverlayId,
    onOverlayPointerDown,
    onUpdateText,
    onDeleteOverlay,
    onBackgroundClick
}) => {
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black/50">
            {/* Canvas */}
            <canvas
                ref={canvasRef}
                className="max-w-full max-h-full shadow-2xl"
                style={{ imageRendering: 'high-quality' }}
            />

            {/* Overlay Container */}
            <div
                ref={overlayRef}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                onClick={onBackgroundClick}
            >
                <div className="relative pointer-events-none" style={{
                    width: canvasRef.current?.style.width || '100%',
                    height: canvasRef.current?.style.height || '100%'
                }}>
                    {/* Text Overlays */}
                    {textOverlays.map(text => (
                        <div
                            key={text.id}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                onOverlayPointerDown(e, text.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                // Double click to edit - focus is handled by activeOverlayId
                            }}
                            style={{
                                position: 'absolute',
                                left: `${text.x}%`,
                                top: `${text.y}%`,
                                transform: `translate(-50%, -50%) rotate(${text.rotation}deg)`,
                                color: text.color,
                                fontSize: `${text.fontSize}px`,
                                fontFamily: text.fontFamily,
                                fontWeight: text.fontWeight,
                                cursor: 'move',
                                border: activeOverlayId === text.id ? '2px dashed #3b82f6' : '2px solid transparent',
                                padding: '8px',
                                borderRadius: '4px',
                                userSelect: 'none',
                                whiteSpace: 'nowrap',
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                pointerEvents: 'auto',
                                minWidth: '100px'
                            }}
                            className="hover:border-white/50 transition-colors"
                        >
                            {activeOverlayId === text.id ? (
                                <input
                                    type="text"
                                    value={text.text}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        onUpdateText(text.id, { text: e.target.value });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="bg-transparent border-none outline-none text-center w-full"
                                    style={{
                                        color: text.color,
                                        fontSize: 'inherit',
                                        fontFamily: 'inherit',
                                        fontWeight: 'inherit',
                                        textShadow: 'inherit'
                                    }}
                                    autoFocus
                                />
                            ) : (
                                <span>{text.text}</span>
                            )}
                            {activeOverlayId === text.id && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteOverlay(text.id);
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Sticker Overlays */}
                    {stickers.map((sticker, index) => (
                        <div
                            key={sticker.id}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                onOverlayPointerDown(e, sticker.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                left: `${sticker.x}%`,
                                top: `${sticker.y}%`,
                                transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                                cursor: 'move',
                                border: activeOverlayId === sticker.id ? '2px dashed #3b82f6' : '2px solid transparent',
                                padding: '4px',
                                borderRadius: '4px',
                                userSelect: 'none',
                                pointerEvents: 'auto'
                            }}
                            className="hover:border-white/50 transition-colors"
                        >
                            {stickerImages[index] && (
                                <img
                                    src={stickerImages[index].src}
                                    alt="sticker"
                                    className="max-w-[150px] max-h-[150px] object-contain pointer-events-none"
                                    draggable={false}
                                />
                            )}
                            {activeOverlayId === sticker.id && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteOverlay(sticker.id);
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

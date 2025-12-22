import React from 'react';
import { EditorCanvas } from '../EditorCanvas';
import { CropOverlay } from '../CropOverlay';
import { Loader2 } from 'lucide-react';

export const PreviewPlayer = ({
    canvasRef,
    overlayRef,
    textOverlays,
    stickers,
    stickerImages,
    activeOverlayId,
    startDragging,
    updateTextOverlay,
    deleteOverlay,
    setActiveOverlayId,
    adjustments,
    cropData,
    setCropData,
    cropPreset,
    activeTab,
    buildFilterString,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    isVideoLoading = false,
    isCropMode = false,
    onCropEnd
}) => {
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-[#0f0f12] overflow-hidden p-4">
            <div className="relative shadow-2xl max-w-full max-h-full flex items-center justify-center">
                {/* Wrapper for Canvas and Overlay to ensure perfect alignment */}
                <div className="relative transition-all duration-200 ease-in-out" style={{
                    width: canvasRef.current?.style.width || 'auto',
                    height: canvasRef.current?.style.height || 'auto'
                }}>
                    <EditorCanvas
                        canvasRef={canvasRef}
                        overlayRef={overlayRef}
                        textOverlays={textOverlays}
                        stickers={stickers}
                        stickerImages={stickerImages}
                        activeOverlayId={activeOverlayId}
                        onOverlayPointerDown={(e, id) => {
                            e.stopPropagation();
                            startDragging(id);
                        }}
                        onUpdateText={updateTextOverlay}
                        onDeleteOverlay={deleteOverlay}
                        onBackgroundClick={() => setActiveOverlayId(null)}
                        // filterString={buildFilterString(adjustments)} // REMOVED: Handled internally by canvas renderer
                        onCanvasPointerDown={onCanvasPointerDown}
                        onCanvasPointerMove={onCanvasPointerMove}
                        onCanvasPointerUp={onCanvasPointerUp}
                    />
                    <CropOverlay
                        canvasRef={canvasRef}
                        cropData={cropData}
                        onCropChange={setCropData}
                        onCropEnd={onCropEnd}
                        aspectRatio={cropPreset === 'free' ? null : cropPreset === '16:9' ? 16 / 9 : cropPreset === '9:16' ? 9 / 16 : cropPreset === '1:1' ? 1 : cropPreset === '4:5' ? 4 / 5 : null}
                        isActive={isCropMode}
                    />

                    {/* Loading Indicator */}
                    {isVideoLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50 pointer-events-none">
                            <Loader2 className="w-12 h-12 text-white animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

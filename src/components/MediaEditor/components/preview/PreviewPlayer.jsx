import React from 'react';
import { EditorCanvas } from '../EditorCanvas';
import { CropOverlay } from '../CropOverlay';

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
    onCanvasPointerUp
}) => {
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-[#0f0f12] overflow-hidden">
            <div className="relative shadow-2xl">
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
                    filterString={buildFilterString(adjustments)}
                    onCanvasPointerDown={onCanvasPointerDown}
                    onCanvasPointerMove={onCanvasPointerMove}
                    onCanvasPointerUp={onCanvasPointerUp}
                />
                <CropOverlay
                    canvasRef={canvasRef}
                    cropData={cropData}
                    onCropChange={setCropData}
                    aspectRatio={cropPreset === 'free' ? null : cropPreset === '16:9' ? 16 / 9 : cropPreset === '9:16' ? 9 / 16 : cropPreset === '1:1' ? 1 : cropPreset === '4:5' ? 4 / 5 : null}
                    isActive={activeTab === 'crop'}
                />
            </div>
        </div>
    );
};

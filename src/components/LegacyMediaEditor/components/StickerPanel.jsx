import React from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Button, Slider } from './UI';

/**
 * Sticker Panel Component
 */
export const StickerPanel = ({
    stickers,
    activeOverlayId,
    onUploadSticker,
    onUpdateSticker,
    onDeleteSticker
}) => {
    const activeSticker = stickers.find(s => s.id === activeOverlayId);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            onUploadSticker(file);
        }
    };

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="relative">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="sticker-upload"
                />
                <label
                    htmlFor="sticker-upload"
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-dashed border-white/20"
                >
                    <Upload size={20} />
                    Upload Sticker
                </label>
            </div>

            {activeSticker ? (
                <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-white">Edit Sticker</span>
                        <Button
                            onClick={() => onDeleteSticker(activeSticker.id)}
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                        />
                    </div>

                    {/* Scale */}
                    <Slider
                        label="Scale"
                        value={activeSticker.scale}
                        min={0.1}
                        max={3}
                        step={0.1}
                        onChange={(scale) => onUpdateSticker(activeSticker.id, { scale })}
                        unit="x"
                    />

                    {/* Rotation */}
                    <Slider
                        label="Rotation"
                        value={activeSticker.rotation}
                        min={-180}
                        max={180}
                        onChange={(rotation) => onUpdateSticker(activeSticker.id, { rotation })}
                        unit="°"
                    />
                </div>
            ) : (
                <div className="text-center text-white/30 py-8 text-sm">
                    Upload a sticker or select an existing one to edit
                </div>
            )}
        </div>
    );
};

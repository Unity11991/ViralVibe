import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Slider, Button } from './UI';

const ASPECT_RATIOS = [
    { id: 'free', label: 'Free', ratio: null },
    { id: '16:9', label: 'Landscape', ratio: 16 / 9, height: '14px' },
    { id: '9:16', label: 'Portrait', ratio: 9 / 16, height: '32px' },
    { id: '1:1', label: 'Square', ratio: 1, height: '24px' },
    { id: '4:5', label: 'Social', ratio: 4 / 5, height: '30px' },
];

/**
 * Crop Panel Component
 */
export const CropPanel = ({
    crop = {},
    onUpdate,
    rotation,
    zoom,
    onRotationChange,
    onZoomChange,
    onReset,
    onApply,
    onCancel
}) => {
    return (
        <div className="space-y-6 animate-slide-up">
            {/* Edge Crop Controls */}
            <div className="grid grid-cols-2 gap-4">
                {['Top', 'Bottom', 'Left', 'Right'].map((edge) => (
                    <div key={edge} className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-white/70">{edge}</span>
                            <span className="text-white/40">{crop[edge.toLowerCase()] || 0}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={crop[edge.toLowerCase()] || 0}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                onUpdate({ ...crop, [edge.toLowerCase()]: val });
                            }}
                            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                        />
                    </div>
                ))}
            </div>

            {/* Rotation & Zoom Controls */}
            <div className="space-y-4 pt-4 border-t border-white/5">
                <Slider
                    label="Rotation"
                    value={rotation}
                    min={-180}
                    max={180}
                    onChange={onRotationChange}
                    unit="°"
                />

                <Slider
                    label="Zoom"
                    value={zoom}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onChange={onZoomChange}
                    unit="x"
                />

                <div className="flex gap-2">
                    <Button
                        onClick={() => onRotationChange(rotation - 90)}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        icon={RotateCcw}
                    >
                        -90°
                    </Button>
                    <Button
                        onClick={onReset}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                    >
                        Reset
                    </Button>
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/5">
                    <Button
                        onClick={onCancel}
                        variant="ghost"
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onApply}
                        variant="primary"
                        className="flex-1"
                    >
                        Apply
                    </Button>
                </div>
            </div>
        </div>
    );
};

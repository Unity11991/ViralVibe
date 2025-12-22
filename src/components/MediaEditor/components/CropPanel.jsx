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
    cropPreset,
    rotation,
    zoom,
    onCropPresetChange,
    onRotationChange,
    onZoomChange,
    onReset,
    onApply,
    onCancel
}) => {
    return (
        <div className="space-y-6 animate-slide-up">
            {/* Aspect Ratio Grid */}
            <div className="grid grid-cols-2 gap-4">
                {ASPECT_RATIOS.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => onCropPresetChange(option.id)}
                        className={`
                            p-4 rounded-2xl border transition-all flex flex-col items-center gap-2
                            ${cropPreset === option.id
                                ? 'bg-blue-500/20 border-blue-500 text-white'
                                : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/10 hover:text-white'
                            }
                        `}
                    >
                        <div
                            className={`border-2 rounded-sm mb-1 ${cropPreset === option.id ? 'border-blue-400' : 'border-current'
                                }`}
                            style={{
                                width: '24px',
                                height: option.height || '24px'
                            }}
                        />
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs opacity-50">{option.id === 'free' ? 'Any' : option.id}</span>
                    </button>
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

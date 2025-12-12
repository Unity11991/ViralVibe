import React from 'react';
import { Circle, Square, Heart, Star, Ban, Move, Maximize, RotateCw, Feather } from 'lucide-react';
import { Slider, CollapsibleSection } from './UI';

/**
 * Mask Panel Component
 */
export const MaskPanel = ({ mask, onUpdate }) => {
    // Default mask state if undefined
    const currentMask = mask || {
        type: 'none',
        x: 0,
        y: 0,
        scale: 100,
        rotation: 0,
        rotation: 0,
        blur: 0
    };

    const handleUpdate = (key, value) => {
        onUpdate({
            ...currentMask,
            [key]: value
        });
    };

    const shapes = [
        { id: 'none', icon: Ban, label: 'None' },
        { id: 'circle', icon: Circle, label: 'Circle' },
        { id: 'rectangle', icon: Square, label: 'Rect' },
        { id: 'heart', icon: Heart, label: 'Heart' },
        { id: 'star', icon: Star, label: 'Star' }
    ];

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Shape Selection */}
            <div className="grid grid-cols-5 gap-2">
                {shapes.map(shape => (
                    <button
                        key={shape.id}
                        onClick={() => handleUpdate('type', shape.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${currentMask.type === shape.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <shape.icon size={20} />
                        <span className="text-[10px] font-medium">{shape.label}</span>
                    </button>
                ))}
            </div>

            {/* Properties - Only show if a mask is selected */}
            {currentMask.type !== 'none' && (
                <div className="space-y-4">
                    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                            <Maximize size={16} />
                            <span>Transform</span>
                        </div>

                        <Slider
                            label="Scale"
                            value={currentMask.scale}
                            min={10}
                            max={200}
                            onChange={(v) => handleUpdate('scale', v)}
                        />

                        <Slider
                            label="Rotation"
                            value={currentMask.rotation}
                            min={0}
                            max={360}
                            onChange={(v) => handleUpdate('rotation', v)}
                        />
                    </div>

                    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                            <Move size={16} />
                            <span>Position</span>
                        </div>

                        <Slider
                            label="X"
                            value={currentMask.x}
                            min={-100}
                            max={100}
                            onChange={(v) => handleUpdate('x', v)}
                        />

                        <Slider
                            label="Y"
                            value={currentMask.y}
                            min={-100}
                            max={100}
                            onChange={(v) => handleUpdate('y', v)}
                        />
                    </div>

                    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                            <Feather size={16} />
                            <span>Edge</span>
                        </div>

                        <Slider
                            label="Blur Edge"
                            value={currentMask.blur || 0}
                            min={0}
                            max={50}
                            onChange={(v) => handleUpdate('blur', v)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

import React from 'react';
import { Sun, Contrast, Droplet, Zap, Thermometer } from 'lucide-react';

export const AdjustmentPanel = ({ adjustments = {}, onUpdate }) => {
    const options = [
        { id: 'brightness', label: 'Brightness', icon: Sun, min: 0, max: 200, def: 100 },
        { id: 'contrast', label: 'Contrast', icon: Contrast, min: 0, max: 200, def: 100 },
        { id: 'saturate', label: 'Saturation', icon: Droplet, min: 0, max: 200, def: 100 },
        { id: 'blur', label: 'Blur', icon: Zap, min: 0, max: 20, def: 0 },
        { id: 'hue', label: 'Hue', icon: Thermometer, min: 0, max: 360, def: 0 },
    ];

    const handleChange = (id, value) => {
        onUpdate({ ...adjustments, [id]: value });
    };

    return (
        <div className="p-6 space-y-6 animate-slide-up">
            <div className="grid grid-cols-1 gap-6">
                {options.map(opt => (
                    <div key={opt.id} className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-white/80">
                                <opt.icon size={16} />
                                <span className="font-medium">{opt.label}</span>
                            </div>
                            <span className="text-white/40 font-mono text-xs">
                                {adjustments[opt.id] ?? opt.def}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={opt.min}
                            max={opt.max}
                            value={adjustments[opt.id] ?? opt.def}
                            onChange={(e) => handleChange(opt.id, parseInt(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

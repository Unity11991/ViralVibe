import React from 'react';
import { Zap, Tv, Grid, Layers, Activity, Eye, Sun, Moon, Droplet, Wind, CircleOff } from 'lucide-react';

export const EFFECTS_PRESETS = [
    { id: null, name: 'Normal', icon: CircleOff, values: null },

    // Aesthetic / Instagram
    { id: 'glow', name: 'Glow Up', icon: Sun, values: { type: 'glow', intensity: 50 } },
    { id: 'grain', name: 'Film Grain', icon: Wind, values: { type: 'grain', intensity: 50 } },
    { id: 'vintage-cam', name: 'Vintage Cam', icon: Tv, values: { type: 'vintage-cam', intensity: 50 } },
    { id: 'teal-orange', name: 'Teal & Orange', icon: Droplet, values: { type: 'teal-orange', intensity: 50 } },
    { id: 'polaroid', name: 'Polaroid', icon: Layers, values: { type: 'polaroid', intensity: 0 } },

    // Dynamic / Motion
    { id: 'flash-warn', name: 'Flash Warn', icon: Zap, values: { type: 'flash-warn', intensity: 50 } },
    { id: 'motion-blur', name: 'Motion Blur', icon: Activity, values: { type: 'motion-blur', intensity: 50 } },
    { id: 'color-pop', name: 'Color Pop', icon: Eye, values: { type: 'color-pop', intensity: 50 } },

    // Chromatic / Glitch
    { id: 'chromatic', name: 'Chromatic', icon: Zap, values: { type: 'chromatic', intensity: 50 } },
    { id: 'vhs', name: 'VHS', icon: Tv, values: { type: 'vhs', intensity: 50 } },
    { id: 'glitch', name: 'Glitch', icon: Activity, values: { type: 'glitch', intensity: 50 } },

    // Retro / Vintage
    { id: 'retro', name: 'Retro', icon: Grid, values: { type: 'retro', intensity: 50 } },
    { id: 'vintage', name: 'Vintage', icon: Layers, values: { type: 'vintage', intensity: 50 } },
    { id: 'noise', name: 'Grain', icon: Wind, values: { type: 'noise', intensity: 50 } },

    // Light / Color
    { id: 'soft', name: 'Soft', icon: Droplet, values: { type: 'soft', intensity: 50 } },
    { id: 'flash', name: 'Flash', icon: Sun, values: { type: 'flash', intensity: 50 } },
    { id: 'duotone', name: 'Duotone', icon: Droplet, values: { type: 'duotone', intensity: 50 } },
    { id: 'invert', name: 'Invert', icon: Moon, values: { type: 'invert', intensity: 100 } },
];

export const EffectsPanel = ({ activeEffectId, onEffectSelect, intensity, onIntensityChange }) => {
    return (
        <div className="w-full space-y-4 animate-slide-up">
            {/* Vertical Grid Container */}
            <div className="grid grid-cols-3 gap-3 pb-4 pt-2 px-2 custom-scrollbar">
                {EFFECTS_PRESETS.map((effect) => {
                    const Icon = effect.icon;
                    const isActive = activeEffectId === effect.id;

                    return (
                        <button
                            key={effect.id || 'normal'}
                            onClick={() => onEffectSelect(effect.id)}
                            className={`
                                flex flex-col items-center gap-2 group
                                transition-all duration-200
                            `}
                        >
                            <div className={`
                                w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-200
                                ${isActive
                                    ? 'border-blue-500 bg-blue-500/20 text-white scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                    : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30 hover:bg-white/10 hover:text-white'
                                }
                            `}>
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`
                                text-xs font-medium transition-colors
                                ${isActive ? 'text-blue-400' : 'text-white/50 group-hover:text-white/80'}
                            `}>
                                {effect.name}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Intensity Slider */}
            {activeEffectId && (
                <div className="px-4 py-2">
                    <div className="flex justify-between text-xs text-white/50 mb-2">
                        <span>Intensity</span>
                        <span>{intensity}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={intensity}
                        onChange={(e) => onIntensityChange(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                    />
                </div>
            )}
        </div>
    );
};

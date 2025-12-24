import React, { useState } from 'react';
import { Sparkles, ArrowRight, Layers, Zap, Grid, Circle, Box, Move, Activity, Aperture } from 'lucide-react';

export const TransitionsPanel = ({ activeClip, onUpdate }) => {
    const transitions = [
        { id: 'none', label: 'None' },
        { id: 'mix', label: 'Mix' },
        { id: 'fade_black', label: 'Black Fade' },
        { id: 'blur_focus', label: 'Blur' },
        { id: 'whirl', label: 'Whirl' },
        { id: 'comparision', label: 'Comparision' },
        { id: 'shaky_inhale', label: 'Shaky Inhale' },
        { id: 'pull_in', label: 'Pull In' },
        { id: 'blink', label: 'Blink' },
        { id: 'vertical_blur', label: 'Vertical Blur' },
        { id: 'shock_zoom', label: 'Shock Zoom' },
        { id: 'bubble_blur', label: 'Bubble Blur' },
        { id: 'glasre', label: 'Glasre' },
        { id: 'fast_swipe', label: 'Fast Swipe' },
        { id: 'paper_ball', label: 'Paper Ball' },
        { id: 'app_switch', label: 'App Switch' },
        { id: 'slice_reveal', label: 'Slice Reveal' },
        { id: 'gloss_wipe', label: 'Gloss Wipe' },
        { id: 'gradual_fade', label: 'Gradual Fade' },
        { id: 'pull_out', label: 'Pull Out' },
        { id: 'shake', label: 'Shake' },
        { id: 'left', label: 'Left' },
        { id: 'twist_turn', label: 'Twist Turn' },
        { id: 'film_erase', label: 'Film Erase' },
        { id: 'delay_zoom', label: 'Delay Zoom' },
        { id: 'tremble_zoom', label: 'Tremble Zoom' },
        { id: 'rotating_spotlight', label: 'Rotating Spotlight' },
    ];

    if (!activeClip) return <div className="p-4 text-white/50 text-center text-xs">No clip selected</div>;
    const currentTransition = activeClip.transition || { type: 'none', duration: 1.0 };

    return (
        <div className="flex flex-col h-full animate-slide-up relative overflow-hidden">
            <div className="flex flex-col h-full">
                {/* Transition Grid */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-3 gap-3">
                        {transitions.map(trans => (
                            <button
                                key={trans.id}
                                onClick={() => {
                                    // Logic: If None, set duration 0 (Cut). If other, ensure duration > 0.
                                    const newDuration = trans.id === 'none' ? 0 : (currentTransition.duration || 1.0);
                                    onUpdate({ transition: { type: trans.id, duration: newDuration } });
                                }}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${currentTransition.type === trans.id
                                    ? 'bg-blue-500/20 border-blue-500 text-white'
                                    : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/10 hover:text-white'
                                    }`}
                            >
                                {/* Preview Placeholder */}
                                <div className="w-full aspect-video bg-black/40 rounded-lg overflow-hidden relative group">
                                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${currentTransition.type === trans.id ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}>
                                        <Sparkles size={16} />
                                    </div>
                                </div>
                                <span className="text-[10px] font-medium text-center">{trans.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration Control */}
                {currentTransition.type !== 'none' && (
                    <div className="p-4 border-t border-white/10 bg-black/20">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/70">Duration</span>
                                <span className="text-white/40">{currentTransition.duration}s</span>
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="3.0"
                                step="0.1"
                                value={currentTransition.duration}
                                onChange={(e) => onUpdate({ transition: { ...currentTransition, duration: parseFloat(e.target.value) } })}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

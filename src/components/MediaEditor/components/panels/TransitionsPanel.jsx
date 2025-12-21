import React, { useState } from 'react';
import { Sparkles, ArrowRight, Layers, Zap, Grid, Circle, Box, Move, Activity, Aperture } from 'lucide-react';

export const TransitionsPanel = ({ activeClip, onUpdate }) => {
    const [activeCategory, setActiveCategory] = useState('basic');

    if (!activeClip) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-2">
                <Sparkles size={24} />
                <span className="text-xs">Select a clip to add transition</span>
            </div>
        );
    }

    const categories = [
        { id: 'basic', label: 'Basic', icon: Layers },
        { id: 'wipe', label: 'Wipe', icon: ArrowRight },
        { id: 'slide', label: 'Slide', icon: Move },
        { id: 'zoom', label: 'Zoom', icon: Box },
        { id: 'iris', label: 'Iris', icon: Circle },
        { id: 'shape', label: 'Shapes', icon: Grid },
        { id: 'glitch', label: 'Glitch', icon: Zap },
        { id: 'blur', label: 'Blur', icon: Activity },
        { id: 'color', label: 'Color', icon: Sparkles },
        { id: 'light', label: 'Light', icon: Aperture },
    ];

    // 100 Transitions defined here
    const transitions = {
        basic: [
            { id: 'none', label: 'None' },
            { id: 'fade', label: 'Cross Fade' },
            { id: 'fade_black', label: 'Fade to Black' },
            { id: 'fade_white', label: 'Fade to White' },
            { id: 'dissolve', label: 'Dissolve' },
            { id: 'luma_fade', label: 'Luma Fade' },
            { id: 'additive', label: 'Additive' },
            { id: 'multiply', label: 'Multiply' },
            { id: 'screen', label: 'Screen' },
            { id: 'overlay', label: 'Overlay' },
        ],
        wipe: [
            { id: 'wipe_left', label: 'Wipe Left' },
            { id: 'wipe_right', label: 'Wipe Right' },
            { id: 'wipe_up', label: 'Wipe Up' },
            { id: 'wipe_down', label: 'Wipe Down' },
            { id: 'wipe_tl', label: 'Wipe Top-Left' },
            { id: 'wipe_tr', label: 'Wipe Top-Right' },
            { id: 'wipe_bl', label: 'Wipe Bottom-Left' },
            { id: 'wipe_br', label: 'Wipe Bottom-Right' },
            { id: 'wipe_center_h', label: 'Wipe Center H' },
            { id: 'wipe_center_v', label: 'Wipe Center V' },
            { id: 'barn_door_h', label: 'Barn Door H' },
            { id: 'barn_door_v', label: 'Barn Door V' },
            { id: 'clock_cw', label: 'Clock CW' },
            { id: 'clock_ccw', label: 'Clock CCW' },
            { id: 'matrix_wipe', label: 'Matrix Wipe' },
        ],
        slide: [
            { id: 'slide_left', label: 'Push Left' },
            { id: 'slide_right', label: 'Push Right' },
            { id: 'slide_up', label: 'Push Up' },
            { id: 'slide_down', label: 'Push Down' },
            { id: 'cover_left', label: 'Cover Left' },
            { id: 'cover_right', label: 'Cover Right' },
            { id: 'cover_up', label: 'Cover Up' },
            { id: 'cover_down', label: 'Cover Down' },
            { id: 'reveal_left', label: 'Reveal Left' },
            { id: 'reveal_right', label: 'Reveal Right' },
            { id: 'reveal_up', label: 'Reveal Up' },
            { id: 'reveal_down', label: 'Reveal Down' },
        ],
        zoom: [
            { id: 'zoom_in', label: 'Zoom In' },
            { id: 'zoom_out', label: 'Zoom Out' },
            { id: 'zoom_rotate_in', label: 'Spin In' },
            { id: 'zoom_rotate_out', label: 'Spin Out' },
            { id: 'swirl_in', label: 'Swirl In' },
            { id: 'swirl_out', label: 'Swirl Out' },
            { id: 'elastic_in', label: 'Elastic In' },
            { id: 'elastic_out', label: 'Elastic Out' },
            { id: 'bounce_in', label: 'Bounce In' },
            { id: 'bounce_out', label: 'Bounce Out' },
        ],
        iris: [
            { id: 'iris_circle_in', label: 'Circle In' },
            { id: 'iris_circle_out', label: 'Circle Out' },
            { id: 'iris_rect_in', label: 'Box In' },
            { id: 'iris_rect_out', label: 'Box Out' },
            { id: 'iris_diamond_in', label: 'Diamond In' },
            { id: 'iris_diamond_out', label: 'Diamond Out' },
            { id: 'iris_star_in', label: 'Star In' },
            { id: 'iris_star_out', label: 'Star Out' },
            { id: 'iris_heart_in', label: 'Heart In' },
            { id: 'iris_heart_out', label: 'Heart Out' },
        ],
        shape: [
            { id: 'shape_checker', label: 'Checkerboard' },
            { id: 'shape_stripes_h', label: 'Stripes H' },
            { id: 'shape_stripes_v', label: 'Stripes V' },
            { id: 'shape_dots', label: 'Polka Dots' },
            { id: 'shape_spiral', label: 'Spiral' },
            { id: 'shape_zigzag', label: 'ZigZag' },
            { id: 'shape_waves', label: 'Waves' },
            { id: 'shape_blinds', label: 'Blinds' },
            { id: 'shape_curtain', label: 'Curtain' },
            { id: 'shape_shutter', label: 'Shutter' },
        ],
        glitch: [
            { id: 'glitch_analog', label: 'Analog TV' },
            { id: 'glitch_digital', label: 'Digital' },
            { id: 'glitch_rgb', label: 'RGB Split' },
            { id: 'glitch_scanline', label: 'Scanline' },
            { id: 'glitch_noise', label: 'Static Noise' },
            { id: 'glitch_displacement', label: 'Displace' },
            { id: 'glitch_block', label: 'Blocky' },
            { id: 'glitch_slice', label: 'Slicer' },
            { id: 'glitch_shake', label: 'Shake' },
            { id: 'glitch_warp', label: 'Warp' },
        ],
        blur: [
            { id: 'blur_gaussian', label: 'Gaussian' },
            { id: 'blur_motion', label: 'Motion Blur' },
            { id: 'blur_zoom', label: 'Zoom Blur' },
            { id: 'blur_radial', label: 'Radial Blur' },
            { id: 'blur_directional', label: 'Directional' },
            { id: 'pixelate', label: 'Pixelate' },
            { id: 'mosaic', label: 'Mosaic' },
            { id: 'crystallize', label: 'Crystallize' },
            { id: 'kaleidoscope', label: 'Kaleidoscope' },
            { id: 'dreamy', label: 'Dreamy' },
        ],
        color: [
            { id: 'color_burn', label: 'Color Burn' },
            { id: 'color_dodge', label: 'Color Dodge' },
            { id: 'hue_rotate', label: 'Hue Cycle' },
            { id: 'saturation_fade', label: 'Sat Fade' },
            { id: 'sepia_fade', label: 'Sepia Fade' },
            { id: 'grayscale_fade', label: 'B&W Fade' },
            { id: 'invert_fade', label: 'Invert' },
            { id: 'posterize', label: 'Posterize' },
            { id: 'threshold', label: 'Threshold' },
            { id: 'solarize', label: 'Solarize' },
        ],
        light: [
            { id: 'flash', label: 'Flash' },
            { id: 'flare', label: 'Lens Flare' },
            { id: 'glow', label: 'Glow' },
            { id: 'rays', label: 'God Rays' },
            { id: 'strobe', label: 'Strobe' },
            { id: 'flicker', label: 'Flicker' },
            { id: 'ghosting', label: 'Ghosting' },
            { id: 'bloom', label: 'Bloom' },
            { id: 'neon', label: 'Neon' },
            { id: 'leak', label: 'Light Leak' },
        ]
    };

    const currentTransition = activeClip.transition || { type: 'none', duration: 1.0 };

    return (
        <div className="flex flex-col h-full animate-slide-up relative overflow-hidden">
            {/* NEW: Coming Soon Overlay */}
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] rounded-2xl">
                    <div className="bg-slate-900 rounded-2xl px-6 py-4 flex flex-col items-center gap-3">
                        <div className="p-3 bg-white/10 rounded-full">
                            <Sparkles size={24} className="text-yellow-400 animate-pulse" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-white font-bold text-lg">Transitions</h3>
                            <p className="text-white/60 text-xs mt-1">Coming Soon</p>
                        </div>
                        <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/40">
                            Under Development
                        </div>
                    </div>
                </div>
            </div>

            {/* Existing Content (Blurred & Disabled) */}
            <div className="flex flex-col h-full opacity-30 pointer-events-none filter blur-[1px]">
                {/* Categories */}
                <div className="flex overflow-x-auto p-2 gap-2 border-b border-white/10 custom-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-lg transition-all ${activeCategory === cat.id
                                ? 'bg-blue-500 text-white'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <cat.icon size={18} />
                            <span className="text-[10px] whitespace-nowrap">{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* Transition Grid */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-3 gap-3">
                        {transitions[activeCategory]?.map(trans => (
                            <button
                                key={trans.id}
                                onClick={() => onUpdate({ transition: { ...currentTransition, type: trans.id } })}
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

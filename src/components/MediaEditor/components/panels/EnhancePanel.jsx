import React, { useState } from 'react';
import { Wand2, Sparkles, Activity, Eye, Zap, Flame } from 'lucide-react';
import { Slider, CollapsibleSection, Button } from '../UI';

/**
 * Enhance Panel Component
 * Simplified controls for "One-Click" video enhancement.
 */
export const EnhancePanel = ({ adjustments, onUpdate }) => {
    const [activeSection, setActiveSection] = useState('quality');

    // "Magic Enhance" presets
    const applyMagicEnhance = () => {
        onUpdate({
            ...adjustments,
            brightness: 5,
            contrast: 15,
            saturation: 15,
            sharpen: 30, // Assuming render engine supports this
            highlights: -10,
            shadows: 10,
            vibrance: 20
        });
    };

    const handleChange = (key, value) => {
        onUpdate({ ...adjustments, [key]: value });
    };

    return (
        <div className="space-y-6 animate-slide-up p-2">

            {/* Hero Auto Enhance Button */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity" />
                <button
                    onClick={applyMagicEnhance}
                    className="relative w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-bold text-white shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <Wand2 size={24} className="animate-pulse" />
                    <span>AI Magic Enhance</span>
                </button>
                <p className="text-center text-xs text-white/40 mt-2">
                    Instantly optimize color, light, and detail.
                </p>
            </div>

            {/* Super Resolution Toggle */}
            <div className={`p-4 rounded-xl border transition-all ${adjustments.superRes ? 'bg-blue-500/10 border-blue-500/50' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Activity size={18} className={adjustments.superRes ? "text-blue-400" : "text-white/40"} />
                        <span className="font-bold text-white">Super Resolution</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={adjustments.superRes || false}
                            onChange={(e) => handleChange('superRes', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                    Uses AI upscaling to add missing pixels and enhance clarity for a 4K look.
                </p>
            </div>

            <div className="w-full h-px bg-white/5" />

            {/* Quality Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Activity size={18} className="text-blue-400" />
                    <h3 className="font-bold text-white">Video Quality</h3>
                </div>

                <Slider
                    label="Sharpen"
                    value={adjustments.sharpen || 0}
                    min={0}
                    max={100}
                    onChange={(v) => handleChange('sharpen', v)}
                />

                <Slider
                    label="Clarity"
                    value={adjustments.clarity || 0} // Mapped to contrast/structure in renderer?
                    min={0}
                    max={100}
                    onChange={(v) => handleChange('clarity', v)}
                    disabled={false}
                />
            </div>

            <div className="w-full h-px bg-white/5" />

            {/* Correction Section (Mock/Future) */}
            <div className="space-y-4 opacity-100">
                <div className="flex items-center gap-2 mb-2">
                    <Zap size={18} className="text-yellow-400" />
                    <h3 className="font-bold text-white">Correction AI</h3>
                </div>
                <div className="space-y-3">
                    {/* Denoise Mock */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white/60">
                            <span>Noise Reduction</span>
                            <span>{adjustments.denoise || 0}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={adjustments.denoise || 0}
                            onChange={(e) => handleChange('denoise', parseInt(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                        />
                    </div>

                    {/* Stabilize Mock */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white/60">
                            <span>Stabilization</span>
                            <span>{adjustments.stabilize || 0}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={adjustments.stabilize || 0}
                            onChange={(e) => handleChange('stabilize', parseInt(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                        />
                    </div>
                </div>
            </div>

            <div className="w-full h-px bg-white/5" />

            {/* Face Retouch (Mock/Future) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Eye size={18} className="text-pink-400" />
                    <h3 className="font-bold text-white">Face Retouch</h3>
                </div>

                <Slider
                    label="Smooth Skin"
                    value={adjustments.skinSmooth || 0}
                    min={0}
                    max={100}
                    onChange={(v) => handleChange('skinSmooth', v)}
                />
                <Slider
                    label="Brighten Eyes"
                    value={adjustments.eyeBrighten || 0}
                    min={0}
                    max={100}
                    onChange={(v) => handleChange('eyeBrighten', v)}
                />
            </div>

            <div className="w-full h-px bg-white/5" />

            {/* Deep Pixel Engine Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Flame size={18} className="text-orange-400" />
                    <h3 className="font-bold text-white">Deep Pixel Engine</h3>
                </div>

                <div className="grid grid-cols-2 gap-2">

                    {[
                        { id: 'none', label: 'None' },
                        { id: 'real-esrgan-lite', label: 'Real-ESRGAN' },
                        { id: 'glamour-glow', label: 'Glamour Glow' },
                        { id: 'restore-detail', label: 'AI Repair' },
                        { id: 'neural-sharpen', label: 'Neural Sharpen' },
                        { id: 'smart-smooth', label: 'Smart Smooth' }
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleChange('pixelMode', item.id === adjustments.pixelMode ? 'none' : item.id)}
                            className={`p-3 rounded-lg text-xs font-bold transition-all border ${adjustments.pixelMode === item.id
                                ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-white/30 px-1">
                    Directly manipulates pixels using GPU convolution matrices.
                </p>
            </div>

        </div>
    );
};

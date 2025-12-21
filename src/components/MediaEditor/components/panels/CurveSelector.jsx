import React, { useState } from 'react';
import { EASING_PRESETS } from '../../utils/animationUtils';
import { CustomCurveEditor } from './CustomCurveEditor';
import { Settings2 } from 'lucide-react';

export const CurveSelector = ({ activeEasing, onSelect }) => {
    const isCustom = activeEasing && typeof activeEasing === 'object' && activeEasing.type === 'bezier';
    const [showCustomEditor, setShowCustomEditor] = useState(isCustom);

    return (
        <div className="space-y-3">
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider flex justify-between items-center">
                Keyframe Easing
                {isCustom && (
                    <button
                        onClick={() => setShowCustomEditor(!showCustomEditor)}
                        className="text-blue-400 hover:text-blue-300"
                    >
                        <Settings2 size={12} />
                    </button>
                )}
            </h4>

            {showCustomEditor ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <CustomCurveEditor
                        value={isCustom ? activeEasing : { x1: 0.33, y1: 0, x2: 0.67, y2: 1 }}
                        onChange={(newCurve) => {
                            onSelect({ type: 'bezier', ...newCurve });
                        }}
                    />
                    <button
                        onClick={() => setShowCustomEditor(false)}
                        className="w-full py-1 text-[10px] text-white/40 hover:text-white bg-white/5 rounded"
                    >
                        Back to Presets
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2">
                    {EASING_PRESETS.map(preset => {
                        const isActive = (activeEasing || 'linear') === preset.id;
                        return (
                            <button
                                key={preset.id}
                                onClick={() => onSelect(preset.id)}
                                className={`group relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${isActive
                                    ? 'bg-blue-500/20 border-blue-500 text-white'
                                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                title={preset.label}
                            >
                                {/* SVG Curve Visualization */}
                                <div className="w-8 h-8 mb-1 relative">
                                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                                        {/* Grid Lines */}
                                        <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
                                        <line x1="0" y1="0" x2="0" y2="100" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />

                                        {/* The Curve */}
                                        <path
                                            d={preset.path}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            className={isActive ? 'text-blue-400' : 'text-white/60 group-hover:text-white'}
                                        />

                                        {/* End Points */}
                                        <circle cx="0" cy="100" r="4" fill="currentColor" />
                                        <circle cx="100" cy="0" r="4" fill="currentColor" />
                                    </svg>
                                </div>
                                <span className="text-[9px] font-medium truncate w-full text-center">{preset.label}</span>
                            </button>
                        );
                    })}

                    {/* Custom Button */}
                    <button
                        onClick={() => {
                            setShowCustomEditor(true);
                            // Set default custom if not already
                            if (!isCustom) {
                                onSelect({ type: 'bezier', x1: 0.33, y1: 0, x2: 0.67, y2: 1 });
                            }
                        }}
                        className={`group relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${isCustom
                            ? 'bg-blue-500/20 border-blue-500 text-white'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        <div className="w-8 h-8 mb-1 flex items-center justify-center">
                            <Settings2 size={20} />
                        </div>
                        <span className="text-[9px] font-medium truncate w-full text-center">Custom</span>
                    </button>
                </div>
            )}
        </div>
    );
};

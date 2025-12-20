import React from 'react';
import { Brush, Eraser } from 'lucide-react';

export const DrawingPanel = ({ brushSettings, onUpdate }) => {
    return (
        <div className="p-6 space-y-6 animate-slide-up">
            <div className="flex justify-center gap-4">
                <button
                    onClick={() => onUpdate({ tool: 'brush' })}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 w-28 transition-all ${brushSettings.tool === 'brush'
                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                >
                    <Brush size={24} />
                    <span className="text-xs font-bold uppercase tracking-wider">Brush</span>
                </button>
                <button
                    onClick={() => onUpdate({ tool: 'eraser' })}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 w-28 transition-all ${brushSettings.tool === 'eraser'
                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                >
                    <Eraser size={24} />
                    <span className="text-xs font-bold uppercase tracking-wider">Eraser</span>
                </button>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-white/60 uppercase tracking-wide">
                        <span>Size</span>
                        <span>{brushSettings.size}px</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="50"
                        value={brushSettings.size}
                        onChange={(e) => onUpdate({ size: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                    />
                </div>

                {brushSettings.tool === 'brush' && (
                    <div className="space-y-2">
                        <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Color</span>
                        <div className="flex flex-wrap gap-3">
                            {['#ffffff', '#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => onUpdate({ color })}
                                    className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${brushSettings.color === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                                <input
                                    type="color"
                                    value={brushSettings.color}
                                    onChange={(e) => onUpdate({ color: e.target.value })}
                                    className="absolute -top-2 -left-2 w-14 h-14 p-0 border-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

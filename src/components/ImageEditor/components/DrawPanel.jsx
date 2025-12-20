import React, { useState } from 'react';
import { Brush, Eraser, Palette, Circle } from 'lucide-react';

export const DrawPanel = ({ onUpdateBrush }) => {
    const [activeTool, setActiveTool] = useState('brush');
    const [brushSize, setBrushSize] = useState(10);
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [hardness, setHardness] = useState(100);

    const handleUpdate = (updates) => {
        // Propagate updates to parent/canvas
        onUpdateBrush({
            tool: updates.tool || activeTool,
            size: updates.size || brushSize,
            color: updates.color || brushColor,
            hardness: updates.hardness || hardness
        });
    };

    const colors = [
        '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
        '#ffff00', '#00ffff', '#ff00ff', '#ffa500', '#800080'
    ];

    return (
        <div className="p-4 space-y-6">
            {/* Tools */}
            <div className="flex gap-4 justify-center">
                <button
                    onClick={() => { setActiveTool('brush'); handleUpdate({ tool: 'brush' }); }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 w-24 transition-all ${activeTool === 'brush'
                            ? 'bg-blue-500 border-blue-400 text-white'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                >
                    <Brush size={20} />
                    <span className="text-xs font-bold">Brush</span>
                </button>
                <button
                    onClick={() => { setActiveTool('eraser'); handleUpdate({ tool: 'eraser' }); }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 w-24 transition-all ${activeTool === 'eraser'
                            ? 'bg-blue-500 border-blue-400 text-white'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                >
                    <Eraser size={20} />
                    <span className="text-xs font-bold">Eraser</span>
                </button>
            </div>

            {/* Size Slider */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/60">
                    <span>Size</span>
                    <span>{brushSize}px</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="100"
                    value={brushSize}
                    onChange={(e) => {
                        const size = parseInt(e.target.value);
                        setBrushSize(size);
                        handleUpdate({ size });
                    }}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                />
            </div>

            {/* Hardness Slider */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/60">
                    <span>Hardness</span>
                    <span>{hardness}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={hardness}
                    onChange={(e) => {
                        const h = parseInt(e.target.value);
                        setHardness(h);
                        handleUpdate({ hardness: h });
                    }}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                />
            </div>

            {/* Color Palette */}
            {activeTool === 'brush' && (
                <div className="space-y-2">
                    <span className="text-xs text-white/60">Color</span>
                    <div className="flex flex-wrap gap-2">
                        {colors.map(color => (
                            <button
                                key={color}
                                onClick={() => { setBrushColor(color); handleUpdate({ color }); }}
                                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${brushColor === color ? 'border-white scale-110' : 'border-transparent'
                                    }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white/20">
                            <input
                                type="color"
                                value={brushColor}
                                onChange={(e) => { setBrushColor(e.target.value); handleUpdate({ color: e.target.value }); }}
                                className="absolute -top-2 -left-2 w-12 h-12 p-0 border-0 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

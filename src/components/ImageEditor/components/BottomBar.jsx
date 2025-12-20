import React from 'react';
import { Minus, Plus, Maximize } from 'lucide-react';

export const BottomBar = ({
    scale,
    onZoomChange,
    onFit,
    dimensions
}) => {
    return (
        <div className="h-10 bg-[#141414] border-t border-white/10 flex items-center justify-between px-4 z-30 shrink-0">
            {/* Left: Dimensions */}
            <div className="text-xs font-mono text-white/60">
                {dimensions ? `${Math.round(dimensions.width)}px × ${Math.round(dimensions.height)}px` : ''}
            </div>

            {/* Center: Zoom Controls */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => onZoomChange(scale - 0.1)}
                    className="p-1 text-white/60 hover:text-white transition-colors"
                >
                    <Minus size={14} />
                </button>

                <div className="w-32 flex items-center gap-2">
                    <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={scale}
                        onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/40 hover:[&::-webkit-slider-thumb]:bg-white cursor-pointer"
                    />
                    <span className="text-xs font-mono text-white/60 w-10 text-right">
                        {Math.round(scale * 100)}%
                    </span>
                </div>

                <button
                    onClick={() => onZoomChange(scale + 0.1)}
                    className="p-1 text-white/60 hover:text-white transition-colors"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Right: Fit Button */}
            <button
                onClick={onFit}
                className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="Fit to Screen"
            >
                <Maximize size={14} />
            </button>
        </div>
    );
};

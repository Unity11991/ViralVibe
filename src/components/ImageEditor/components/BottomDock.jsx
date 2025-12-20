import React from 'react';
import { Sliders, Wand2, Type, Sticker, Brush, Image as ImageIcon, Crop } from 'lucide-react';

export const BottomDock = ({ activeTool, onSelectTool }) => {
    const tools = [
        { id: 'tools', icon: Crop, label: 'Tools' },
        { id: 'adjust', icon: Sliders, label: 'Adjust' },
        { id: 'filters', icon: Wand2, label: 'FX' },
        { id: 'stickers', icon: Sticker, label: 'Sticker' },
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'draw', icon: Brush, label: 'Draw' },
    ];

    return (
        <div className="h-20 bg-[#141414] border-t border-white/10 flex items-center justify-center px-4 shrink-0 z-20">
            <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto w-full max-w-2xl justify-between sm:justify-center no-scrollbar">
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        onClick={() => onSelectTool(tool.id)}
                        className={`flex flex-col items-center gap-1.5 min-w-[64px] p-2 rounded-xl transition-all ${activeTool === tool.id
                                ? 'text-white bg-white/10 scale-105'
                                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                            }`}
                    >
                        <tool.icon size={24} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
                        <span className="text-[10px] font-bold tracking-wide uppercase">{tool.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

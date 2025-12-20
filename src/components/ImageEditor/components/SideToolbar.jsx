import React from 'react';
import {
    Move,
    Crop,
    Brush,
    Eraser,
    Type,
    Image as ImageIcon,
    Hand,
    ZoomIn,
    Square,
    MousePointer2,
    SlidersHorizontal
} from 'lucide-react';

export const SideToolbar = ({ activeTool, onSelectTool }) => {
    const tools = [
        { id: 'move', icon: Move, label: 'Move (V)', shortcut: 'v' },
        { id: 'adjust', icon: SlidersHorizontal, label: 'Adjust', shortcut: 'a' },
        { id: 'crop', icon: Crop, label: 'Crop (C)', shortcut: 'c' },
        { id: 'brush', icon: Brush, label: 'Brush (B)', shortcut: 'b' },
        { id: 'eraser', icon: Eraser, label: 'Eraser (E)', shortcut: 'e' },
        { id: 'text', icon: Type, label: 'Text (T)', shortcut: 't' },
        { id: 'shapes', icon: Square, label: 'Shapes (U)', shortcut: 'u' },
        { id: 'hand', icon: Hand, label: 'Hand (H)', shortcut: 'h' },
        { id: 'zoom', icon: ZoomIn, label: 'Zoom (Z)', shortcut: 'z' },
    ];

    return (
        <div className="w-12 bg-[#1a1a1a] border-r border-white/10 flex flex-col items-center py-2 gap-1 shrink-0 z-30 h-full">
            {tools.map(tool => (
                <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className={`group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all ${activeTool === tool.id
                        ? 'bg-[#2a2a2a] text-blue-400 border-l-2 border-blue-500 shadow-inner'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <tool.icon size={18} strokeWidth={activeTool === tool.id ? 2.5 : 2} />

                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[#000] text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10 shadow-xl delay-500">
                        {tool.label}
                    </div>
                </button>
            ))}
        </div>
    );
};

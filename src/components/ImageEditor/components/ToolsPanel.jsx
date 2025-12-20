import React from 'react';
import { Crop, RotateCw, FlipHorizontal, FlipVertical, Maximize, Move } from 'lucide-react';

export const ToolsPanel = ({ onApplyTool }) => {
    const tools = [
        { id: 'crop', name: 'Crop', icon: Crop },
        { id: 'rotate', name: 'Rotate', icon: RotateCw },
        { id: 'flip-h', name: 'Flip H', icon: FlipHorizontal },
        { id: 'flip-v', name: 'Flip V', icon: FlipVertical },
        { id: 'resize', name: 'Resize', icon: Maximize },
        { id: 'perspective', name: 'Perspective', icon: Move },
    ];

    return (
        <div className="grid grid-cols-3 gap-3 p-4">
            {tools.map(tool => (
                <button
                    key={tool.id}
                    onClick={() => onApplyTool(tool.id)}
                    className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-white/20 transition-all group"
                >
                    <div className="p-2 bg-white/5 rounded-lg mb-2 group-hover:scale-110 transition-transform text-blue-400">
                        <tool.icon size={24} />
                    </div>
                    <span className="text-xs font-medium text-white/80">{tool.name}</span>
                </button>
            ))}
        </div>
    );
};

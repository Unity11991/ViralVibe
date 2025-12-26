import React from 'react';
import {
    LayoutGrid, Type, Music, Image as ImageIcon, Sliders, Wand2,
    Sparkles, ArrowRightLeft, Smile, ScanFace, Zap
} from 'lucide-react';

/**
 * CapCut-style Mobile Toolbar
 * Matches desktop AssetsPanel tools exactly
 */
export const CapCutMobileToolbar = ({
    onToolSelect,
    activeTool
}) => {
    const tools = [
        { id: 'media', icon: ImageIcon, label: 'Media' },
        { id: 'audio', icon: Music, label: 'Audio' },
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'stickers', icon: Smile, label: 'Stickers' },
        { id: 'edit', icon: Sliders, label: 'Edit' }, // Properties panel
        { id: 'enhance', icon: Zap, label: 'Enhance' },
        { id: 'adjust', icon: Sliders, label: 'Adjust' },
        { id: 'filters', icon: Wand2, label: 'Filters' },
        { id: 'effects', icon: Sparkles, label: 'Effects' },
        { id: 'transitions', icon: ArrowRightLeft, label: 'Transitions' },
        { id: 'mask', icon: ScanFace, label: 'Mask' },
        { id: 'templates', icon: LayoutGrid, label: 'Templates' },
    ];

    return (
        <div className="capcut-mobile-toolbar">
            {/* Horizontal Scrolling Tool Bar */}
            <div className="flex overflow-x-auto gap-1 px-3 py-2 bg-[#1a1a1f] border-t border-white/10 hide-scrollbar">
                {tools.map(tool => {
                    const isActive = activeTool === tool.id;

                    return (
                        <button
                            key={tool.id}
                            onClick={() => onToolSelect(tool.id)}
                            className={`
                                flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg
                                min-w-[64px] flex-shrink-0 transition-all
                                ${isActive
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white/10 text-white/70 hover:bg-white/20 active:scale-95'
                                }
                            `}
                        >
                            <tool.icon size={20} strokeWidth={2} />
                            <span className="text-[10px] font-medium whitespace-nowrap">
                                {tool.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

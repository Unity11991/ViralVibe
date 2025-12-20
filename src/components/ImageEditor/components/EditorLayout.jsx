import React from 'react';
import { X, Download, Undo2, Redo2, Layers } from 'lucide-react';

export const EditorLayout = ({
    children,
    onClose,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onExport,
    leftSidebar,
    rightSidebar,
    optionsBar,
    toolPanel,
    bottomBar
}) => {
    return (
        <div className="flex flex-col h-full bg-[#0f0f0f] text-white">
            {/* Top Bar */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#141414] z-30 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-2" />

                    <div className="flex items-center gap-1">
                        <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className={`p-2 rounded-full transition-colors ${canUndo ? 'hover:bg-white/10 text-white' : 'text-white/20 cursor-not-allowed'}`}
                        >
                            <Undo2 size={18} />
                        </button>
                        <button
                            onClick={onRedo}
                            disabled={!canRedo}
                            className={`p-2 rounded-full transition-colors ${canRedo ? 'hover:bg-white/10 text-white' : 'text-white/20 cursor-not-allowed'}`}
                        >
                            <Redo2 size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onExport}
                        className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-bold rounded-full shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Options Bar */}
            {optionsBar}

            {/* Main Workspace Grid */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar (Tools) */}
                {leftSidebar}

                {/* Tool Panel (Secondary Sidebar) */}
                {toolPanel && (
                    <div className="w-64 bg-[#1a1a1a] border-r border-white/10 flex flex-col z-20 shrink-0 animate-slide-in-left">
                        {toolPanel}
                    </div>
                )}

                {/* Center Canvas */}
                <div className="flex-1 relative bg-[#1a1a1a] overflow-hidden">
                    {children}
                </div>

                {/* Right Sidebar (Properties & Layers) */}
                <div className="w-80 bg-[#141414] border-l border-white/10 flex flex-col z-20 shrink-0">
                    {rightSidebar}
                </div>
            </div>

            {/* Bottom Bar */}
            {bottomBar}
        </div>
    );
};

import React from 'react';

export const PropertiesPanel = ({ title, children, onClose }) => {
    if (!children) return null;

    return (
        <div className="flex flex-col h-full bg-[#141414] border-l border-white/10">
            {/* Header */}
            <div className="h-14 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-white/40 hover:text-white transition-colors text-xs"
                    >
                        Close
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </div>
    );
};

import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Mobile Tool Panel - Compact Bottom Sheet
 * Slides up from bottom but doesn't cover entire screen
 * Allows canvas to remain visible
 */
export const MobileToolPanel = ({
    isOpen,
    onClose,
    title,
    children
}) => {
    if (!isOpen) return null;

    return (
        <div className="mobile-tool-panel-container md:hidden">
            {/* Backdrop - semi-transparent, doesn't block canvas */}
            <div
                className="mobile-tool-panel-backdrop"
                onClick={onClose}
            />

            {/* Compact Panel - Only takes 50% of screen */}
            <div className="mobile-tool-panel">
                {/* Drag Handle */}
                <div className="mobile-tool-panel-handle-bar">
                    <div className="mobile-tool-panel-handle" />
                </div>

                {/* Header */}
                <div className="mobile-tool-panel-header">
                    <h3 className="text-base font-bold capitalize">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ChevronDown size={20} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="mobile-tool-panel-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

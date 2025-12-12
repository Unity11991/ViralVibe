import React from 'react';

export const EditorLayout = ({
    leftPanel,
    centerPanel,
    rightPanel,
    bottomPanel,
    header
}) => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f12] text-white overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-white/5 flex-shrink-0">
                {header}
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel (Assets) - Hidden on mobile initially, or toggleable */}
                <div className="hidden md:flex w-[320px] border-r border-white/5 flex-col bg-[#1a1a1f]">
                    {leftPanel}
                </div>

                {/* Center Area (Preview + Timeline) */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Preview Area */}
                    <div className="flex-1 relative bg-[#0f0f12] flex items-center justify-center p-4">
                        {centerPanel}
                    </div>

                    {/* Timeline Area */}
                    <div className="h-[300px] border-t border-white/5 bg-[#1a1a1f] flex flex-col">
                        {bottomPanel}
                    </div>
                </div>

                {/* Right Panel (Properties) */}
                <div className="hidden lg:flex w-[300px] border-l border-white/5 flex-col bg-[#1a1a1f]">
                    {rightPanel}
                </div>
            </div>

            {/* Mobile Navigation / Tabs would go here if needed */}
        </div>
    );
};

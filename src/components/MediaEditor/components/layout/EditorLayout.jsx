import React, { useState, useEffect, useRef } from 'react';
import { Layout, Layers, Settings, Clock, GripHorizontal } from 'lucide-react';

export const EditorLayout = ({
    leftPanel,
    centerPanel,
    rightPanel,
    bottomPanel,
    header
}) => {
    const [activeMobileTab, setActiveMobileTab] = useState('timeline'); // 'timeline', 'assets', 'properties'
    const [timelineHeight, setTimelineHeight] = useState(300);
    const [isResizing, setIsResizing] = useState(false);

    // Refs for resizing logic to avoid stale closures in event listeners
    const resizingRef = useRef(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(300);

    // Resizing Handlers
    const startResizing = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Stop propagation to prevent canvas events
        setIsResizing(true);
        resizingRef.current = true;
        startYRef.current = e.clientY;
        startHeightRef.current = timelineHeight;

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'row-resize';
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizingRef.current) return;
            e.preventDefault();

            // Calculate new height: dragging UP increases height (negative dy)
            const dy = startYRef.current - e.clientY;

            // Constrain height: Min 150px, Max window height - 100px (header + minimal preview)
            const maxHeight = window.innerHeight - 100;
            const newHeight = Math.min(Math.max(startHeightRef.current + dy, 150), maxHeight);

            setTimelineHeight(newHeight);
        };

        const handleMouseUp = () => {
            if (resizingRef.current) {
                resizingRef.current = false;
                setIsResizing(false);
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f12] text-white overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-white/5 flex-shrink-0">
                {header}
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Panel (Assets) */}
                {/* Desktop: Always visible. Mobile: Visible only when active tab is assets */}
                <div className={`${activeMobileTab === 'assets' ? 'flex absolute inset-0 z-20 w-full' : 'hidden'} md:relative md:flex md:w-[320px] border-r border-white/5 flex-col bg-[#1a1a1f]`}>
                    {leftPanel}
                </div>

                {/* Center Area (Preview + Timeline) */}
                <div className="flex-1 flex flex-col min-w-0 h-full">
                    {/* Preview Area */}
                    <div className="flex-1 relative bg-[#0f0f12] flex items-center justify-center p-4 min-h-0 overflow-hidden">
                        {centerPanel}
                    </div>

                    {/* Resize Handle (Desktop Only) */}
                    <div
                        onMouseDown={startResizing}
                        className={`hidden md:flex h-4 -mt-2 -mb-2 z-40 cursor-row-resize items-center justify-center group relative touch-none select-none`}
                    >
                        {/* Visual Handle */}
                        <div className={`w-full h-2 flex items-center justify-center transition-colors bg-[#0f0f12] border-t border-white/5 ${isResizing ? 'bg-blue-900/20' : 'group-hover:bg-white/5'}`}>
                            <div className={`w-12 h-1 rounded-full transition-colors flex items-center justify-center ${isResizing ? 'bg-blue-500' : 'bg-white/10 group-hover:bg-white/30'}`}>
                                <GripHorizontal size={12} className={isResizing ? 'text-blue-200' : 'text-transparent group-hover:text-white/50'} />
                            </div>
                        </div>
                    </div>

                    {/* Timeline Area */}
                    {/* Desktop: Dynamic Height. Mobile: Fixed/Flex for tab view */}
                    <div
                        style={{ height: window.innerWidth >= 768 ? `${timelineHeight}px` : undefined }}
                        className={`${activeMobileTab === 'timeline' ? 'flex' : 'hidden'} md:flex border-t border-white/5 bg-[#1a1a1f] flex-col overflow-hidden`}
                    >
                        {bottomPanel}
                    </div>
                </div>

                {/* Right Panel (Properties) */}
                {/* Desktop: Always visible. Mobile: Visible only when active tab is properties */}
                <div className={`${activeMobileTab === 'properties' ? 'flex absolute inset-0 z-20 w-full' : 'hidden'} lg:relative lg:flex lg:w-[300px] border-l border-white/5 flex-col bg-[#1a1a1f]`}>
                    {rightPanel}
                </div>
            </div>

            {/* Mobile Navigation Bar */}
            <div className="md:hidden h-16 border-t border-white/5 bg-[#1a1a1f] flex items-center justify-around px-2 flex-shrink-0 z-30">
                <button
                    onClick={() => setActiveMobileTab('timeline')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMobileTab === 'timeline' ? 'text-blue-400 bg-white/5' : 'text-white/50'}`}
                >
                    <Clock size={20} />
                    <span className="text-xs">Timeline</span>
                </button>
                <button
                    onClick={() => setActiveMobileTab('assets')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMobileTab === 'assets' ? 'text-blue-400 bg-white/5' : 'text-white/50'}`}
                >
                    <Layers size={20} />
                    <span className="text-xs">Assets</span>
                </button>
                <button
                    onClick={() => setActiveMobileTab('properties')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMobileTab === 'properties' ? 'text-blue-400 bg-white/5' : 'text-white/50'}`}
                >
                    <Settings size={20} />
                    <span className="text-xs">Edit</span>
                </button>
            </div>
        </div>
    );
};

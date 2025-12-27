import React, { useState, useEffect, useRef } from 'react';
import { Layout, Layers, Settings, Clock, GripHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { getSwipeDirection } from '../../utils/mobileUtils';
import { CapCutMobileToolbar } from '../mobile/CapCutMobileToolbar';
import { MobileTimelineControls } from '../mobile/MobileTimelineControls';
import '../../styles/mobile.css';

export const EditorLayout = ({
    leftPanel,
    centerPanel,
    rightPanel,
    bottomPanel,
    header,
    onToolSelect,
    activeTool,
    activeMobileTool, // Add this to know when panel is open
    mobileToolPanel,

    // Timeline controls props
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onSplit,
    onDelete,
    onDetachAudio,
    onVoiceover,
    onCamera,
    isRecording,
    isRecordingVideo,
    isPlaying,
    onPlayPause,
    onFullscreen,
    currentTime,
    duration,
    hasActiveClip,
    magneticMode,
    onToggleMagnetic,
    onGroup,
    onUngroup,
    onBeatDetect
}) => {
    const [timelineHeight, setTimelineHeight] = useState(300);
    const [isResizing, setIsResizing] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Refs for resizing logic to avoid stale closures in event listeners
    const resizingRef = useRef(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(300);

    // Detect mobile viewport
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Desktop Resizing Handlers
    const startResizing = (e) => {
        e.preventDefault();
        e.stopPropagation();
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

            const dy = startYRef.current - e.clientY;
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
            <div className="min-h-14 h-auto border-b border-white/5 flex-shrink-0 pt-safe-offset">
                {header}
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Panel (Assets) - Desktop Always Visible */}
                <div className="hidden md:flex md:w-[320px] border-r border-white/5 flex-col bg-[#1a1a1f]">
                    {leftPanel}
                </div>

                <div className="flex-1 flex flex-col min-w-0 h-full relative">
                    {/* Preview Area - Flex grow to fill available space */}
                    <div
                        className={`
                            ${isMobile ? 'flex-1' : 'flex-1'} 
                            relative bg-[#0f0f12] flex items-center justify-center p-2 md:p-4 min-h-0 overflow-hidden 
                            ${isMobile && !mobileToolPanel ? 'mb-[280px]' : ''}
                        `}
                    >
                        {centerPanel}
                    </div>

                    {/* Mobile Tool Panel (In-Flow for resizing) */}
                    {isMobile && mobileToolPanel && (
                        <div className="w-full bg-[#1a1a1f] rounded-t-xl overflow-hidden shadow-2xl z-40 relative">
                            {/* Remove absolute positioning from panel styles via wrapper or override */}
                            {mobileToolPanel}
                        </div>
                    )}

                    {/* Desktop: Resize Handle */}
                    <div
                        onMouseDown={startResizing}
                        className="hidden md:flex h-4 -mt-2 -mb-2 z-40 cursor-row-resize items-center justify-center group relative touch-none select-none"
                    >
                        <div className={`w-full h-2 flex items-center justify-center transition-colors bg-[#0f0f12] border-t border-white/5 ${isResizing ? 'bg-blue-900/20' : 'group-hover:bg-white/5'}`}>
                            <div className={`w-12 h-1 rounded-full transition-colors flex items-center justify-center ${isResizing ? 'bg-blue-500' : 'bg-white/10 group-hover:bg-white/30'}`}>
                                <GripHorizontal size={12} className={isResizing ? 'text-blue-200' : 'text-transparent group-hover:text-white/50'} />
                            </div>
                        </div>
                    </div>

                    {/* Desktop: Timeline Area */}
                    <div
                        style={{ height: `${timelineHeight}px` }}
                        className="hidden md:flex border-t border-white/5 bg-[#1a1a1f] flex-col overflow-hidden"
                    >
                        {bottomPanel}
                    </div>

                    {/* Mobile: Timeline (Fixed overlay - ONLY when no tool panel) */}
                    {isMobile && !mobileToolPanel && (
                        <div className="md:hidden fixed bottom-[72px] left-0 right-0 z-30">
                            <div className="h-[200px] border-t border-white/5 bg-[#1a1a1f] overflow-hidden">
                                {bottomPanel}
                            </div>
                        </div>
                    )}


                </div>

                {/* Right Panel (Properties) - Desktop Always Visible */}
                <div className="hidden lg:flex lg:w-[300px] border-l border-white/5 flex-col bg-[#1a1a1f]">
                    {rightPanel}
                </div>
            </div>

            {/* Mobile: CapCut-Style Toolbar (Always visible at bottom) */}
            {isMobile && (
                <CapCutMobileToolbar
                    onToolSelect={onToolSelect}
                    activeTool={activeTool}
                />
            )}
        </div>
    );
};

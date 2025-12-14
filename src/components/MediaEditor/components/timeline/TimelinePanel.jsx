import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Scissors, Trash2, ZoomIn, ZoomOut, Undo, Redo, Layers, Music, FileAudio, Unlink } from 'lucide-react';
import { Track } from './Track';

export const TimelinePanel = ({
    tracks = [],
    isPlaying,
    onPlayPause,
    currentTime,
    duration,
    onSeek,
    onSplit,
    onDelete,
    zoom,
    onZoomChange,
    selectedClipId, // Legacy
    selectedClipIds, // Multi-select Set
    onClipSelect,
    onTrim,
    onTrimEnd,
    onMove,
    undo,
    redo,
    canUndo,
    canRedo,
    onAddTransition,
    onTransitionSelect,
    onAddTrack,
    onDrop,
    onReorderTrack,
    onResizeTrack,
    onDetachAudio,
    onBeatDetect,

    // Advanced Features
    magneticMode,
    onToggleMagnetic,
    onGroup,
    onUngroup
}) => {
    const timelineRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedTrackIndex, setDraggedTrackIndex] = useState(null);

    const formatTime = (time) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    // Pixels per second based on zoom
    const scale = 50 * zoom;
    const sidebarWidth = 128; // w-32 = 128px

    // Calculate ruler steps based on scale
    const getRulerStep = (s) => {
        if (s >= 200) return 0.1; // 100ms marks when zoomed in
        if (s >= 40) return 1;    // 1s marks
        if (s >= 10) return 5;    // 5s marks
        return 10;                // 10s marks when zoomed out
    };

    const rulerStep = getRulerStep(scale);
    const rulerTicks = [];
    for (let i = 0; i <= duration; i += rulerStep) {
        rulerTicks.push(i);
    }

    const handleTimelineClick = (e) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const scrollLeft = timelineRef.current.scrollLeft;
        const x = (e.clientX - rect.left) + scrollLeft - sidebarWidth;
        const time = Math.max(0, Math.min(duration, x / scale));
        onSeek(time);
    };

    const handleMouseDown = (e) => {
        // Only seek if clicking on ruler or empty space, not on tracks
        if (e.target.closest('.track-container')) return;

        // Check if click is on scrollbar (Horizontal or Vertical)
        if (e.target === timelineRef.current) {
            const isScrollbarX = e.nativeEvent.offsetY > e.target.clientHeight;
            const isScrollbarY = e.nativeEvent.offsetX > e.target.clientWidth;
            if (isScrollbarX || isScrollbarY) return;
        }

        setIsDragging(true);
        handleTimelineClick(e);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !timelineRef.current) return;
            const rect = timelineRef.current.getBoundingClientRect();
            const scrollLeft = timelineRef.current.scrollLeft;
            const x = (e.clientX - rect.left) + scrollLeft - sidebarWidth;
            const time = Math.max(0, Math.min(duration, x / scale));
            onSeek(time);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, duration, scale, onSeek]);

    // Zoom with Ctrl + Scroll
    useEffect(() => {
        const container = timelineRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY;
                const zoomFactor = 0.1;
                const newZoom = delta > 0
                    ? Math.max(0.1, zoom - zoomFactor)
                    : Math.min(10, zoom + zoomFactor);

                onZoomChange(newZoom);
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [zoom, onZoomChange]);

    // Track Reordering Logic
    const handleTrackDragStart = (e, index) => {
        setDraggedTrackIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // e.dataTransfer.setDragImage(e.target, 0, 0); // Optional: Custom drag image
    };

    const handleTrackDragOver = (e, index) => {
        e.preventDefault();
        if (draggedTrackIndex === null || draggedTrackIndex === index) return;

        // Visual feedback could be added here
    };

    // Split tracks for display
    // Unified sorted tracks
    const sortedTracks = React.useMemo(() => {
        const priority = {
            'adjustment': 0,
            'video': 1,
            'audio': 2,
            'text': 3,
            'sticker': 4
        };

        return tracks
            .map((t, i) => ({ ...t, originalIndex: i }))
            .sort((a, b) => {
                const typeA = priority[a.type] !== undefined ? priority[a.type] : 99;
                const typeB = priority[b.type] !== undefined ? priority[b.type] : 99;
                if (typeA !== typeB) return typeA - typeB;
                return a.originalIndex - b.originalIndex; // Stable sort for same types
            });
    }, [tracks]);

    return (
        <div className="flex flex-col h-full">
            {/* Timeline Toolbar */}
            <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#1a1a1f]">
                {/* ... existing toolbar ... */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className={`p-1.5 rounded ${canUndo ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'text-white/20 cursor-not-allowed'}`}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className={`p-1.5 rounded ${canRedo ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'text-white/20 cursor-not-allowed'}`}
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo size={16} />
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-2" />

                    {/* Magnetic Mode Toggle */}
                    <button
                        onClick={onToggleMagnetic}
                        className={`p-1.5 rounded transition-colors ${magneticMode ? 'bg-blue-500 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
                        title="Magnetic Timeline (Close Gaps)"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 3v12" />
                            <path d="M18 3v12" />
                            <path d="M22 7v4" />
                            <path d="M2 7v4" />
                            <path d="M6 15a6 6 0 0 0 12 0" />
                        </svg>
                    </button>

                    {/* Group/Ungroup */}
                    <button
                        onClick={onGroup}
                        className="p-1.5 hover:bg-white/10 rounded text-white/70 hover:text-white"
                        title="Group Selected (Ctrl+G)"
                    >
                        <Layers size={16} />
                    </button>
                    <button
                        onClick={onUngroup}
                        className="p-1.5 hover:bg-white/10 rounded text-white/70 hover:text-white"
                        title="Ungroup Selected (Ctrl+Shift+G)"
                    >
                        <Unlink size={16} />
                    </button>

                    <div className="w-px h-4 bg-white/10 mx-2" />

                    <button onClick={onSplit} className="p-1.5 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Split (B)">
                        <Scissors size={16} />
                    </button>
                    <button onClick={onDelete} className="p-1.5 hover:bg-white/10 rounded text-white/70 hover:text-red-400" title="Delete (Del)">
                        <Trash2 size={16} />
                    </button>
                    {(() => {
                        const selectedTrack = tracks.find(t => t.clips.some(c => c.id === selectedClipId));
                        const selectedClip = selectedTrack?.clips.find(c => c.id === selectedClipId);
                        if (selectedClip &&
                            (selectedClip.type === 'video' || (selectedTrack?.type === 'video' && selectedClip.type !== 'audio')) &&
                            !selectedClip.audioDetached
                        ) {
                            return (
                                <button
                                    onClick={() => onDetachAudio && onDetachAudio(selectedClipId)}
                                    className="p-1.5 hover:bg-white/10 rounded text-white/70 hover:text-blue-400"
                                    title="Detach Audio"
                                >
                                    <FileAudio size={16} />
                                </button>
                            );
                        }

                        // Beat Detection Button (Audio)
                        if (selectedClip && selectedClip.type === 'audio') {
                            return (
                                <button
                                    onClick={async () => {
                                        if (onBeatDetect) {
                                            const beats = await onBeatDetect(selectedClip.source);
                                            // onBeatDetect prop should probably handle the state update too?
                                            // Or return beats and we call another prop?
                                            // Let's assume onBeatDetect DOES EVERYTHING (detect + update).
                                            // Wait, if onBeatDetect is passed from parent, parent does logic.
                                            // If I want to do it here:
                                            // onClick={() => { detectBeats(..).then(beats => onAddMarkers(id, beats)) }}
                                            // Simpler: Just call `onBeatDetect(selectedClip.id, selectedClip.source)`
                                            onBeatDetect(selectedClip.id, selectedClip.source);
                                        }
                                    }}
                                    className="px-2 py-1.5 hover:bg-white/10 rounded text-white/70 hover:text-yellow-400 flex items-center gap-1 text-xs font-medium"
                                    title="Auto-Detect Beats"
                                >
                                    <Music size={14} />
                                    <span>Beat Detect</span>
                                </button>
                            );
                        }

                        // Beat Detection Button (Audio)
                        if (selectedClip && selectedClip.type === 'audio') {
                            return (
                                <button
                                    onClick={async () => {
                                        // Dynamic import or passed prop for detection?
                                        // Design: Passed prop onBeatDetect
                                        // Parent will handle calling utils.
                                        // Actually easier to do it here if we import utils?
                                        // But TimelinePanel shouldn't know utils necessarily. 
                                        // Let's assume onBeatDetect prop.
                                        if (onBeatDetect) {
                                            onBeatDetect(selectedClip.id, selectedClip.source);
                                        }
                                    }}
                                    className="px-2 py-1.5 hover:bg-white/10 rounded text-white/70 hover:text-yellow-400 flex items-center gap-1 text-xs font-medium"
                                    title="Auto-Detect Beats"
                                >
                                    <Music size={14} />
                                    <span>Beat Detect</span>
                                </button>
                            );
                        }
                        return null;
                    })()}
                    <div className="w-px h-4 bg-white/10 mx-2" />
                    <button className="p-1.5 hover:bg-white/10 rounded text-white/70 hover:text-white">
                        <SkipBack size={16} />
                    </button>
                    <button onClick={onPlayPause} className="p-1.5 hover:bg-white/10 rounded text-white hover:text-blue-400">
                        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded text-white/70 hover:text-white">
                        <SkipForward size={16} />
                    </button>
                    <span className="text-xs font-mono text-blue-400 ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))} className="p-1.5 hover:bg-white/10 rounded text-white/70">
                        <ZoomOut size={16} />
                    </button>
                    <input
                        type="range"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                        className="w-24 accent-blue-500 h-1 bg-white/10 rounded-full appearance-none"
                    />
                    <button onClick={() => onZoomChange(Math.min(10, zoom + 0.1))} className="p-1.5 hover:bg-white/10 rounded text-white/70">
                        <ZoomIn size={16} />
                    </button>
                </div>
            </div>

            {/* Timeline Tracks Area */}
            <div
                className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#0f0f12] custom-scrollbar select-none"
                ref={timelineRef}
                onMouseDown={handleMouseDown}
            >
                {/* Ruler */}
                <div
                    className="h-6 border-b border-white/5 sticky top-0 bg-[#0f0f12] z-20 w-full min-w-full flex cursor-pointer"
                    style={{ width: `${duration * scale + 320}px` }}
                    onMouseDown={handleMouseDown}
                >
                    <div className="w-32 flex-shrink-0 border-r border-white/5 bg-[#1a1a1f] sticky left-0 z-40" />
                    <div className="flex-1 relative">
                        {rulerTicks.map((time) => (
                            <div
                                key={time}
                                className="absolute top-0 bottom-0 border-l border-white/10 text-[10px] text-white/30 pl-1 pointer-events-none"
                                style={{ left: `${time * scale}px` }}
                            >
                                {Number.isInteger(time) ? `${time}s` : ''}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tracks Container */}
                <div
                    className="min-w-full relative pb-10"
                    style={{ width: `${duration * scale + 320}px` }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        // Check if we dropped on a track (handled by Track component propagation stop?)
                        // If we are here, it means we dropped on the background (empty space).

                        // Calculate time
                        const rect = timelineRef.current.getBoundingClientRect();
                        const scrollLeft = timelineRef.current.scrollLeft;
                        const x = (e.clientX - rect.left) + scrollLeft - sidebarWidth;
                        const time = Math.max(0, Math.min(duration, x / scale));

                        // Get asset data
                        try {
                            const assetData = JSON.parse(e.dataTransfer.getData('application/json'));
                            if (assetData) {
                                onDrop(null, assetData, time);
                            }
                        } catch (err) {
                            console.error('Invalid drop data', err);
                        }
                    }}
                >
                    {/* Playhead Line */}
                    <div
                        className="absolute top-0 bottom-0 w-px bg-blue-500 z-30 pointer-events-none"
                        style={{ left: `${(currentTime * scale) + sidebarWidth}px` }}
                    >
                        <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-blue-500 transform rotate-45" />
                    </div>

                    {/* Unified Tracks Rendering */}
                    <div className="py-2">
                        {sortedTracks.map((track) => (
                            <div
                                key={track.id}
                                className="track-container"
                                draggable
                                onDragStart={(e) => handleTrackDragStart(e, track.originalIndex)}
                                onDragEnd={() => setDraggedTrackIndex(null)}
                                onDragOver={(e) => handleTrackDragOver(e, track.originalIndex)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    if (draggedTrackIndex !== null) {
                                        if (draggedTrackIndex !== track.originalIndex) {
                                            onReorderTrack(draggedTrackIndex, track.originalIndex);
                                        }
                                        setDraggedTrackIndex(null);
                                    } else {
                                        // External Drop
                                        try {
                                            const data = e.dataTransfer.getData('application/json');
                                            if (data) {
                                                const asset = JSON.parse(data);
                                                const rect = timelineRef.current.getBoundingClientRect();
                                                const scrollLeft = timelineRef.current.scrollLeft;
                                                const x = (e.clientX - rect.left) + scrollLeft - sidebarWidth;
                                                const time = Math.max(0, Math.min(duration, x / scale));

                                                // Allow appropriate drops
                                                let allowed = false;
                                                if (track.type === asset.type) allowed = true;
                                                if (track.type === 'video' && asset.type === 'image') allowed = true;

                                                if (allowed) {
                                                    onDrop(track.id, asset, time);
                                                }
                                            }
                                        } catch (err) {
                                            console.error('Drop error', err);
                                        }
                                    }
                                }}
                            >
                                <Track
                                    track={track}
                                    scale={scale}
                                    onClipSelect={onClipSelect}
                                    selectedClipId={selectedClipId}
                                    selectedClipIds={selectedClipIds}
                                    onTrim={onTrim}
                                    onTrimEnd={onTrimEnd}
                                    onMove={onMove}
                                    onAddTransition={onAddTransition}
                                    onTransitionSelect={onTransitionSelect}
                                    onDrop={onDrop}
                                    onResize={(height) => onResizeTrack(track.id, height)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Track Button */}
                <div className="px-4 pb-4 mt-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => onAddTrack('video')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white/70 hover:text-white transition-colors"
                        >
                            + Add Video Track
                        </button>
                        <button
                            onClick={() => onAddTrack('audio')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white/70 hover:text-white transition-colors"
                        >
                            + Add Audio Track
                        </button>
                        <button
                            onClick={() => onAddTrack('adjustment')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white/70 hover:text-white transition-colors"
                        >
                            + Add Adjustment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

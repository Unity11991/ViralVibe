import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Scissors, Trash2, ZoomIn, ZoomOut, Undo, Redo, Layers, Music, FileAudio } from 'lucide-react';
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
    selectedClipId,
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
    onDetachAudio
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
    // Visual Tracks: Render in order (Top of list = Index 0 = Bottom Z-Index/Background)
    const visualTracks = tracks
        .map((t, i) => ({ ...t, originalIndex: i }))
        .filter(t => t.type !== 'audio');
    // .reverse(); // Removed reverse to keep Video (Index 0) at top of list

    // Audio Tracks: Normal Order
    const audioTracks = tracks
        .map((t, i) => ({ ...t, originalIndex: i }))
        .filter(t => t.type === 'audio');

    return (
        <div className="flex flex-col h-full">
            {/* Timeline Toolbar */}
            <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#1a1a1f]">
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

                    {/* Render Visual Tracks */}
                    {visualTracks.length > 0 && (
                        <div className="py-2">
                            <div className="sticky left-0 z-10 px-4 py-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/30 font-semibold bg-[#0f0f12]/90 backdrop-blur-sm border-b border-white/5 mb-1">
                                <Layers size={12} />
                                <span>Visual Tracks</span>
                            </div>
                            {visualTracks.map((track) => (
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

                                                    if (track.type === asset.type || (track.type === 'video' && asset.type === 'image')) {
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
                    )}

                    {/* Render Audio Tracks */}
                    {audioTracks.length > 0 && (
                        <div className="py-2 border-t border-white/5 mt-2">
                            <div className="sticky left-0 z-10 px-4 py-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/30 font-semibold bg-[#0f0f12]/90 backdrop-blur-sm border-b border-white/5 mb-1">
                                <Music size={12} />
                                <span>Audio Tracks</span>
                            </div>
                            {audioTracks.map((track) => (
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

                                                    if (track.type === asset.type) {
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
                    )}
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
                    </div>
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import {
    Undo2,
    Redo2,
    Scissors,
    Layers,
    Mic,
    Camera,
    Wand2,
    Trash2,
    Link2Off,
    Play,
    Pause,
    Maximize,
    Search,
    ZoomIn,
    Magnet,
    Unlink,
    Music
} from 'lucide-react';

/**
 * Mobile Timeline Controls
 * Shows editing controls above the timeline in a single scrollable row
 */
export const MobileTimelineControls = ({
    // Undo/Redo
    onUndo,
    onRedo,
    canUndo,
    canRedo,

    // Editing
    onSplit,
    onDelete,
    onDetachAudio,

    // Advanced
    magneticMode,
    onToggleMagnetic,
    onGroup,
    onUngroup,
    onBeatDetect,

    // Recording
    onVoiceover,
    onCamera,
    isRecording,
    isRecordingVideo,

    // Playback
    isPlaying,
    onPlayPause,
    onFullscreen,

    // Timeline
    currentTime,
    duration,

    // Other
    hasActiveClip
}) => {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="mobile-timeline-controls flex items-center overflow-x-auto gap-3 px-4 py-2 bg-[#1a1a1f] border-b border-white/5 hide-scrollbar">
            {/* Undo / Redo */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`mobile-control-btn ${!canUndo ? 'opacity-30' : ''}`}
                    title="Undo"
                >
                    <Undo2 size={18} />
                </button>
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`mobile-control-btn ${!canRedo ? 'opacity-30' : ''}`}
                    title="Redo"
                >
                    <Redo2 size={18} />
                </button>
            </div>

            <div className="w-px h-4 bg-white/10 flex-shrink-0" />

            {/* Editing Tools */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <button
                    onClick={onSplit}
                    className="mobile-control-btn"
                    title="Split"
                >
                    <Scissors size={18} />
                </button>
                <button
                    onClick={onDelete}
                    disabled={!hasActiveClip}
                    className={`mobile-control-btn ${!hasActiveClip ? 'opacity-30' : ''}`}
                    title="Delete"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="w-px h-4 bg-white/10 flex-shrink-0" />

            {/* Advanced Tools (Magnetic, Grouping) */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <button
                    onClick={onToggleMagnetic}
                    className={`mobile-control-btn ${magneticMode ? 'bg-blue-500 text-white' : ''}`}
                    title="Magnetic Mode"
                >
                    <Magnet size={18} />
                </button>
                <button
                    onClick={onGroup}
                    className="mobile-control-btn"
                    title="Group"
                >
                    <Layers size={18} />
                </button>
                <button
                    onClick={onUngroup}
                    className="mobile-control-btn"
                    title="Ungroup"
                >
                    <Unlink size={18} />
                </button>
            </div>

            <div className="w-px h-4 bg-white/10 flex-shrink-0" />

            {/* Recording */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <button
                    onClick={onVoiceover}
                    className={`mobile-control-btn ${isRecording ? 'bg-red-500 text-white animate-pulse' : ''}`}
                    title="Voiceover"
                >
                    <Mic size={18} />
                </button>
                <button
                    onClick={onCamera}
                    className={`mobile-control-btn ${isRecordingVideo ? 'bg-red-500 text-white animate-pulse' : ''}`}
                    title="Camera"
                >
                    <Camera size={18} />
                </button>
            </div>

            <div className="w-px h-4 bg-white/10 flex-shrink-0" />

            {/* Audio Tools */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <button
                    onClick={onDetachAudio}
                    disabled={!hasActiveClip}
                    className={`mobile-control-btn ${!hasActiveClip ? 'opacity-30' : ''}`}
                    title="Detach Audio"
                >
                    <Link2Off size={18} />
                </button>
                {/* Beat Detect - Optional, maybe only show if audio selected? */}
                {/* 
                <button
                    onClick={() => onBeatDetect && onBeatDetect()}
                    className="mobile-control-btn"
                    title="Beat Detect"
                >
                    <Music size={18} />
                </button>
                */}
            </div>

            <div className="w-px h-4 bg-white/10 flex-shrink-0" />

            {/* Playback Controls */}
            <div className="flex items-center gap-3 flex-shrink-0 ml-auto bg-black/20 px-3 py-1 rounded-full">
                <button
                    onClick={onPlayPause}
                    className="w-8 h-8 flex items-center justify-center bg-blue-500 rounded-full text-white shadow-lg active:scale-95 transition-transform"
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>

                <div className="text-xs font-mono text-white/90 whitespace-nowrap min-w-[80px] text-center">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                <button
                    onClick={onFullscreen}
                    className="mobile-control-btn"
                    title="Fullscreen"
                >
                    <Maximize size={16} />
                </button>
            </div>
        </div>
    );
};

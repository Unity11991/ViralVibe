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
    ZoomIn
} from 'lucide-react';

/**
 * Mobile Timeline Controls
 * Shows editing controls above the timeline
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
        <div className="mobile-timeline-controls">
            {/* Left Controls */}
            <div className="mobile-timeline-controls-left">
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="mobile-control-btn"
                    title="Undo"
                >
                    <Undo2 size={18} />
                </button>
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="mobile-control-btn"
                    title="Redo"
                >
                    <Redo2 size={18} />
                </button>
                <button
                    onClick={onSplit}
                    className="mobile-control-btn"
                    title="Split"
                >
                    <Scissors size={18} />
                </button>
                <button
                    className="mobile-control-btn"
                    title="Layers"
                >
                    <Layers size={18} />
                </button>
                <button
                    onClick={onVoiceover}
                    className={`mobile-control-btn ${isRecording ? 'recording' : ''}`}
                    title="Voiceover"
                >
                    <Mic size={18} />
                </button>
                <button
                    onClick={onCamera}
                    className={`mobile-control-btn ${isRecordingVideo ? 'recording' : ''}`}
                    title="Camera"
                >
                    <Camera size={18} />
                </button>
                <button
                    className="mobile-control-btn"
                    title="Effects"
                >
                    <Wand2 size={18} />
                </button>
                <button
                    onClick={onDelete}
                    disabled={!hasActiveClip}
                    className="mobile-control-btn"
                    title="Delete"
                >
                    <Trash2 size={18} />
                </button>
                <button
                    onClick={onDetachAudio}
                    disabled={!hasActiveClip}
                    className="mobile-control-btn"
                    title="Detach Audio"
                >
                    <Link2Off size={18} />
                </button>
            </div>

            {/* Right Controls */}
            <div className="mobile-timeline-controls-right">
                <button
                    onClick={onPlayPause}
                    className="mobile-control-btn mobile-play-btn"
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <div className="mobile-timecode">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
                <button
                    onClick={onFullscreen}
                    className="mobile-control-btn"
                    title="Fullscreen"
                >
                    <Maximize size={18} />
                </button>
                <button
                    className="mobile-control-btn"
                    title="Zoom"
                >
                    <ZoomIn size={18} />
                </button>
            </div>
        </div>
    );
};

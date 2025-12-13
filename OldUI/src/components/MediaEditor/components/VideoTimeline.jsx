import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

/**
 * Video Timeline Component
 * Provides video playback controls and trimming
 */
export const VideoTimeline = ({
    videoRef,
    duration,
    currentTime,
    isPlaying,
    trimRange,
    onPlay,
    onPause,
    onSeek,
    onTrimChange
}) => {
    const [isDragging, setIsDragging] = useState(null);
    const trackRef = useRef(null);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePointerDown = (e, type) => {
        e.stopPropagation();
        setIsDragging(type);
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (!isDragging || !trackRef.current) return;

            const rect = trackRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const time = x * duration;

            if (isDragging === 'start') {
                onTrimChange({ start: Math.min(time, trimRange.end - 1), end: trimRange.end });
            } else if (isDragging === 'end') {
                onTrimChange({ start: trimRange.start, end: Math.max(time, trimRange.start + 1) });
            } else if (isDragging === 'playhead') {
                onSeek(time);
            }
        };

        const handlePointerUp = () => {
            setIsDragging(null);
        };

        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, duration, trimRange, onTrimChange, onSeek]);

    return (
        <div className="w-full p-4 bg-[#1a1a1f] border-t border-white/5">
            <div className="flex items-center gap-4">
                {/* Play/Pause Button */}
                <button
                    onClick={isPlaying ? onPause : onPlay}
                    className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
                >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                </button>

                {/* Time Display */}
                <span className="text-xs font-mono text-white/70 min-w-[80px]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* Timeline Track */}
                <div
                    ref={trackRef}
                    className="flex-1 h-12 bg-black/40 rounded-lg flex items-center px-2 relative select-none touch-none"
                >
                    {/* Background Track */}
                    <div className="absolute left-2 right-2 h-1 bg-white/20 rounded-full" />

                    {/* Active Range */}
                    <div
                        className="absolute h-1 bg-blue-500 rounded-full"
                        style={{
                            left: `${(trimRange.start / duration) * 100}%`,
                            right: `${100 - (trimRange.end / duration) * 100}%`
                        }}
                    />

                    {/* Playhead */}
                    <div
                        className="absolute w-0.5 h-8 bg-white rounded-full shadow-lg"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                        onPointerDown={(e) => handlePointerDown(e, 'playhead')}
                    />

                    {/* Start Trim Handle */}
                    <div
                        onPointerDown={(e) => handlePointerDown(e, 'start')}
                        className="absolute w-6 h-8 bg-white rounded-md shadow-lg cursor-ew-resize z-20 flex items-center justify-center hover:scale-110 transition-transform"
                        style={{ left: `calc(${(trimRange.start / duration) * 100}% - 12px)` }}
                    >
                        <div className="w-1 h-4 bg-black/20 rounded-full" />
                    </div>

                    {/* End Trim Handle */}
                    <div
                        onPointerDown={(e) => handlePointerDown(e, 'end')}
                        className="absolute w-6 h-8 bg-white rounded-md shadow-lg cursor-ew-resize z-20 flex items-center justify-center hover:scale-110 transition-transform"
                        style={{ left: `calc(${(trimRange.end / duration) * 100}% - 12px)` }}
                    >
                        <div className="w-1 h-4 bg-black/20 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import { VideoThumbnails } from './VideoThumbnails';
import { AudioWaveform } from './AudioWaveform';
import { Link } from 'lucide-react';

export const Clip = React.memo(({
    clip,
    scale,
    onSelect,
    isSelected,
    onTrim,
    onTrimEnd,
    onMove
}) => {
    const width = clip.duration * scale;
    const left = clip.startTime * scale;
    const [isTrimming, setIsTrimming] = useState(null); // 'start', 'end', or 'move'
    const startXRef = useRef(0);
    const initialValuesRef = useRef(null);
    const clipRef = useRef(null);

    const handleDragStart = (e, type) => {
        e.stopPropagation();
        setIsTrimming(type);
        startXRef.current = e.clientX;
        initialValuesRef.current = {
            startTime: clip.startTime,
            duration: clip.duration,
            startOffset: clip.startOffset || 0
        };
    };

    const handleDragMove = (e) => {
        if (!initialValuesRef.current) return;

        const deltaX = e.clientX - startXRef.current;
        const deltaTime = deltaX / scale;

        const { startTime, duration, startOffset } = initialValuesRef.current;

        if (isTrimming === 'start') {
            // Trimming start: increases startTime, decreases duration, increases startOffset
            let newStartTime = startTime + deltaTime;
            let newDuration = duration - deltaTime;
            let newStartOffset = startOffset + deltaTime;

            // Constraints
            if (newDuration < 0.5) { // Min duration 0.5s
                newStartTime = startTime + duration - 0.5;
                newDuration = 0.5;
                newStartOffset = startOffset + duration - 0.5;
            }

            if (newStartOffset < 0) {
                newStartOffset = 0;
                const diff = 0 - startOffset; // negative
                newStartTime = startTime + diff;
                newDuration = duration - diff;
            }

            onTrim(clip.id, newStartTime, newDuration, newStartOffset);

        } else if (isTrimming === 'end') {
            // Trimming end: duration changes
            let newDuration = duration + deltaTime;

            if (newDuration < 0.5) newDuration = 0.5;

            onTrim(clip.id, startTime, newDuration, startOffset);

        } else if (isTrimming === 'move') {
            // Moving clip
            const newStartTime = Math.max(0, startTime + deltaTime);
            if (onMove) onMove(clip.id, newStartTime);
        }
    };

    const handleDragEnd = () => {
        setIsTrimming(null);
        initialValuesRef.current = null;
        if (onTrimEnd) onTrimEnd();
    };

    // Clean up listeners on unmount (safety)
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, []);

    // Re-attach listeners if isTrimming state persists
    useEffect(() => {
        if (isTrimming) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isTrimming]);

    return (
        <div
            ref={clipRef}
            className={`timeline-clip absolute top-1 bottom-1 rounded-md cursor-pointer border-2 transition-all ${isSelected ? 'border-yellow-400 z-10' : 'border-transparent hover:border-white/30'
                } ${clip.type === 'video' ? 'bg-blue-500/20' :
                    clip.type === 'audio' ? 'bg-green-500/20' :
                        clip.type === 'text' ? 'bg-purple-500/20' :
                            'bg-orange-500/20'
                }`}
            style={{
                left: `${left}px`,
                width: `${width}px`
            }}
            onMouseDown={(e) => {
                // Select on mouse down to ensure immediate feedback
                // Pass event for multi-select detection
                if (!isSelected || e.shiftKey || e.ctrlKey || e.metaKey) {
                    onSelect(clip.id, e);
                }
                // Start moving
                handleDragStart(e, 'move');
            }}
        >
            {/* Clip Content Preview */}
            <div className="w-full h-full flex items-center px-2 overflow-hidden select-none rounded-sm relative">
                {clip.type === 'video' && clip.source && (
                    <VideoThumbnails
                        source={clip.source}
                        duration={clip.duration}
                        width={width}
                        visibleWidth={width}
                        height={clipRef.current?.offsetHeight || 40}
                        startOffset={clip.startOffset || 0}
                    />
                )}

                {/* Audio Waveform for Audio Clips */}
                {clip.type === 'audio' && clip.source && (
                    <div className="absolute inset-0 pointer-events-none opacity-80">
                        <AudioWaveform
                            source={clip.source}
                            width={width}
                            height={clipRef.current?.offsetHeight || 48}
                            startOffset={clip.startOffset || 0}
                            duration={clip.duration}
                            sourceDuration={clip.sourceDuration || 100}
                            color="#4fd1c5"
                        />
                    </div>
                )}

                {/* Audio Waveform for Video Clips (Overlay) */}
                {clip.type === 'video' && clip.source && !clip.audioDetached && (
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none opacity-60">
                        <AudioWaveform
                            source={clip.source}
                            width={width}
                            height={(clipRef.current?.offsetHeight || 40) / 3}
                            startOffset={clip.startOffset || 0}
                            duration={clip.duration}
                            sourceDuration={clip.sourceDuration || 100}
                            color="rgba(255, 255, 255, 0.5)"
                        />
                    </div>
                )}

                {/* Beat Markers */}
                {clip.markers && clip.markers.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                        {clip.markers.map((time, i) => {
                            const startOffset = clip.startOffset || 0;
                            const relativeTime = time - startOffset;

                            // Only render if within visible range of the clip
                            if (relativeTime >= 0 && relativeTime <= clip.duration) {
                                // Calculate position in pixels
                                // My width calculation is: width = clip.duration * scale
                                // So relative position is relativeTime * scale

                                return (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 w-[2px] bg-amber-400/70"
                                        style={{ left: `${relativeTime * scale}px` }}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-amber-400 -ml-[3px] shadow-sm" />
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}

                <span className="text-xs font-medium text-white/90 truncate relative z-10 ml-1 shadow-black drop-shadow-md flex items-center gap-1">
                    {clip.groupId && <Link size={12} className="text-blue-300" />}
                    {clip.name || 'Clip'}
                </span>
            </div>

            {/* Drag Handles (Only visible when selected) */}
            {isSelected && (
                <>
                    <div
                        className="absolute -left-1 top-0 bottom-0 w-4 bg-yellow-400 cursor-ew-resize hover:bg-yellow-300 z-20 flex items-center justify-center opacity-50 hover:opacity-100 rounded-l-sm"
                        onMouseDown={(e) => handleDragStart(e, 'start')}
                    >
                        <div className="w-0.5 h-4 bg-black/20" />
                    </div>
                    <div
                        className="absolute -right-1 top-0 bottom-0 w-4 bg-yellow-400 cursor-ew-resize hover:bg-yellow-300 z-20 flex items-center justify-center opacity-50 hover:opacity-100 rounded-r-sm"
                        onMouseDown={(e) => handleDragStart(e, 'end')}
                    >
                        <div className="w-0.5 h-4 bg-black/20" />
                    </div>
                </>
            )}
        </div>
    );
}, (prev, next) => {
    // Custom comparison
    return (
        prev.clip === next.clip &&
        prev.scale === next.scale &&
        prev.isSelected === next.isSelected
    );
});

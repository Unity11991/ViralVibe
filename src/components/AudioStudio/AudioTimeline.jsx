import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Plus, Trash2, MoreVertical } from 'lucide-react';
import WaveformClip from './WaveformClip';

const TRACK_HEIGHT = 90;
const HEADER_WIDTH = 220;
const PIXELS_PER_SECOND = 40;
const RULER_HEIGHT = 32;

const AudioTimeline = ({
    tracks,
    setTracks,
    currentTime,
    duration,
    onSeek,
    isPlaying,
    onToggleArm,
    punchRange,
    loopRange,
    onToggleTakes
}) => {
    const timelineRef = useRef(null);
    const [draggedClip, setDraggedClip] = useState(null);
    const [selectedClipId, setSelectedClipId] = useState(null);
    const [scrollLeft, setScrollLeft] = useState(0);

    const [isScrubbing, setIsScrubbing] = useState(false);

    // Handle timeline click for seeking
    const handleTimelineMouseDown = (e) => {
        if (draggedClip) return;
        setIsScrubbing(true);
        const rect = timelineRef.current.getBoundingClientRect();
        const currentScrollLeft = timelineRef.current.scrollLeft;
        const x = e.clientX - rect.left + currentScrollLeft;
        const time = Math.max(0, x / PIXELS_PER_SECOND);
        onSeek(time);

        // Add global listeners for smooth scrubbing
        window.addEventListener('mousemove', handleScrubMouseMove);
        window.addEventListener('mouseup', handleScrubMouseUp);
    };

    const handleScrubMouseMove = (e) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const currentScrollLeft = timelineRef.current.scrollLeft;
        const x = e.clientX - rect.left + currentScrollLeft;
        const time = Math.max(0, x / PIXELS_PER_SECOND);
        onSeek(time);
    };

    const handleScrubMouseUp = () => {
        setIsScrubbing(false);
        window.removeEventListener('mousemove', handleScrubMouseMove);
        window.removeEventListener('mouseup', handleScrubMouseUp);
    };

    // Handle Scroll
    const [scrollTop, setScrollTop] = useState(0);

    const handleScroll = (e) => {
        setScrollLeft(e.target.scrollLeft);
        setScrollTop(e.target.scrollTop);
    };

    // Add a new track
    const addTrack = () => {
        setTracks([...tracks, { id: crypto.randomUUID(), name: `Track ${tracks.length + 1}`, clips: [], volume: 1, muted: false }]);
    };

    // Remove a track
    const removeTrack = (trackId) => {
        setTracks(tracks.filter(t => t.id !== trackId));
    };

    // Toggle Mute
    const toggleMute = (trackId) => {
        setTracks(tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
    };

    // Handle Clip Drag
    const handleClipMouseDown = (e, trackId, clipId) => {
        e.stopPropagation();
        setDraggedClip({ trackId, clipId, startX: e.clientX });
        setSelectedClipId(clipId);
    };

    // Delete Selected Clip
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
                setTracks(prev => prev.map(track => ({
                    ...track,
                    clips: track.clips.filter(c => c.id !== selectedClipId)
                })));
                setSelectedClipId(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClipId, setTracks]);

    const handleMouseMove = (e) => {
        if (!draggedClip) return;

        const deltaX = e.clientX - draggedClip.startX;
        const deltaTime = deltaX / PIXELS_PER_SECOND;

        setTracks(prevTracks => prevTracks.map(track => {
            if (track.id === draggedClip.trackId) {
                return {
                    ...track,
                    clips: track.clips.map(clip => {
                        if (clip.id === draggedClip.clipId) {
                            return { ...clip, startTime: Math.max(0, clip.startTime + deltaTime) };
                        }
                        return clip;
                    })
                };
            }
            return track;
        }));

        setDraggedClip({ ...draggedClip, startX: e.clientX });
    };

    const handleMouseUp = () => {
        setDraggedClip(null);
    };

    useEffect(() => {
        if (draggedClip) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggedClip]);

    // Cleanup scrubbing listeners on unmount
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleScrubMouseMove);
            window.removeEventListener('mouseup', handleScrubMouseUp);
        };
    }, [scrollLeft]); // Re-bind if scroll changes to keep closure fresh, or use ref for scrollLeft

    // Generate Ruler Markers
    const rulerMarkers = [];
    const totalSeconds = Math.max(duration, 60);
    for (let i = 0; i <= totalSeconds; i++) {
        rulerMarkers.push(
            <div key={i} className="absolute top-0 bottom-0 border-l border-white/10 text-[10px] text-white/30 pl-1 select-none"
                style={{ left: i * PIXELS_PER_SECOND }}>
                {i % 5 === 0 && <span>{i}s</span>}
                <div className="absolute bottom-0 left-0 h-1.5 w-px bg-white/20"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#121214] rounded-xl overflow-hidden border border-white/5 shadow-2xl">
            {/* Toolbar */}
            <div className="h-12 bg-[#18181b] border-b border-white/5 flex items-center px-6 justify-between shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-white/80 tracking-wide">Timeline</span>
                    <div className="h-4 w-px bg-white/10"></div>
                    <span className="text-xs text-white/40 font-mono">{tracks.length} Tracks</span>
                </div>
                <button
                    onClick={addTrack}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium transition-colors border border-blue-600/20"
                >
                    <Plus size={14} /> Add Track
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Track Headers (Left Sticky) */}
                <div className="w-[220px] bg-[#18181b] border-r border-white/5 flex flex-col shrink-0 z-20 shadow-xl">
                    {/* Empty corner for ruler */}
                    <div className="h-8 bg-[#18181b] border-b border-white/5 shrink-0"></div>

                    {/* Headers List */}
                    <div className="flex-1 overflow-hidden relative">
                        <div className="flex flex-col absolute top-0 left-0 right-0" style={{ transform: `translateY(${-scrollTop}px)` }}> {/* Sync scroll */}
                            {tracks.map((track) => (
                                <div
                                    key={track.id}
                                    className="border-b border-white/5 flex flex-col justify-center p-4 gap-3 bg-[#18181b] hover:bg-[#1f1f22] transition-colors group relative"
                                    style={{ height: TRACK_HEIGHT }}
                                >
                                    <div className="flex items-center justify-between">
                                        <input
                                            type="text"
                                            value={track.name}
                                            onChange={(e) => {
                                                const newName = e.target.value;
                                                setTracks(tracks.map(t => t.id === track.id ? { ...t, name: newName } : t));
                                            }}
                                            className="text-sm font-bold text-white/90 bg-transparent border-none outline-none focus:text-white focus:bg-white/5 rounded px-1 -ml-1 w-full truncate transition-colors"
                                        />
                                        <button onClick={() => removeTrack(track.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-white/30 hover:text-red-400 rounded transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => toggleMute(track.id)}
                                            className={`p-2 rounded-lg transition-colors ${track.muted ? "bg-red-500/10 text-red-400" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"}`}
                                        >
                                            {track.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                        </button>
                                        <button
                                            onClick={() => onToggleArm(track.id)}
                                            className={`p-2 rounded-lg transition-colors ${track.isArmed ? "bg-red-500 text-white animate-pulse" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"}`}
                                            title="Arm for Recording"
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 border-current ${track.isArmed ? "bg-white" : ""}`} />
                                        </button>
                                        {track.takes && track.takes.length > 0 && (
                                            <button
                                                onClick={() => onToggleTakes(track.id)}
                                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                                title="View Takes"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                        )}
                                        <div className="flex-1 flex flex-col gap-1">
                                            <input
                                                type="range" min="0" max="1" step="0.1"
                                                value={track.volume}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    setTracks(tracks.map(t => t.id === track.id ? { ...t, volume: val } : t));
                                                }}
                                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80 hover:[&::-webkit-slider-thumb]:bg-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Track Color Indicator */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500/50 to-purple-500/50 opacity-50"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Timeline Content (Scrollable) */}
                <div
                    className="flex-1 overflow-auto custom-scrollbar bg-[#121214] relative"
                    ref={timelineRef}
                    onScroll={handleScroll}
                >
                    <div
                        className="relative min-w-full"
                        style={{ width: `${Math.max(duration, 60) * PIXELS_PER_SECOND}px` }}
                    >
                        {/* Ruler */}
                        <div
                            className="h-8 bg-[#18181b] border-b border-white/5 sticky top-0 z-10 flex items-end cursor-pointer hover:bg-white/5 transition-colors"
                            onMouseDown={handleTimelineMouseDown}
                        >
                            {rulerMarkers}
                            {/* Loop Region Overlay */}
                            {loopRange?.active && (
                                <div
                                    className="absolute top-0 bottom-0 bg-yellow-500/10 border-x-2 border-yellow-500/50 pointer-events-none z-0"
                                    style={{
                                        left: loopRange.start * PIXELS_PER_SECOND,
                                        width: (loopRange.end - loopRange.start) * PIXELS_PER_SECOND
                                    }}
                                >
                                    <div className="absolute top-0 left-0 bg-yellow-500/50 text-[10px] text-black px-1 font-bold">LOOP</div>
                                </div>
                            )}
                            {/* Punch Region Overlay */}
                            {punchRange?.active && (
                                <div
                                    className="absolute top-0 bottom-0 bg-red-500/10 border-x-2 border-red-500/50 pointer-events-none z-0"
                                    style={{
                                        left: punchRange.in * PIXELS_PER_SECOND,
                                        width: (punchRange.out - punchRange.in) * PIXELS_PER_SECOND
                                    }}
                                >
                                    <div className="absolute top-0 right-0 bg-red-500/50 text-[10px] text-white px-1 font-bold">PUNCH</div>
                                </div>
                            )}
                        </div>

                        {/* Tracks Area */}
                        <div className="relative" style={{ height: tracks.length * TRACK_HEIGHT }} onMouseDown={handleTimelineMouseDown}>

                            {/* Grid Lines */}
                            <div className="absolute inset-0 pointer-events-none">
                                {Array.from({ length: Math.ceil(Math.max(duration, 60)) }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 border-l border-white/[0.02]"
                                        style={{ left: i * PIXELS_PER_SECOND }}
                                    />
                                ))}
                            </div>

                            {/* Tracks */}
                            {tracks.map((track, index) => (
                                <div
                                    key={track.id}
                                    className="absolute w-full border-b border-white/5"
                                    style={{ top: index * TRACK_HEIGHT, height: TRACK_HEIGHT }}
                                >
                                    {/* Clips */}
                                    <div className="relative w-full h-full">
                                        {track.clips.map(clip => (
                                            <div
                                                key={clip.id}
                                                className="absolute top-3 bottom-3 group"
                                                style={{
                                                    left: clip.startTime * PIXELS_PER_SECOND,
                                                    width: clip.duration * PIXELS_PER_SECOND
                                                }}
                                                onMouseDown={(e) => handleClipMouseDown(e, track.id, clip.id)}
                                            >
                                                <WaveformClip
                                                    buffer={clip.buffer}
                                                    width={clip.duration * PIXELS_PER_SECOND}
                                                    height={TRACK_HEIGHT - 24}
                                                    isSelected={selectedClipId === clip.id}
                                                    // Fade Props
                                                    fadeSeconds={clip.fade || { in: 0, out: 0 }}
                                                    onFadeChange={(newFade) => {
                                                        setTracks(prevTracks => prevTracks.map(t => {
                                                            if (t.id === track.id) {
                                                                return {
                                                                    ...t,
                                                                    clips: t.clips.map(c =>
                                                                        c.id === clip.id ? { ...c, fade: newFade } : c
                                                                    )
                                                                };
                                                            }
                                                            return t;
                                                        }));
                                                    }}
                                                />
                                                <div className="absolute top-0 left-0 right-0 p-1.5 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    <span className="text-[10px] font-medium text-white/90 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm truncate max-w-[80%]">
                                                        {clip.name}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Playhead */}
                            <div
                                className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                style={{ left: currentTime * PIXELS_PER_SECOND }}
                            >
                                <div className="absolute -top-1.5 -left-2 w-4 h-4 bg-red-500 transform rotate-45 rounded-sm shadow-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudioTimeline;

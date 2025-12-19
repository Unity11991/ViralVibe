import React, { useRef, useState, useEffect } from 'react';
import { X, Play, Square, Plus, Trash2 } from 'lucide-react';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = 6; // C1 to C7
const KEY_HEIGHT = 20;
const BEAT_WIDTH = 40; // Pixels per beat (quarter note)

const PianoRoll = ({ clip, onClose, onUpdateClip, instrument }) => {
    const [notes, setNotes] = useState(clip.notes || []);
    const [zoom, setZoom] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const scrollRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [selectedNoteId, setSelectedNoteId] = useState(null);

    // Generate Keys (Top to Bottom: High to Low)
    const keys = [];
    for (let o = OCTAVES; o >= 1; o--) {
        for (let n = 11; n >= 0; n--) {
            keys.push({ note: NOTES[n], octave: o, midi: o * 12 + n });
        }
    }

    const handleGridClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const noteIndex = Math.floor(y / KEY_HEIGHT);
        if (noteIndex < 0 || noteIndex >= keys.length) return;

        const midi = keys[noteIndex].midi;

        const beat = Math.floor(x / BEAT_WIDTH);

        const newNote = {
            id: crypto.randomUUID(),
            pitch: midi,
            startTime: beat * 0.25, // 16th notes
            duration: 0.25,
            velocity: 0.8
        };

        const updatedNotes = [...notes, newNote];
        setNotes(updatedNotes);
        onUpdateClip({ ...clip, notes: updatedNotes });

        // Preview Note
        if (instrument) {
            instrument.playNote(midi, instrument.ctx.currentTime, 0.25);
        }
    };

    const handleDeleteNote = () => {
        if (selectedNoteId) {
            const updated = notes.filter(n => n.id !== selectedNoteId);
            setNotes(updated);
            onUpdateClip({ ...clip, notes: updated });
            setSelectedNoteId(null);
        }
    };

    const handlePlay = () => {
        if (!instrument || notes.length === 0) return;
        setIsPlaying(true);

        const now = instrument.ctx.currentTime;
        notes.forEach(note => {
            instrument.playNote(note.pitch, now + note.startTime, note.duration, note.velocity);
        });

        // Auto stop UI state
        const duration = Math.max(...notes.map(n => n.startTime + n.duration)) || 4;
        setTimeout(() => setIsPlaying(false), duration * 1000);
    };

    const handleStop = () => {
        setIsPlaying(false);
        // Note: VirtualInstrument doesn't support stopAll yet, so audio might continue for release tail
    };

    return (
        <div className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col">
            {/* Header */}
            <div className="h-14 bg-[#18181b] border-b border-white/10 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white">Piano Roll - {clip.name}</h2>
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
                        <button
                            onClick={handlePlay}
                            className={`p-2 rounded transition-colors ${isPlaying ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10 text-white/70'}`}
                        >
                            <Play size={16} fill={isPlaying ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={handleStop}
                            className="p-2 hover:bg-white/10 rounded text-white/70"
                        >
                            <Square size={16} fill="currentColor" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleDeleteNote}
                        disabled={!selectedNoteId}
                        className="p-2 hover:bg-red-500/20 text-white/50 hover:text-red-500 rounded transition-colors disabled:opacity-30"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Piano Keys (Left) */}
                <div className="w-24 bg-[#121214] border-r border-white/10 overflow-hidden relative shrink-0">
                    <div className="absolute top-0 left-0 right-0" style={{ transform: `translateY(-${scrollTop}px)` }}>
                        {keys.map(k => (
                            <div
                                key={k.midi}
                                className={`h-[20px] border-b border-white/5 flex items-center justify-end px-2 text-[10px] ${k.note.includes('#') ? 'bg-black text-white/30' : 'bg-white text-black'}`}
                            >
                                {k.note}{k.octave}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Grid (Right) */}
                <div
                    className="flex-1 bg-[#0f0f12] overflow-auto relative custom-scrollbar"
                    ref={scrollRef}
                    onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                >
                    <div
                        className="relative min-w-[2000px]"
                        style={{ height: keys.length * KEY_HEIGHT }}
                        onClick={handleGridClick}
                    >
                        {/* Grid Lines */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Horizontal Lines */}
                            {keys.map((_, i) => (
                                <div key={i} className="absolute w-full border-b border-white/[0.05]" style={{ top: i * KEY_HEIGHT }}></div>
                            ))}
                            {/* Vertical Lines (Beats) */}
                            {Array.from({ length: 100 }).map((_, i) => (
                                <div key={i} className="absolute h-full border-l border-white/[0.05]" style={{ left: i * BEAT_WIDTH }}></div>
                            ))}
                        </div>

                        {/* Notes */}
                        {notes.map(note => {
                            const keyIndex = keys.findIndex(k => k.midi === note.pitch);
                            const top = keyIndex * KEY_HEIGHT;
                            const left = (note.startTime / 0.25) * BEAT_WIDTH;
                            const width = (note.duration / 0.25) * BEAT_WIDTH;

                            return (
                                <div
                                    key={note.id}
                                    className={`absolute h-[18px] rounded-sm border border-black/20 cursor-pointer ${selectedNoteId === note.id ? 'bg-yellow-500 ring-1 ring-white' : 'bg-green-500'}`}
                                    style={{ top: top + 1, left, width: Math.max(10, width - 1) }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedNoteId(note.id);
                                        // Preview
                                        if (instrument) instrument.playNote(note.pitch, instrument.ctx.currentTime, 0.1);
                                    }}
                                ></div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PianoRoll;

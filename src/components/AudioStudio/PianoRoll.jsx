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
        const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
        const y = e.clientY - rect.top + scrollRef.current.scrollTop;

        const noteIndex = Math.floor(y / KEY_HEIGHT);
        const midi = keys[noteIndex].midi;

        const beat = Math.floor(x / BEAT_WIDTH);
        const startTime = beat * 0.5; // Assuming 120 BPM, 1 beat = 0.5s? No, let's stick to seconds or beats.
        // Let's use SECONDS for simplicity in engine, but GRID is usually beats.
        // For MVP, let's say 1 grid unit = 0.25s (16th note at 60BPM) or just 0.25s.

        const newNote = {
            id: crypto.randomUUID(),
            pitch: midi,
            startTime: beat * 0.25,
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

    return (
        <div className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col">
            {/* Header */}
            <div className="h-14 bg-[#18181b] border-b border-white/10 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white">Piano Roll - {clip.name}</h2>
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
                        <button className="p-2 hover:bg-white/10 rounded text-white/70"><Play size={16} /></button>
                        <button className="p-2 hover:bg-white/10 rounded text-white/70"><Square size={16} /></button>
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
                    <div className="absolute top-0 left-0 right-0" style={{ transform: `translateY(-${scrollRef.current?.scrollTop || 0}px)` }}>
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
                    onScroll={(e) => {
                        // Sync keys scroll?
                        // We need to force update or use a ref for keys container
                        // Simpler: just let React re-render or use onScroll to set state if perf allows
                        // For MVP, let's rely on native scroll sync via state or ref
                    }}
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
                            // Find Y position based on pitch
                            // keys is ordered High to Low.
                            // Index in keys array = (MaxMidi - note.pitch) ? No, keys array is explicit.
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

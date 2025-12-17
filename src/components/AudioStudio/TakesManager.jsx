import React from 'react';
import { Play, Check, Trash2 } from 'lucide-react';

const TakesManager = ({ tracks, selectedTrackId, onSelectTake, onDeleteTake, onPlayTake }) => {
    const track = tracks.find(t => t.id === selectedTrackId);
    if (!track || !track.takes || track.takes.length === 0) return null;

    return (
        <div className="absolute bottom-24 right-6 w-64 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col z-50">
            <div className="p-3 border-b border-white/5 bg-[#1f1f22] flex justify-between items-center">
                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">Takes: {track.name}</span>
                <span className="text-[10px] text-white/40">{track.takes.length} takes</span>
            </div>

            <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {track.takes.map((take, index) => (
                    <div key={take.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 group">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/80 font-medium truncate">Take {index + 1}</p>
                            <p className="text-[10px] text-white/40">{new Date(take.timestamp).toLocaleTimeString()}</p>
                        </div>

                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onPlayTake(take)}
                                className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"
                                title="Preview"
                            >
                                <Play size={10} fill="currentColor" />
                            </button>
                            <button
                                onClick={() => onSelectTake(track.id, take)}
                                className="p-1.5 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                                title="Use Take"
                            >
                                <Check size={10} />
                            </button>
                            <button
                                onClick={() => onDeleteTake(track.id, take.id)}
                                className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TakesManager;

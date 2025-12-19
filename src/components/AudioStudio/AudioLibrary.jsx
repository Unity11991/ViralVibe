import React, { useRef } from 'react';
import { Upload, Music, GripVertical, Trash2 } from 'lucide-react';

const AudioLibrary = ({ files, onUpload, onDelete }) => {
    const fileInputRef = useRef(null);

    const handleDragStart = (e, file, index) => {
        e.dataTransfer.setData('application/viralvibe-audio', JSON.stringify({
            type: 'library-audio',
            index: index,
            name: file.name
        }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                    <Music size={14} className="text-purple-400" /> Audio Library
                </h3>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                    title="Upload Audio"
                >
                    <Upload size={14} />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={onUpload}
                />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-[100px]">
                {files.length === 0 ? (
                    <div className="text-white/30 text-xs italic text-center py-8 border border-dashed border-white/10 rounded-lg">
                        Upload audio files<br />to drag & drop
                    </div>
                ) : (
                    files.map((file, index) => (
                        <div
                            key={index}
                            draggable
                            onDragStart={(e) => handleDragStart(e, file, index)}
                            className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 p-2 rounded-lg cursor-grab active:cursor-grabbing border border-transparent hover:border-white/10 transition-all"
                        >
                            <GripVertical size={14} className="text-white/30" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-white truncate font-medium">{file.name}</div>
                                <div className="text-[10px] text-white/50 flex justify-between">
                                    <span>{formatDuration(file.duration)}</span>
                                    <span className="uppercase">{file.format || 'AUDIO'}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => onDelete(index)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded transition-all"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default AudioLibrary;

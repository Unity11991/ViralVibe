import React, { useRef } from 'react';
import { Music, Volume2, X, Upload, Trash2 } from 'lucide-react';
import { Button } from './UI';

export const AudioPanel = ({
    audioTracks,
    onAddAudio,
    onRemoveAudio,
    onUpdateAudio,
    videoVolume,
    onUpdateVideoVolume
}) => {
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                await onAddAudio(file);
            } catch (error) {
                alert('Failed to add audio track');
            }
        }
    };

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Main Video Volume */}
            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span className="flex items-center gap-2">
                        <Volume2 size={16} /> Original Audio
                    </span>
                    <span>{Math.round(videoVolume * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={videoVolume}
                    onChange={(e) => onUpdateVideoVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                />
            </div>

            <div className="h-px bg-white/10" />

            {/* Add Audio Button */}
            <div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="audio/*"
                    className="hidden"
                />
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    className="w-full"
                    icon={Upload}
                >
                    Add Audio Track
                </Button>
            </div>

            {/* Audio Tracks List */}
            <div className="space-y-4">
                {audioTracks.map((track) => (
                    <div key={track.id} className="bg-white/5 rounded-xl p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                    <Music size={16} className="text-blue-400" />
                                </div>
                                <span className="text-sm font-medium text-white truncate">
                                    {track.name}
                                </span>
                            </div>
                            <button
                                onClick={() => onRemoveAudio(track.id)}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-red-400 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Track Volume */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-white/50">
                                <span>Volume</span>
                                <span>{Math.round(track.volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={track.volume}
                                onChange={(e) => onUpdateAudio(track.id, { volume: parseFloat(e.target.value) })}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                            />
                        </div>
                    </div>
                ))}

                {audioTracks.length === 0 && (
                    <div className="text-center py-8 text-white/30 text-sm">
                        No audio tracks added
                    </div>
                )}
            </div>
        </div>
    );
};

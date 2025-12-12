import React from 'react';
import { Clip } from './Clip';
import { Video, Music, Type, Sticker } from 'lucide-react';

export const Track = ({
    track,
    scale,
    onClipSelect,
    selectedClipId,
    onTrim,
    onTrimEnd,
    onMove,
    onAddTransition
}) => {
    const getIcon = () => {
        switch (track.type) {
            case 'video': return <Video size={14} />;
            case 'audio': return <Music size={14} />;
            case 'text': return <Type size={14} />;
            case 'sticker': return <Sticker size={14} />;
            default: return null;
        }
    };

    return (
        <div className="flex h-16 mb-2 group">
            {/* Track Header */}
            <div className="w-32 flex-shrink-0 bg-[#1a1a1f] border-r border-white/5 flex flex-col justify-center px-3 z-40 sticky left-0">
                <div className="flex items-center gap-2 text-white/70 mb-1">
                    {getIcon()}
                    <span className="text-xs font-medium uppercase tracking-wider">{track.type}</span>
                </div>
                <div className="flex gap-1">
                    <button className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-white">M</button>
                    <button className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-white">S</button>
                </div>
            </div>

            {/* Track Content */}
            <div className="flex-1 bg-[#151518] relative border-b border-white/5 group-hover:bg-[#1a1a1f] transition-colors">
                {track.clips.map((clip, index) => {
                    const nextClip = track.clips[index + 1];
                    const isConnected = nextClip && Math.abs((clip.startTime + clip.duration) - nextClip.startTime) < 0.1;

                    return (
                        <React.Fragment key={clip.id}>
                            <Clip
                                clip={clip}
                                scale={scale}
                                onSelect={onClipSelect}
                                isSelected={selectedClipId === clip.id}
                                onTrim={onTrim}
                                onTrimEnd={onTrimEnd}
                                onMove={onMove}
                            />
                            {/* Transition Button */}
                            {isConnected && (
                                <div
                                    className="absolute z-50 transform -translate-x-1/2 flex flex-col items-center justify-center"
                                    style={{ left: `${(clip.startTime + clip.duration) * scale}px`, top: '50%', marginTop: '-10px' }}
                                >
                                    {nextClip.transition ? (
                                        <div
                                            className="h-4 bg-blue-500/50 rounded flex items-center justify-center text-[8px] text-white px-1 cursor-pointer hover:bg-blue-500"
                                            style={{ width: `${nextClip.transition.duration * scale}px` }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // TODO: Edit transition
                                            }}
                                        >
                                            {nextClip.transition.type}
                                        </div>
                                    ) : (
                                        <button
                                            className="w-4 h-4 bg-white/10 hover:bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddTransition(nextClip.id, 'cross-dissolve');
                                            }}
                                        >
                                            +
                                        </button>
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

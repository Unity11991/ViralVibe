import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical, Layers } from 'lucide-react';

export const LayerPanel = ({ layers, selectedLayerId, onSelectLayer, onUpdateLayer, onRemoveLayer, onReorderLayer }) => {

    // Simple drag and drop implementation could be added here
    // For now, we'll just list them in reverse order (top layer first)

    const reversedLayers = [...layers].reverse();

    return (
        <div className="bg-gray-900 border-l border-white/10 w-64 flex flex-col h-full">
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <Layers size={18} className="text-blue-400" />
                <h3 className="font-bold text-white">Layers</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {reversedLayers.map((layer, index) => {
                    // Calculate original index for handlers
                    const originalIndex = layers.length - 1 - index;

                    return (
                        <div
                            key={layer.id}
                            onClick={() => onSelectLayer(layer.id)}
                            className={`
                                group relative p-3 rounded-lg border transition-all cursor-pointer
                                ${selectedLayerId === layer.id
                                    ? 'bg-blue-500/20 border-blue-500/50'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                {/* Thumbnail / Icon */}
                                <div className="w-10 h-10 rounded bg-black/40 flex items-center justify-center overflow-hidden border border-white/10">
                                    {layer.type === 'image' && (
                                        <img src={layer.content} alt={layer.name} className="w-full h-full object-cover" />
                                    )}
                                    {layer.type === 'text' && (
                                        <span className="text-xs font-serif text-white/80">Aa</span>
                                    )}
                                    {layer.type === 'sticker' && (
                                        <img src={layer.content} alt="Sticker" className="w-full h-full object-contain p-1" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{layer.name}</div>
                                    <div className="text-xs text-white/40 capitalize">{layer.type}</div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onUpdateLayer(layer.id, { visible: !layer.visible }); }}
                                        className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white"
                                    >
                                        {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onUpdateLayer(layer.id, { locked: !layer.locked }); }}
                                        className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white"
                                    >
                                        {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                                    </button>
                                </div>
                            </div>

                            {/* Selected Layer Options */}
                            {selectedLayerId === layer.id && (
                                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-white/40">OPACITY</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={layer.opacity}
                                            onChange={(e) => onUpdateLayer(layer.id, { opacity: parseInt(e.target.value) })}
                                            className="w-16 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                                        />
                                    </div>

                                    {!layer.locked && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                            title="Delete Layer"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

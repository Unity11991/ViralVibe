import React from 'react';
import { Sliders, Wand2, Zap, Crop } from 'lucide-react';

export const PropertiesPanel = ({ activeItem, onUpdate }) => {
    if (!activeItem) {
        return (
            <div className="flex-1 flex items-center justify-center text-white/30 text-center p-8">
                Select an item on the timeline or canvas to edit its properties
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/5">
                <h3 className="font-bold text-lg">Properties</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                {/* Transform Section */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">Transform</h4>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-white/70">Scale</label>
                            <input
                                type="range"
                                min="10"
                                max="200"
                                value={activeItem.scale || 100}
                                onChange={(e) => onUpdate({ ...activeItem, scale: parseInt(e.target.value) })}
                                className="w-32 accent-blue-500"
                            />
                            <span className="text-xs w-8 text-right">{activeItem.scale || 100}%</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-sm text-white/70">Rotation</label>
                            <input
                                type="range"
                                min="-180"
                                max="180"
                                value={activeItem.rotation || 0}
                                onChange={(e) => onUpdate({ ...activeItem, rotation: parseInt(e.target.value) })}
                                className="w-32 accent-blue-500"
                            />
                            <span className="text-xs w-8 text-right">{activeItem.rotation || 0}°</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-sm text-white/70">Opacity</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={activeItem.opacity !== undefined ? activeItem.opacity : 100}
                                onChange={(e) => onUpdate({ ...activeItem, opacity: parseInt(e.target.value) })}
                                className="w-32 accent-blue-500"
                            />
                            <span className="text-xs w-8 text-right">{activeItem.opacity !== undefined ? activeItem.opacity : 100}%</span>
                        </div>
                    </div>
                </div>

                {/* Specific Properties based on type */}
                {activeItem.type === 'text' && (
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">Text</h4>
                        <textarea
                            value={activeItem.text}
                            onChange={(e) => onUpdate({ ...activeItem, text: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm focus:border-blue-500 outline-none resize-none"
                            rows={3}
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={activeItem.color || '#ffffff'}
                                onChange={(e) => onUpdate({ ...activeItem, color: e.target.value })}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                            />
                            <span className="text-sm text-white/70">Color</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

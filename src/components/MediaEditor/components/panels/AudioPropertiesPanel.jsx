import React, { useState } from 'react';
import { Volume2, Mic2, FastForward, Sliders, Wand2, Activity } from 'lucide-react';

export const AudioPropertiesPanel = ({ activeItem, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('basic'); // basic, voice, speed
    const [subTab, setSubTab] = useState('basic'); // basic for internal basic tab

    const handleUpdate = (updates) => {
        onUpdate({ ...activeItem, ...updates });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Top Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('basic')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'basic'
                        ? 'text-white border-b-2 border-blue-500'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                >
                    Basic
                </button>
                <button
                    onClick={() => setActiveTab('voice')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'voice'
                        ? 'text-white border-b-2 border-blue-500'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                >
                    Voice Changer
                </button>
                <button
                    onClick={() => setActiveTab('speed')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'speed'
                        ? 'text-white border-b-2 border-blue-500'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                >
                    Speed
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {activeTab === 'basic' && (
                    <div className="space-y-6">
                        {/* Internal Header for Basic */}
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                checked={true}
                                readOnly
                                className="w-3 h-3 accent-blue-500 bg-white/10 rounded"
                            />
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Basic</h4>
                            <div className="ml-auto flex gap-1">
                                <button className="p-1 hover:text-white text-white/40"><Activity size={12} /></button>
                            </div>
                        </div>

                        {/* Volume */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/70">Volume</span>
                                <div className="bg-white/5 px-2 py-1 rounded text-white/50 w-16 text-center">
                                    {(activeItem.volume !== undefined ? activeItem.volume : 100)}%
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={activeItem.volume !== undefined ? activeItem.volume : 100}
                                onChange={(e) => handleUpdate({ volume: parseInt(e.target.value) })}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                            />
                        </div>

                        {/* Fade In */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/70">Fade in</span>
                                <div className="bg-white/5 px-2 py-1 rounded text-white/50 w-16 text-center">
                                    {activeItem.fadeIn || 0}s
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="5"
                                step="0.1"
                                value={activeItem.fadeIn || 0}
                                onChange={(e) => handleUpdate({ fadeIn: parseFloat(e.target.value) })}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                            />
                        </div>

                        {/* Fade Out */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-white/70">Fade out</span>
                                <div className="bg-white/5 px-2 py-1 rounded text-white/50 w-16 text-center">
                                    {activeItem.fadeOut || 0}s
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="5"
                                step="0.1"
                                value={activeItem.fadeOut || 0}
                                onChange={(e) => handleUpdate({ fadeOut: parseFloat(e.target.value) })}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                            />
                        </div>

                        <div className="w-full h-px bg-white/5 my-4" />

                        {/* Mock Options */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 opacity-50 cursor-not-allowed">
                                <input type="checkbox" disabled className="w-3 h-3 bg-white/10 rounded border-white/20" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-white/70">Normalize loudness</span>
                                </div>
                                <Wand2 size={12} className="text-purple-400 ml-1" />
                            </div>
                            <p className="text-[10px] text-white/30 pl-6">
                                Normalize the loudness of the selected clip to a target level.
                            </p>

                            <div className="flex items-center gap-3 opacity-50 cursor-not-allowed">
                                <input type="checkbox" disabled className="w-3 h-3 bg-white/10 rounded border-white/20" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-white/70">Enhance voice</span>
                                </div>
                                <Wand2 size={12} className="text-purple-400 ml-1" />
                            </div>

                            <div className="flex items-center gap-3 opacity-50 cursor-not-allowed">
                                <input type="checkbox" disabled className="w-3 h-3 bg-white/10 rounded border-white/20" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-white/70">Reduce noise</span>
                                </div>
                                <Wand2 size={12} className="text-purple-400 ml-1" />
                            </div>

                            <div className="w-full h-px bg-white/5 my-4" />

                            <div className="flex items-center gap-3 opacity-50 cursor-not-allowed">
                                <input type="checkbox" disabled className="w-3 h-3 bg-white/10 rounded border-white/20" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-white/70">Separate audio</span>
                                </div>
                                <Wand2 size={12} className="text-purple-400 ml-1" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'voice' && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <Mic2 size={12} /> Voice Effects
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                            {['none', 'chipmunk', 'monster', 'robot', 'echo', 'telephone'].map(effect => (
                                <button
                                    key={effect}
                                    onClick={() => handleUpdate({ voiceEffect: effect === 'none' ? null : effect })}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${(activeItem.voiceEffect === effect) || (!activeItem.voiceEffect && effect === 'none')
                                            ? 'bg-blue-500/20 border-blue-500 text-white'
                                            : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="capitalize text-xs font-bold">{effect}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'speed' && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <FastForward size={12} /> Speed
                        </h4>
                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                            <span className="text-sm text-white/70">Multiplier</span>
                            <div className="flex items-center gap-2">
                                {[0.5, 1, 1.5, 2].map(speed => (
                                    <button
                                        key={speed}
                                        onClick={() => handleUpdate({ speed })}
                                        className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${activeItem.speed === speed
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white/10 text-white/50 hover:bg-white/20'
                                            }`}
                                    >
                                        {speed}x
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-[10px] text-white/30">
                            Changing speed will affect the clip duration.
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { Sliders, Wand2, Zap, Crop, Layers, Move, RotateCw, Play, FastForward, Activity, MonitorPlay, Square } from 'lucide-react';
import { AdjustPanel } from '../AdjustPanel';
import { AudioPropertiesPanel } from './AudioPropertiesPanel';

// Helper Component for Keyframe Button
const KeyframeControl = ({ property, value, activeItem, currentTime, onAddKeyframe, onRemoveKeyframe }) => {
    // Calculate relative time
    const relativeTime = Math.max(0, currentTime - (activeItem.startTime || 0));

    // Check state
    const keyframes = activeItem.keyframes?.[property] || [];
    const hasKeyframes = keyframes.length > 0;

    // Check if keyframe exists at current time
    const activeKeyframe = keyframes.find(k => Math.abs(k.time - relativeTime) < 0.1);

    const handleClick = () => {
        if (activeKeyframe) {
            onRemoveKeyframe(activeItem.id, property, activeKeyframe.id);
        } else {
            onAddKeyframe(activeItem.id, property, relativeTime, value);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`p-1 rounded-sm transition-all transform hover:scale-110 ${activeKeyframe
                ? 'text-blue-500' // on keyframe
                : hasKeyframes
                    ? 'text-blue-500/50 hover:text-blue-500' // has keyframes elsewhere
                    : 'text-white/20 hover:text-white/50' // no keyframes
                }`}
            title={activeKeyframe ? "Remove Keyframe" : "Add Keyframe"}
        >
            <div className="transform rotate-45">
                <Square size={10} fill={activeKeyframe ? "currentColor" : "none"} strokeWidth={3} />
            </div>
        </button>
    );
};

const VideoPropertiesPanel = ({ activeItem, onUpdate, currentTime, onAddKeyframe, onRemoveKeyframe }) => {
    const [activeTab, setActiveTab] = useState('video'); // video, audio, speed, animation, adjust
    const [videoSubTab, setVideoSubTab] = useState('basic'); // basic, remove-bg, mask, retouch

    const handleUpdate = (updates) => {
        onUpdate({ ...activeItem, ...updates });
    };

    const handleTransformUpdate = (key, value) => {
        const currentTransform = activeItem.transform || {};
        handleUpdate({
            transform: {
                ...currentTransform,
                [key]: value
            }
        });

        // Auto-add keyframe if property is already keyed (Auto-Keyframe Mode simplified)
        // If we want explicit only, remove this. But standard NLEs auto-keyframe if tracks are armed.
        // For now, explicit on-click.
    };

    // Helper to inject Keyframe Control
    const KF = ({ prop, val }) => (
        <KeyframeControl
            property={prop}
            value={val}
            activeItem={activeItem}
            currentTime={currentTime}
            onAddKeyframe={onAddKeyframe}
            onRemoveKeyframe={onRemoveKeyframe}
        />
    );

    return (
        <div className="flex flex-col h-full">
            {/* Top Tabs */}
            <div className="flex border-b border-white/10">
                {['video', 'audio', 'speed', 'animation', 'adjust'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === tab
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'video' && (
                    <div className="p-4 space-y-6">
                        {/* Sub Tabs */}
                        <div className="flex bg-black/20 p-1 rounded-lg mb-4">
                            {['basic', 'remove-bg', 'mask', 'retouch'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setVideoSubTab(tab)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${videoSubTab === tab
                                        ? 'bg-white/10 text-white shadow-sm'
                                        : 'text-white/40 hover:text-white'
                                        }`}
                                >
                                    {tab.replace('-', ' ')}
                                </button>
                            ))}
                        </div>

                        {videoSubTab === 'basic' && (
                            <div className="space-y-6">
                                {/* Transform Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                                            <Move size={12} /> Transform
                                        </h4>
                                        <button
                                            onClick={() => handleUpdate({ transform: {} })}
                                            className="text-[10px] text-blue-400 hover:text-blue-300"
                                        >
                                            Reset
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Scale */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <KF prop="scale" val={activeItem.transform?.scale || 100} />
                                                    <span className="text-white/70">Scale</span>
                                                </div>
                                                <span className="text-white/40">{activeItem.transform?.scale || 100}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="10"
                                                max="200"
                                                value={activeItem.transform?.scale || 100}
                                                onChange={(e) => handleTransformUpdate('scale', parseInt(e.target.value))}
                                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                                            />
                                        </div>

                                        {/* Position */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    {/* Using separate keyframes for X and Y for precision */}
                                                    <span className="text-white/70">Position</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-white/5 rounded px-2 py-1 flex items-center gap-2">
                                                    <KF prop="x" val={activeItem.transform?.x || 0} />
                                                    <span className="text-xs text-white/30">X</span>
                                                    <input
                                                        type="number"
                                                        value={activeItem.transform?.x || 0}
                                                        onChange={(e) => handleTransformUpdate('x', parseInt(e.target.value))}
                                                        className="w-full bg-transparent text-xs text-white outline-none text-right"
                                                    />
                                                </div>
                                                <div className="bg-white/5 rounded px-2 py-1 flex items-center gap-2">
                                                    <KF prop="y" val={activeItem.transform?.y || 0} />
                                                    <span className="text-xs text-white/30">Y</span>
                                                    <input
                                                        type="number"
                                                        value={activeItem.transform?.y || 0}
                                                        onChange={(e) => handleTransformUpdate('y', parseInt(e.target.value))}
                                                        className="w-full bg-transparent text-xs text-white outline-none text-right"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rotate */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <KF prop="rotation" val={activeItem.transform?.rotation || 0} />
                                                    <span className="text-white/70">Rotate</span>
                                                </div>
                                                <span className="text-white/40">{activeItem.transform?.rotation || 0}°</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RotateCw size={14} className="text-white/30" />
                                                <input
                                                    type="range"
                                                    min="-180"
                                                    max="180"
                                                    value={activeItem.transform?.rotation || 0}
                                                    onChange={(e) => handleTransformUpdate('rotation', parseInt(e.target.value))}
                                                    className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Blend Mode */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                                        <Layers size={12} /> Blend
                                    </h4>
                                    <div className="space-y-3">
                                        <select
                                            value={activeItem.blendMode || 'normal'}
                                            onChange={(e) => handleUpdate({ blendMode: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500"
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="screen">Screen</option>
                                            <option value="multiply">Multiply</option>
                                            <option value="overlay">Overlay</option>
                                            <option value="soft-light">Soft Light</option>
                                            <option value="hard-light">Hard Light</option>
                                            <option value="difference">Difference</option>
                                        </select>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <KF prop="opacity" val={activeItem.opacity !== undefined ? activeItem.opacity : 100} />
                                                    <span className="text-white/70">Opacity</span>
                                                </div>
                                                <span className="text-white/40">{activeItem.opacity !== undefined ? activeItem.opacity : 100}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                onChange={(e) => handleUpdate({ opacity: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {videoSubTab !== 'basic' && (
                            <div className="flex flex-col items-center justify-center py-12 text-white/30 space-y-2">
                                <Wand2 size={24} />
                                <span className="text-xs">Coming Soon</span>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'audio' && (
                    <AudioPropertiesPanel activeItem={activeItem} onUpdate={onUpdate} />
                )}

                {activeTab === 'speed' && (
                    <div className="p-4 space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                                <FastForward size={12} /> Speed
                            </h4>
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                                <span className="text-sm text-white/70">Normal</span>
                                <div className="flex items-center gap-2">
                                    {[0.5, 1, 1.5, 2, 5].map(speed => (
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
                        </div>
                    </div>
                )}

                {(activeTab === 'animation' || activeTab === 'adjust') && (
                    <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-2">
                        <Activity size={24} />
                        <span className="text-xs">Coming Soon</span>
                    </div>
                )}

                {activeTab === 'adjust' && (
                    <div className="p-4">
                        <AdjustPanel
                            adjustments={activeItem.adjustments || {}}
                            onUpdate={(newAdjustments) => handleUpdate({ adjustments: newAdjustments })}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export const PropertiesPanel = ({ activeItem, onUpdate, currentTime, onAddKeyframe, onRemoveKeyframe }) => {
    const [activeTab, setActiveTab] = useState('style'); // style, animation

    // Reset tab when item changes
    React.useEffect(() => {
        setActiveTab('style');
    }, [activeItem?.id]); // Safely access id

    if (!activeItem) {
        return (
            <div className="flex-1 flex items-center justify-center text-white/30 text-center p-8">
                <div className="flex flex-col items-center gap-3">
                    <MonitorPlay size={32} className="opacity-50" />
                    <p className="text-sm">Select a clip to edit</p>
                </div>
            </div>
        );
    }

    // If it's a video, image, or sticker, use the new VideoPropertiesPanel
    if (['video', 'image', 'sticker'].includes(activeItem.type)) {
        return (
            <VideoPropertiesPanel
                activeItem={activeItem}
                onUpdate={onUpdate}
                currentTime={currentTime}
                onAddKeyframe={onAddKeyframe}
                onRemoveKeyframe={onRemoveKeyframe}
            />
        );
    }

    if (activeItem.type === 'audio') {
        return <AudioPropertiesPanel activeItem={activeItem} onUpdate={onUpdate} />;
    }

    if (activeItem.type === 'adjustment') {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-white/5">
                    <h3 className="font-bold text-lg">Adjustment Layer</h3>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar">
                    <AdjustPanel
                        adjustments={activeItem.adjustments || {}}
                        onUpdate={(newAdjustments) => onUpdate({ adjustments: newAdjustments })}
                    />
                </div>
            </div>
        );
    }

    // Text Properties with Tabs
    const fonts = [
        'Arial', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway', 'Merriweather',
        'Playfair Display', 'Nunito', 'Poppins', 'Ubuntu', 'Lobster', 'Pacifico', 'Dancing Script',
        'Satisfy', 'Great Vibes', 'Kaushan Script', 'Sacramento', 'Parisienne', 'Cookie', 'Bangers',
        'Creepster', 'Fredoka One', 'Righteous', 'Audiowide', 'Press Start 2P', 'Monoton',
        'Permanent Marker', 'Rock Salt', 'Shadows Into Light'
    ];

    const animations = [
        { id: 'none', label: 'None', icon: '⊘' },
        { id: 'typewriter', label: 'Typewriter', icon: '⌨️' },
        { id: 'fadeIn', label: 'Fade In', icon: '☁️' },
        { id: 'slideIn', label: 'Slide Right', icon: '➡️' },
        { id: 'slideUp', label: 'Slide Up', icon: '⬆️' },
        { id: 'bounce', label: 'Bounce', icon: '🏀' },
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-white/5">
                <div className="flex">
                    {['style', 'animation'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === tab
                                ? 'text-white border-b-2 border-blue-500'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {activeItem.type === 'text' && activeTab === 'style' && (
                    <div className="space-y-6">
                        {/* Text Content */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/60">Content</label>
                            <textarea
                                value={activeItem.text}
                                onChange={(e) => onUpdate({ ...activeItem, text: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none resize-none"
                                rows={3}
                            />
                        </div>

                        {/* Font Family */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/60">Font</label>
                            <select
                                value={activeItem.style?.fontFamily || 'Arial'}
                                onChange={(e) => onUpdate({ ...activeItem, style: { ...activeItem.style, fontFamily: e.target.value } })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                style={{ fontFamily: activeItem.style?.fontFamily || 'Arial' }}
                            >
                                {fonts.map(font => (
                                    <option key={font} value={font} style={{ fontFamily: font }}>
                                        {font}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Font Size */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-medium text-white/60">Size</label>
                                <span className="text-xs text-white/40">{activeItem.style?.fontSize || 40}</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="200"
                                value={activeItem.style?.fontSize || 40}
                                onChange={(e) => onUpdate({ ...activeItem, style: { ...activeItem.style, fontSize: parseInt(e.target.value) } })}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>

                        {/* Styles & Alignment */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex bg-black/20 rounded-lg p-1 border border-white/10">
                                <button
                                    onClick={() => onUpdate({ ...activeItem, style: { ...activeItem.style, fontWeight: activeItem.style?.fontWeight === 'bold' ? 'normal' : 'bold' } })}
                                    className={`p-2 rounded-md transition-colors ${activeItem.style?.fontWeight === 'bold' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    <span className="font-bold">B</span>
                                </button>
                                <button
                                    onClick={() => onUpdate({ ...activeItem, style: { ...activeItem.style, fontStyle: activeItem.style?.fontStyle === 'italic' ? 'normal' : 'italic' } })}
                                    className={`p-2 rounded-md transition-colors ${activeItem.style?.fontStyle === 'italic' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    <span className="italic">I</span>
                                </button>
                            </div>

                            <div className="flex bg-black/20 rounded-lg p-1 border border-white/10">
                                <button
                                    onClick={() => onUpdate({ ...activeItem, style: { ...activeItem.style, textAlign: 'left' } })}
                                    className={`p-2 rounded-md transition-colors ${activeItem.style?.textAlign === 'left' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    <span className="text-xs">Left</span>
                                </button>
                                <button
                                    onClick={() => onUpdate({ ...activeItem, style: { ...activeItem.style, textAlign: 'center' } })}
                                    className={`p-2 rounded-md transition-colors ${activeItem.style?.textAlign === 'center' || !activeItem.style?.textAlign ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    <span className="text-xs">Center</span>
                                </button>
                                <button
                                    onClick={() => onUpdate({ ...activeItem, style: { ...activeItem.style, textAlign: 'right' } })}
                                    className={`p-2 rounded-md transition-colors ${activeItem.style?.textAlign === 'right' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    <span className="text-xs">Right</span>
                                </button>
                            </div>
                        </div>

                        {/* Color */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/60">Color</label>
                            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/10">
                                <input
                                    type="color"
                                    value={activeItem.style?.color || '#ffffff'}
                                    onChange={(e) => onUpdate({ ...activeItem, style: { ...activeItem.style, color: e.target.value } })}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                />
                                <span className="text-sm text-white/70 uppercase">{activeItem.style?.color || '#ffffff'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeItem.type === 'text' && activeTab === 'animation' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            {animations.map(anim => {
                                const isActive = activeItem.animation?.type === anim.id || (!activeItem.animation?.type && anim.id === 'none');
                                return (
                                    <button
                                        key={anim.id}
                                        onClick={() => onUpdate({
                                            ...activeItem,
                                            animation: { type: anim.id, duration: activeItem.animation?.duration || 1.0 }
                                        })}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${isActive
                                                ? 'bg-blue-500/20 border-blue-500 text-white'
                                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{anim.icon}</div>
                                        <span className="text-xs font-medium">{anim.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {activeItem.animation?.type && activeItem.animation?.type !== 'none' && (
                            <div className="space-y-2 pt-4 border-t border-white/10">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-medium text-white/60">Duration</label>
                                    <span className="text-xs text-white/40">{activeItem.animation.duration}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="5.0"
                                    step="0.1"
                                    value={activeItem.animation.duration}
                                    onChange={(e) => onUpdate({
                                        ...activeItem,
                                        animation: { ...activeItem.animation, duration: parseFloat(e.target.value) }
                                    })}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

import React from 'react';
import { Circle, Square, Heart, Star, Ban, Move, Maximize, RotateCw, Feather, Film, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import { Slider, CollapsibleSection } from './UI';

/**
 * Mask Panel Component
 */
export const MaskPanel = ({ mask, onUpdate }) => {
    // Default mask state if undefined
    const currentMask = mask || {
        type: 'none',
        x: 0,
        y: 0,
        scale: 100,
        rotation: 0,
        blur: 0,
        text: 'Default text',
        fontSize: 40,
        fontFamily: 'Arial',
        isBold: false,
        isItalic: false,
        textAlign: 'center'
    };

    const handleUpdate = (key, value) => {
        onUpdate({
            ...currentMask,
            [key]: value
        });
    };

    const fonts = [
        'Arial', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway', 'Merriweather',
        'Playfair Display', 'Nunito', 'Poppins', 'Ubuntu', 'Lobster', 'Pacifico', 'Dancing Script',
        'Satisfy', 'Great Vibes', 'Kaushan Script', 'Sacramento', 'Parisienne', 'Cookie', 'Bangers',
        'Creepster', 'Fredoka One', 'Righteous', 'Audiowide', 'Press Start 2P', 'Monoton',
        'Permanent Marker', 'Rock Salt', 'Shadows Into Light'
    ];

    const shapes = [
        { id: 'none', icon: Ban, label: 'None' },
        { id: 'filmstrip', icon: Film, label: 'Filmstrip' },
        { id: 'circle', icon: Circle, label: 'Circle' },
        { id: 'rectangle', icon: Square, label: 'Rect' },
        { id: 'star', icon: Star, label: 'Star' },
        { id: 'heart', icon: Heart, label: 'Heart' },
        { id: 'text', icon: Type, label: 'Text' }
    ];

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Shape Selection */}
            <div className="grid grid-cols-4 gap-2">
                {shapes.map(shape => (
                    <button
                        key={shape.id}
                        onClick={() => handleUpdate('type', shape.id)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${currentMask.type === shape.id
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <shape.icon size={24} />
                        <span className="text-[10px] font-medium">{shape.label}</span>
                    </button>
                ))}
            </div>

            {/* Properties - Only show if a mask is selected */}
            {currentMask.type !== 'none' && (
                <div className="space-y-4">

                    {/* Text Specific Controls */}
                    {currentMask.type === 'text' && (
                        <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-white/60">Text</label>
                                <input
                                    type="text"
                                    value={currentMask.text !== undefined ? currentMask.text : 'Default text'}
                                    onChange={(e) => handleUpdate('text', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                    placeholder="Enter text..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-white/60">Font</label>
                                <select
                                    value={currentMask.fontFamily || 'Arial'}
                                    onChange={(e) => handleUpdate('fontFamily', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                    style={{ fontFamily: currentMask.fontFamily }}
                                >
                                    {fonts.map(font => (
                                        <option key={font} value={font} style={{ fontFamily: font }}>
                                            {font}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-medium text-white/60">Font size</label>
                                    <span className="text-xs text-white/40">{currentMask.fontSize || 40}</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="200"
                                    value={currentMask.fontSize || 40}
                                    onChange={(e) => handleUpdate('fontSize', parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <div className="flex bg-black/20 rounded-lg p-1 border border-white/10">
                                    <button
                                        onClick={() => handleUpdate('isBold', !currentMask.isBold)}
                                        className={`p-2 rounded-md transition-colors ${currentMask.isBold ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                    >
                                        <Bold size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleUpdate('isItalic', !currentMask.isItalic)}
                                        className={`p-2 rounded-md transition-colors ${currentMask.isItalic ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                    >
                                        <Italic size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleUpdate('isUnderline', !currentMask.isUnderline)}
                                        className={`p-2 rounded-md transition-colors ${currentMask.isUnderline ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                    >
                                        <Underline size={16} />
                                    </button>
                                </div>

                                <div className="flex bg-black/20 rounded-lg p-1 border border-white/10">
                                    <button
                                        onClick={() => handleUpdate('textAlign', 'left')}
                                        className={`p-2 rounded-md transition-colors ${currentMask.textAlign === 'left' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                    >
                                        <AlignLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleUpdate('textAlign', 'center')}
                                        className={`p-2 rounded-md transition-colors ${currentMask.textAlign === 'center' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                    >
                                        <AlignCenter size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleUpdate('textAlign', 'right')}
                                        className={`p-2 rounded-md transition-colors ${currentMask.textAlign === 'right' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                    >
                                        <AlignRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                                <Maximize size={16} />
                                <span>Mask settings</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleUpdate('rotation', (currentMask.rotation + 90) % 360)} className="text-white/40 hover:text-white">
                                    <RotateCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Position X</label>
                                <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1 border border-white/10">
                                    <span className="text-xs text-white/40">X</span>
                                    <input
                                        type="number"
                                        value={currentMask.x}
                                        onChange={(e) => handleUpdate('x', parseInt(e.target.value))}
                                        className="w-full bg-transparent text-sm text-white focus:outline-none text-right"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Position Y</label>
                                <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1 border border-white/10">
                                    <span className="text-xs text-white/40">Y</span>
                                    <input
                                        type="number"
                                        value={currentMask.y}
                                        onChange={(e) => handleUpdate('y', parseInt(e.target.value))}
                                        className="w-full bg-transparent text-sm text-white focus:outline-none text-right"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Rotation</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-black/20 rounded-lg px-2 py-1 border border-white/10 flex items-center justify-between">
                                    <span className="text-sm text-white">{currentMask.rotation}°</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={currentMask.rotation}
                                    onChange={(e) => handleUpdate('rotation', parseInt(e.target.value))}
                                    className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Size</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-black/20 rounded-lg px-2 py-1 border border-white/10 flex items-center justify-between">
                                    <span className="text-sm text-white">{currentMask.scale}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="200"
                                    value={currentMask.scale}
                                    onChange={(e) => handleUpdate('scale', parseInt(e.target.value))}
                                    className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Blur Edge</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-black/20 rounded-lg px-2 py-1 border border-white/10 flex items-center justify-between">
                                    <span className="text-sm text-white">{currentMask.blur || 0}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    value={currentMask.blur || 0}
                                    onChange={(e) => handleUpdate('blur', parseInt(e.target.value))}
                                    className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

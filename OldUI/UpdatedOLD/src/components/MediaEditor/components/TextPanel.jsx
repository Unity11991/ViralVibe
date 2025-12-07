import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, ColorPicker, Slider } from './UI';

const COLOR_PRESETS = ['#ffffff', '#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'];

const FONT_OPTIONS = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
    'Source Sans Pro', 'Slabo 27px', 'Raleway', 'PT Sans', 'Merriweather',
    'Noto Sans', 'Nunito', 'Concert One', 'Ubuntu', 'Playfair Display',
    'Rubik', 'Poppins', 'Lora', 'Karla', 'Mulish',
    'Inconsolata', 'Fira Sans', 'Pacifico', 'Quicksand', 'Work Sans',
    'Arimo', 'Titillium Web', 'Dosis', 'Oxygen', 'Cabin'
];

/**
 * Text Panel Component
 */
export const TextPanel = ({
    textOverlays,
    activeOverlayId,
    onAddText,
    onUpdateText,
    onDeleteText
}) => {
    const activeText = textOverlays.find(t => t.id === activeOverlayId);

    return (
        <div className="space-y-6 animate-slide-up">
            <Button
                onClick={onAddText}
                variant="primary"
                className="w-full"
                icon={Plus}
            >
                Add Text
            </Button>

            {activeText ? (
                <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-white">Edit Text</span>
                        <Button
                            onClick={() => onDeleteText(activeText.id)}
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                        />
                    </div>

                    {/* Color Picker */}
                    <ColorPicker
                        value={activeText.color}
                        onChange={(color) => onUpdateText(activeText.id, { color })}
                        presets={COLOR_PRESETS}
                    />

                    {/* Font Family */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/60">Font</label>
                        <select
                            value={activeText.fontFamily || 'Arial'}
                            onChange={(e) => onUpdateText(activeText.id, { fontFamily: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                            style={{ fontFamily: activeText.fontFamily }}
                        >
                            <option value="Arial">Default (Arial)</option>
                            {FONT_OPTIONS.map(font => (
                                <option key={font} value={font} style={{ fontFamily: font }}>
                                    {font}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Font Size */}
                    <Slider
                        label="Size"
                        value={activeText.fontSize}
                        min={12}
                        max={120}
                        onChange={(size) => onUpdateText(activeText.id, { fontSize: size })}
                        unit="px"
                    />

                    {/* Rotation */}
                    <Slider
                        label="Rotation"
                        value={activeText.rotation}
                        min={-180}
                        max={180}
                        onChange={(rotation) => onUpdateText(activeText.id, { rotation })}
                        unit="°"
                    />

                    {/* Font Weight */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/60">Weight</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['normal', 'bold', '900'].map(weight => (
                                <button
                                    key={weight}
                                    onClick={() => onUpdateText(activeText.id, { fontWeight: weight })}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${activeText.fontWeight === weight
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                                        }`}
                                >
                                    {weight === 'normal' ? 'Regular' : weight === 'bold' ? 'Bold' : 'Black'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-white/30 py-8 text-sm">
                    Add text or select an existing text layer to edit
                </div>
            )}
        </div>
    );
};

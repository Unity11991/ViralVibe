import React, { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    Crop,
    RotateCw,
    Maximize,
    Sliders,
    Droplet,
    Palette,
    Sun,
    Triangle,
    Grid,
    Aperture,
    Sparkles,
    Grid3x3,
    Wind,
    User,
    Activity,
    Disc,
    Scissors
} from 'lucide-react';

export const AdjustmentToolsPanel = ({
    activeLayer,
    onUpdateLayer,
    isCropping,
    startCrop,
    setAspectRatio,
    cropAspectRatio,
    applyCrop,
    cancelCrop
}) => {
    const [expandedSection, setExpandedSection] = useState('brightness');

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const renderSlider = (label, value, min, max, onChange) => (
        <div className="mb-3">
            <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>{label}</span>
                <span>{value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 hover:[&::-webkit-slider-thumb]:bg-blue-400 cursor-pointer"
            />
        </div>
    );

    const categories = [
        {
            id: 'size',
            title: 'Size',
            items: [
                {
                    id: 'crop',
                    icon: Crop,
                    label: 'Crop',
                    content: (
                        <div className="space-y-4">
                            {/* Presets Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'Freeform', ratio: null, icon: 'crop' },
                                    { label: '1:1', ratio: 1, icon: 'square' },
                                    { label: '3:2', ratio: 3 / 2, icon: 'rect-h' },
                                    { label: '2:3', ratio: 2 / 3, icon: 'rect-v' },
                                    { label: '4:3', ratio: 4 / 3, icon: 'rect-h' },
                                    { label: '3:4', ratio: 3 / 4, icon: 'rect-v' },
                                    { label: '16:9', ratio: 16 / 9, icon: 'rect-h' },
                                    { label: '9:16', ratio: 9 / 16, icon: 'rect-v' },
                                ].map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => {
                                            if (!isCropping) startCrop();
                                            setAspectRatio(preset.ratio);
                                        }}
                                        className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${cropAspectRatio === preset.ratio
                                            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 border-2 mb-1 ${preset.icon === 'square' ? 'rounded-sm' :
                                            preset.icon === 'rect-h' ? 'w-5 h-3 rounded-sm' :
                                                preset.icon === 'rect-v' ? 'w-3 h-5 rounded-sm' :
                                                    'border-dashed'
                                            }`} style={{ borderColor: 'currentColor' }} />
                                        <span className="text-[10px]">{preset.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={applyCrop}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={cancelCrop}
                                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )
                },
                { id: 'rotate', icon: RotateCw, label: 'Rotate & Flip' },
                { id: 'resize', icon: Maximize, label: 'Resize' },
            ]
        },
        {
            id: 'brightness',
            title: 'Brightness & Color',
            items: [
                {
                    id: 'basic',
                    icon: Sliders,
                    label: 'Basic Adjust',
                    content: (
                        <div className="p-2 space-y-2">
                            {renderSlider('Brightness', activeLayer?.filters?.brightness || 100, 0, 200, (v) => onUpdateLayer(activeLayer.id, { filters: { ...activeLayer.filters, brightness: v } }))}
                            {renderSlider('Contrast', activeLayer?.filters?.contrast || 100, 0, 200, (v) => onUpdateLayer(activeLayer.id, { filters: { ...activeLayer.filters, contrast: v } }))}
                            {renderSlider('Saturation', activeLayer?.filters?.saturation || 100, 0, 200, (v) => onUpdateLayer(activeLayer.id, { filters: { ...activeLayer.filters, saturation: v } }))}
                        </div>
                    )
                },
                { id: 'finetune', icon: Droplet, label: 'Fine Tune' },
                { id: 'color', icon: Palette, label: 'Color' },
                { id: 'invert', icon: Sun, label: 'Invert Colors', toggle: true },
            ]
        },
        {
            id: 'advanced',
            title: 'Advanced Edits',
            items: [
                { id: 'structure', icon: Triangle, label: 'Structure' },
                { id: 'denoise', icon: Grid, label: 'Denoise' },
                { id: 'vignette', icon: Aperture, label: 'Vignette' },
                { id: 'grain', icon: Sparkles, label: 'Film Grain' },
                { id: 'mosaic', icon: Grid3x3, label: 'Mosaic' },
                { id: 'blur', icon: Wind, label: 'Blur' },
                { id: 'blur_bg', icon: User, label: 'Blur Background' },
            ]
        },
        {
            id: 'specialized',
            title: 'Specialized Edits',
            items: [
                { id: 'curves', icon: Activity, label: 'Curves' },
                { id: 'hsl', icon: Disc, label: 'HSL' },
                { id: 'cutout', icon: Scissors, label: 'Image Cutout' },
            ]
        }
    ];

    return (
        <div className="flex flex-col h-full bg-[#1a1a1a] text-white overflow-y-auto custom-scrollbar">
            <div className="p-4 border-b border-white/10">
                <h3 className="font-bold text-sm text-white/80 uppercase tracking-wider">Adjustments</h3>
            </div>

            <div className="flex-1 p-2 space-y-6">
                {categories.map((category) => (
                    <div key={category.id}>
                        <h4 className="px-2 mb-2 text-xs font-medium text-blue-400 uppercase tracking-wider">{category.title}</h4>
                        <div className="space-y-1">
                            {category.items.map((item) => (
                                <div key={item.id} className="rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection(item.id)}
                                        className={`w-full flex items-center justify-between p-3 text-sm transition-colors ${expandedSection === item.id ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon size={16} />
                                            <span>{item.label}</span>
                                        </div>
                                        {item.toggle ? (
                                            <div className="w-8 h-4 bg-white/20 rounded-full relative">
                                                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                                            </div>
                                        ) : (
                                            expandedSection === item.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                                        )}
                                    </button>

                                    {/* Expanded Content */}
                                    {expandedSection === item.id && item.content && (
                                        <div className="bg-black/20 p-3 border-t border-white/5 animate-fade-in">
                                            {item.content}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

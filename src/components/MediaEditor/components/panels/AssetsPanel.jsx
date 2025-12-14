import React from 'react';
import { LayoutGrid, Type, Music, Image as ImageIcon, Sliders, Wand2, Sparkles, ArrowRightLeft } from 'lucide-react';
import { AdjustPanel } from '../AdjustPanel';
import { FilterPanel } from '../FilterPanel';
import { EffectsPanel } from '../EffectsPanel';
import { MaskPanel } from '../MaskPanel';
import { TransitionsPanel } from './TransitionsPanel';
import { ScanFace } from 'lucide-react';

const TABS = [
    { id: 'media', icon: ImageIcon, label: 'Media' },
    { id: 'audio', icon: Music, label: 'Audio' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'adjust', icon: Sliders, label: 'Adjust' },
    { id: 'filters', icon: Wand2, label: 'Filters' },
    { id: 'effects', icon: Sparkles, label: 'Effects' },
    { id: 'transitions', icon: ArrowRightLeft, label: 'Transitions' },
    { id: 'mask', icon: ScanFace, label: 'Mask' },
    { id: 'templates', icon: LayoutGrid, label: 'Templates' },
];

export const AssetsPanel = ({
    activeTab,
    setActiveTab,
    onAddAsset,
    // Tool Props
    adjustments,
    setAdjustments,
    activeFilterId,
    setActiveFilterId,
    activeEffectId,
    setActiveEffectId,
    effectIntensity,
    setEffectIntensity,
    mediaUrl,
    thumbnailUrl,
    suggestedFilter,
    mediaLibrary = [],
    onAddToLibrary,
    mask,
    onUpdateMask,
    activeClip,
    onUpdateClip
}) => {
    return (
        <div className="flex h-full">
            {/* Icon Sidebar */}
            <div className="w-16 flex flex-col items-center py-4 border-r border-white/5 gap-4 bg-[#1a1a1f]">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`p-3 rounded-xl transition-all ${activeTab === tab.id
                            ? 'bg-blue-500 text-white'
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                        title={tab.label}
                    >
                        <tab.icon size={20} />
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col bg-[#1a1a1f] min-w-0">
                <div className="p-4 border-b border-white/5">
                    <h3 className="font-bold text-lg capitalize">{activeTab}</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {activeTab === 'media' && (
                        <div className="space-y-4">
                            <div className="p-4 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-white/30 hover:border-blue-500/50 hover:bg-white/5 transition-all cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            onAddToLibrary(e.target.files[0]);
                                        }
                                    }}
                                />
                                <ImageIcon size={24} />
                                <span className="text-sm">Upload Media</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {mediaLibrary.filter(item => item.type === 'video' || item.type === 'image').map(item => (
                                    <div
                                        key={item.id}
                                        className="aspect-square bg-black/50 rounded-lg overflow-hidden relative group cursor-pointer border border-white/5 hover:border-blue-500"
                                        onClick={() => onAddAsset(item.type, { file: item.file, url: item.url, duration: item.duration || 10 })}
                                        draggable="true"
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('application/json', JSON.stringify({
                                                type: item.type,
                                                url: item.url,
                                                name: item.name,
                                                duration: item.duration || 10
                                            }));
                                        }}
                                    >
                                        {item.type === 'video' ? (
                                            <video src={item.url} className="w-full h-full object-cover pointer-events-none" />
                                        ) : (
                                            <img src={item.url} alt={item.name} className="w-full h-full object-cover pointer-events-none" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="text-xs font-bold text-white">+ Add</span>
                                        </div>
                                        {/* Duration badge for video */}
                                        {item.type === 'video' && (
                                            <div className="absolute bottom-1 right-1 bg-black/70 px-1 rounded text-[10px] text-white">
                                                {(() => {
                                                    const d = item.duration || 0;
                                                    const m = Math.floor(d / 60);
                                                    const s = Math.floor(d % 60);
                                                    return `${m}:${s.toString().padStart(2, '0')}`;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'audio' && (
                        <div className="space-y-4">
                            <div className="p-4 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-white/30 hover:border-blue-500/50 hover:bg-white/5 transition-all cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="audio/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            onAddToLibrary(e.target.files[0]);
                                        }
                                    }}
                                />
                                <Music size={24} />
                                <span className="text-sm">Upload Audio</span>
                            </div>

                            <div className="space-y-2">
                                {mediaLibrary.filter(item => item.type === 'audio').map(item => (
                                    <div
                                        key={item.id}
                                        className="p-3 bg-white/5 rounded-lg flex items-center gap-3 hover:bg-white/10 cursor-pointer group"
                                        onClick={() => onAddAsset('audio', { file: item.file, url: item.url, duration: item.duration || 10 })}
                                        draggable="true"
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('application/json', JSON.stringify({
                                                type: 'audio',
                                                url: item.url,
                                                name: item.name,
                                                duration: item.duration || 10
                                            }));
                                        }}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                            <Music size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate text-white">{item.name}</div>
                                            <div className="text-xs text-white/40">
                                                {(() => {
                                                    const d = item.duration || 0;
                                                    const m = Math.floor(d / 60);
                                                    const s = Math.floor(d % 60);
                                                    return `${m}:${s.toString().padStart(2, '0')}`;
                                                })()}
                                            </div>
                                        </div>
                                        <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded text-white transition-opacity">
                                            <span className="text-xs font-bold">+ Add</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'text' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => onAddAsset('text', { text: 'Add Heading', fontSize: 60, fontWeight: 'bold' })}
                                className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex flex-col items-center gap-2 transition-all"
                                draggable="true"
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                        type: 'text',
                                        text: 'Add Heading',
                                        fontSize: 60,
                                        fontWeight: 'bold'
                                    }));
                                }}
                            >
                                <span className="text-2xl font-bold">Add Heading</span>
                                <span className="text-xs text-white/40">Click or Drag to add</span>
                            </button>

                            <button
                                onClick={() => onAddAsset('text', { text: 'Add Subheading', fontSize: 40, fontWeight: 'semibold' })}
                                className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex flex-col items-center gap-2 transition-all"
                                draggable="true"
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                        type: 'text',
                                        text: 'Add Subheading',
                                        fontSize: 40,
                                        fontWeight: 'semibold'
                                    }));
                                }}
                            >
                                <span className="text-lg font-semibold">Add Subheading</span>
                            </button>

                            <button
                                onClick={() => onAddAsset('text', { text: 'Add Body Text', fontSize: 24, fontWeight: 'normal' })}
                                className="w-full p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex flex-col items-center gap-2 transition-all"
                                draggable="true"
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                        type: 'text',
                                        text: 'Add Body Text',
                                        fontSize: 24,
                                        fontWeight: 'normal'
                                    }));
                                }}
                            >
                                <span className="text-sm">Add Body Text</span>
                            </button>
                        </div>
                    )}

                    {activeTab === 'adjust' && (
                        <div className="space-y-4">
                            <button
                                onClick={() => onAddAsset('adjustment', { name: 'Adjustment Layer', duration: 5 })}
                                className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex flex-col items-center gap-2 transition-all"
                                draggable="true"
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                        type: 'adjustment',
                                        name: 'Adjustment Layer',
                                        duration: 5
                                    }));
                                }}
                            >
                                <Sliders size={24} className="text-blue-400" />
                                <span className="font-bold">Add Adjustment Layer</span>
                                <span className="text-xs text-white/40">Applies effects to tracks below</span>
                            </button>

                            <div className="w-full h-px bg-white/5 my-2" />

                            <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">Global Preview</h4>
                            <AdjustPanel
                                adjustments={adjustments}
                                onUpdate={setAdjustments}
                            />
                        </div>
                    )}

                    {activeTab === 'filters' && (
                        <FilterPanel
                            activeFilterId={activeFilterId}
                            onFilterSelect={setActiveFilterId}
                            suggestedFilter={suggestedFilter}
                            mediaUrl={mediaUrl}
                            thumbnailUrl={thumbnailUrl}
                        />
                    )}

                    {activeTab === 'effects' && (
                        <EffectsPanel
                            activeEffectId={activeEffectId}
                            onEffectSelect={setActiveEffectId}
                            intensity={effectIntensity}
                            onIntensityChange={setEffectIntensity}
                        />
                    )}

                    {activeTab === 'transitions' && (
                        <TransitionsPanel
                            activeClip={activeClip}
                            onUpdate={onUpdateClip}
                        />
                    )}

                    {activeTab === 'mask' && (
                        <MaskPanel
                            mask={mask}
                            onUpdate={onUpdateMask}
                        />
                    )}

                    {activeTab === 'templates' && (
                        <div className="flex items-center justify-center h-40 text-white/30">
                            Coming Soon
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

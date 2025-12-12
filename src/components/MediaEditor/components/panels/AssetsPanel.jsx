import React from 'react';
import { LayoutGrid, Type, Music, Image as ImageIcon, Sliders, Wand2, Sparkles } from 'lucide-react';
import { AdjustPanel } from '../AdjustPanel';
import { FilterPanel } from '../FilterPanel';
import { EffectsPanel } from '../EffectsPanel';

const TABS = [
    { id: 'media', icon: ImageIcon, label: 'Media' },
    { id: 'audio', icon: Music, label: 'Audio' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'adjust', icon: Sliders, label: 'Adjust' },
    { id: 'filters', icon: Wand2, label: 'Filters' },
    { id: 'effects', icon: Sparkles, label: 'Effects' },
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
    suggestedFilter
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
                            : 'text-white/40 hover:text-white hover:bg-white/10'
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
                            <div className="p-4 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-white/30">
                                <span>Media Library</span>
                                <span className="text-xs">Coming Soon</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'text' && (
                        <div className="space-y-2">
                            <button
                                onClick={() => onAddAsset('text', { text: 'Default Text' })}
                                className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors"
                            >
                                <span className="text-xl font-bold">Add Heading</span>
                            </button>
                            <button
                                onClick={() => onAddAsset('text', { text: 'Subheading', fontSize: 32 })}
                                className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors"
                            >
                                <span className="text-lg font-semibold">Add Subheading</span>
                            </button>
                            <button
                                onClick={() => onAddAsset('text', { text: 'Body Text', fontSize: 24 })}
                                className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors"
                            >
                                <span className="text-base">Add Body Text</span>
                            </button>
                        </div>
                    )}

                    {activeTab === 'adjust' && (
                        <AdjustPanel
                            adjustments={adjustments}
                            onUpdate={setAdjustments}
                        />
                    )}

                    {activeTab === 'filters' && (
                        <FilterPanel
                            activeFilterId={activeFilterId}
                            onFilterSelect={setActiveFilterId}
                            suggestedFilter={suggestedFilter}
                            mediaUrl={mediaUrl}
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

                    {/* Other tabs placeholders */}
                    {(activeTab === 'audio' || activeTab === 'templates') && (
                        <div className="flex items-center justify-center h-40 text-white/30">
                            Coming Soon
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

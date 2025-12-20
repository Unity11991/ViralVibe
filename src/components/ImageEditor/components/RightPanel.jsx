import React, { useState } from 'react';
import { Layers, Sliders, Settings } from 'lucide-react';

export const RightPanel = ({
    activeTab,
    onTabSelect,
    layerPanel,
    propertiesPanel
}) => {
    const tabs = [
        { id: 'layers', icon: Layers, label: 'Layers' },
        { id: 'properties', icon: Sliders, label: 'Properties' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#141414] border-l border-white/10">
            {/* Tabs Header */}
            <div className="flex items-center border-b border-white/10 bg-[#1a1a1a]">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onTabSelect(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === tab.id
                                ? 'text-white bg-[#141414] border-t-2 border-blue-500'
                                : 'text-white/40 hover:text-white hover:bg-[#141414]'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'layers' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    {layerPanel}
                </div>
                <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'properties' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    {propertiesPanel}
                </div>
            </div>
        </div>
    );
};

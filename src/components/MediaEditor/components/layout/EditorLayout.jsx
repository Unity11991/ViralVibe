import React, { useState } from 'react';
import { Layout, Layers, Settings, Clock } from 'lucide-react';

export const EditorLayout = ({
    leftPanel,
    centerPanel,
    rightPanel,
    bottomPanel,
    header
}) => {
    const [activeMobileTab, setActiveMobileTab] = useState('timeline'); // 'timeline', 'assets', 'properties'

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f12] text-white overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-white/5 flex-shrink-0">
                {header}
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Panel (Assets) */}
                {/* Desktop: Always visible. Mobile: Visible only when active tab is assets */}
                <div className={`${activeMobileTab === 'assets' ? 'flex absolute inset-0 z-20 w-full' : 'hidden'} md:relative md:flex md:w-[320px] border-r border-white/5 flex-col bg-[#1a1a1f]`}>
                    {leftPanel}
                </div>

                {/* Center Area (Preview + Timeline) */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Preview Area */}
                    {/* On mobile, hide preview if a full-screen panel is open? No, usually preview is always good to have, 
                        but if panels take full screen, we might hide it. 
                        Let's keep preview visible but maybe smaller? 
                        Actually, if 'assets' or 'properties' is open on mobile, they should probably cover the preview 
                        to give enough space for controls. 
                        
                        Current plan: 
                        - Assets/Properties take full screen on mobile (z-20 absolute inset-0).
                        - Timeline replaces bottom panel.
                        
                        So if 'assets' is active, it covers everything.
                    */}
                    <div className="flex-1 relative bg-[#0f0f12] flex items-center justify-center p-4">
                        {centerPanel}
                    </div>

                    {/* Timeline Area */}
                    {/* Desktop: Always visible. Mobile: Visible only when active tab is timeline */}
                    <div className={`${activeMobileTab === 'timeline' ? 'flex' : 'hidden'} md:flex h-[300px] border-t border-white/5 bg-[#1a1a1f] flex-col`}>
                        {bottomPanel}
                    </div>
                </div>

                {/* Right Panel (Properties) */}
                {/* Desktop: Always visible. Mobile: Visible only when active tab is properties */}
                <div className={`${activeMobileTab === 'properties' ? 'flex absolute inset-0 z-20 w-full' : 'hidden'} lg:relative lg:flex lg:w-[300px] border-l border-white/5 flex-col bg-[#1a1a1f]`}>
                    {rightPanel}
                </div>
            </div>

            {/* Mobile Navigation Bar */}
            <div className="md:hidden h-16 border-t border-white/5 bg-[#1a1a1f] flex items-center justify-around px-2 flex-shrink-0 z-30">
                <button
                    onClick={() => setActiveMobileTab('timeline')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMobileTab === 'timeline' ? 'text-blue-400 bg-white/5' : 'text-white/50'}`}
                >
                    <Clock size={20} />
                    <span className="text-xs">Timeline</span>
                </button>
                <button
                    onClick={() => setActiveMobileTab('assets')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMobileTab === 'assets' ? 'text-blue-400 bg-white/5' : 'text-white/50'}`}
                >
                    <Layers size={20} />
                    <span className="text-xs">Assets</span>
                </button>
                <button
                    onClick={() => setActiveMobileTab('properties')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMobileTab === 'properties' ? 'text-blue-400 bg-white/5' : 'text-white/50'}`}
                >
                    <Settings size={20} />
                    <span className="text-xs">Edit</span>
                </button>
            </div>
        </div>
    );
};

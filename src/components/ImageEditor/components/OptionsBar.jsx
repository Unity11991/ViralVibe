import React from 'react';
import { ChevronDown, Type, AlignLeft, AlignCenter, AlignRight, Square, Circle } from 'lucide-react';

export const OptionsBar = ({ activeTool, toolSettings, onUpdateSettings }) => {
    const renderContent = () => {
        switch (activeTool) {
            case 'move':
                return (
                    <div className="flex items-center gap-4 text-xs font-medium text-white/80">
                        <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                            <input
                                type="checkbox"
                                checked={toolSettings.autoSelect}
                                onChange={(e) => onUpdateSettings({ autoSelect: e.target.checked })}
                                className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            Auto-Select
                        </label>
                        <div className="w-px h-4 bg-white/10" />
                        <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                            <input
                                type="checkbox"
                                checked={toolSettings.showTransform}
                                onChange={(e) => onUpdateSettings({ showTransform: e.target.checked })}
                                className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            Show Transform Controls
                        </label>
                    </div>
                );
            case 'brush':
            case 'eraser':
                return (
                    <div className="flex items-center gap-4 text-xs font-medium text-white/80">
                        <div className="flex items-center gap-2">
                            <span className="text-white/40">Size:</span>
                            <div className="relative group">
                                <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10">
                                    {toolSettings.brushSize}px <ChevronDown size={12} />
                                </button>
                                {/* Dropdown would go here */}
                                <input
                                    type="range"
                                    min="1" max="100"
                                    value={toolSettings.brushSize}
                                    onChange={(e) => onUpdateSettings({ brushSize: parseInt(e.target.value) })}
                                    className="absolute top-full left-0 mt-2 w-32 hidden group-hover:block z-50"
                                />
                            </div>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="text-white/40">Opacity:</span>
                            <input
                                type="number"
                                min="0" max="100"
                                value={toolSettings.brushOpacity}
                                onChange={(e) => onUpdateSettings({ brushOpacity: parseInt(e.target.value) })}
                                className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-center focus:outline-none focus:border-blue-500"
                            />
                            <span>%</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="text-white/40">Color:</span>
                            <div
                                className="w-4 h-4 rounded-full border border-white/20 cursor-pointer"
                                style={{ backgroundColor: toolSettings.brushColor }}
                            >
                                <input
                                    type="color"
                                    value={toolSettings.brushColor}
                                    onChange={(e) => onUpdateSettings({ brushColor: e.target.value })}
                                    className="opacity-0 w-full h-full cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'text':
                return (
                    <div className="flex items-center gap-4 text-xs font-medium text-white/80">
                        <div className="flex items-center gap-2">
                            <Type size={14} />
                            <select
                                value={toolSettings.fontFamily}
                                onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
                                className="bg-transparent border-none focus:ring-0 cursor-pointer hover:text-white"
                            >
                                <option value="Inter">Inter</option>
                                <option value="Arial">Arial</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier New">Courier New</option>
                            </select>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-1">
                            <button className="p-1 hover:bg-white/10 rounded"><AlignLeft size={14} /></button>
                            <button className="p-1 hover:bg-white/10 rounded"><AlignCenter size={14} /></button>
                            <button className="p-1 hover:bg-white/10 rounded"><AlignRight size={14} /></button>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div
                            className="w-4 h-4 rounded border border-white/20 cursor-pointer"
                            style={{ backgroundColor: toolSettings.textColor }}
                        >
                            <input
                                type="color"
                                value={toolSettings.textColor}
                                onChange={(e) => onUpdateSettings({ textColor: e.target.value })}
                                className="opacity-0 w-full h-full cursor-pointer"
                            />
                        </div>
                    </div>
                );
            default:
                return <div className="text-white/40 text-xs italic">No options for this tool</div>;
        }
    };

    return (
        <div className="h-9 bg-[#1a1a1a] border-b border-white/10 flex items-center px-4 shrink-0 shadow-sm z-20">
            {renderContent()}
        </div>
    );
};

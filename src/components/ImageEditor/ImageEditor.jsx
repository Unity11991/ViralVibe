import React, { useState, useEffect } from 'react';
import { useImageEditorState } from './hooks/useImageEditorState';
import { EditorLayout } from './components/EditorLayout';
import { CanvasArea } from './components/CanvasArea';
import { SideToolbar } from './components/SideToolbar';
import { OptionsBar } from './components/OptionsBar';
import { RightPanel } from './components/RightPanel';
import { LayerPanel } from './components/LayerPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { BottomBar } from './components/BottomBar';
import { Plus, Image as ImageIcon } from 'lucide-react';

// Panels
import { AdjustmentToolsPanel } from './components/panels/AdjustmentToolsPanel';
import { FilterPanel } from './components/panels/FilterPanel';
import { DrawingPanel } from './components/panels/DrawingPanel';
import { TextPanel } from './components/panels/TextPanel';
import { StickerPanel } from './components/panels/StickerPanel';

export const ImageEditor = ({ imageFile, imageUrl, onClose }) => {
    // --- State ---
    const [activeTool, setActiveTool] = useState('move');
    const [activeRightTab, setActiveRightTab] = useState('layers');
    const [viewState, setViewState] = useState({ scale: 1, x: 0, y: 0 });

    // Tool Specific State
    const [toolSettings, setToolSettings] = useState({
        autoSelect: true,
        showTransform: true,
        brushSize: 20,
        brushOpacity: 100,
        brushColor: '#ffffff',
        fontFamily: 'Inter',
        textColor: '#ffffff'
    });

    // --- Core Logic ---
    const {
        layers,
        activeLayerId,
        setActiveLayerId,
        canvasSize,
        addLayer,
        updateLayer,
        removeLayer,
        reorderLayers,
        undo,
        redo,
        canUndo,
        canRedo,
        initializeEditor,
        isCropping,
        cropRect,
        startCrop,
        updateCropRect,
        setAspectRatio,
        cropAspectRatio,
        applyCrop,
        cancelCrop
    } = useImageEditorState();

    const activeLayer = layers.find(l => l.id === activeLayerId);

    // Initialize Canvas Hook
    // We need a ref to the canvas element, which is inside CanvasArea.
    // Since CanvasArea is a child, we can't easily pass the ref down and use the hook here.
    // The hook is currently used INSIDE CanvasArea.
    // We need to pass these props TO CanvasArea.

    // Initialize
    useEffect(() => {
        if (imageFile || imageUrl) {
            initializeEditor(imageFile || imageUrl);
        }
    }, [imageFile, imageUrl, initializeEditor]);

    // --- Handlers ---
    const handleToolSelect = (toolId) => {
        setActiveTool(toolId);
        // Auto-switch right tab based on tool?
        if (['adjust', 'filters', 'text', 'stickers'].includes(toolId)) {
            setActiveRightTab('properties');
        }
    };

    const handleUpdateSettings = (newSettings) => {
        setToolSettings(prev => ({ ...prev, ...newSettings }));
    };

    const handleCanvasClick = () => {
        // Deselect logic if needed
    };

    const handleExport = () => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'viralvibe-edit.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    };

    // --- Render Active Panel Content ---
    const renderPropertiesContent = () => {
        // activeLayer is now defined in main scope

        // If no layer selected, show generic message
        if (!activeLayer && activeTool !== 'text' && activeTool !== 'stickers' && activeTool !== 'draw') {
            return (
                <div className="p-6 text-center text-white/40 text-sm">
                    Select a layer to view properties
                </div>
            );
        }

        switch (activeTool) {
            case 'move':
                return (
                    <div className="p-6 space-y-4">
                        <div className="text-xs font-bold text-white/60 uppercase">Transform</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 p-2 rounded border border-white/10">
                                <label className="text-[10px] text-white/40 block">X</label>
                                <span className="text-sm font-mono text-white">{Math.round(activeLayer?.transform?.x || 0)}</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded border border-white/10">
                                <label className="text-[10px] text-white/40 block">Y</label>
                                <span className="text-sm font-mono text-white">{Math.round(activeLayer?.transform?.y || 0)}</span>
                            </div>
                        </div>
                    </div>
                );
            case 'adjust':
                return (
                    <div className="p-6 text-center text-white/40 text-sm">
                        Use the panel on the left to adjust settings
                    </div>
                );
            // We need to map the new tools to panels
            case 'crop':
                return <div className="p-6 text-white/60 text-sm">Crop tool coming soon</div>;
            case 'brush':
            case 'eraser':
                return (
                    <DrawingPanel
                        brushSettings={{
                            tool: activeTool,
                            size: toolSettings.brushSize,
                            color: toolSettings.brushColor
                        }}
                        onUpdate={(settings) => handleUpdateSettings({
                            brushSize: settings.size,
                            brushColor: settings.color,
                            // tool update handled by parent activeTool switch
                        })}
                    />
                );
            case 'text':
                return (
                    <TextPanel
                        onAddText={(text, style) => addLayer('text', text, { style })}
                    />
                );
            case 'shapes':
                return <div className="p-6 text-white/60 text-sm">Shape tools coming soon</div>;
            case 'hand':
            case 'zoom':
                return <div className="p-6 text-white/60 text-sm">Canvas navigation tools</div>;
            default:
                return (
                    <div className="p-6 text-center text-white/40 text-sm">
                        Select a tool to view properties
                    </div>
                );
        }
    };

    return (
        <EditorLayout
            onClose={onClose}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onExport={handleExport}
            optionsBar={
                <OptionsBar
                    activeTool={activeTool}
                    toolSettings={toolSettings}
                    onUpdateSettings={handleUpdateSettings}
                />
            }
            toolPanel={
                activeTool === 'adjust' ? (
                    <AdjustmentToolsPanel
                        activeLayer={activeLayer}
                        onUpdateLayer={updateLayer}
                        isCropping={isCropping}
                        startCrop={startCrop}
                        setAspectRatio={setAspectRatio}
                        cropAspectRatio={cropAspectRatio}
                        applyCrop={applyCrop}
                        cancelCrop={cancelCrop}
                    />
                ) : null
            }
            leftSidebar={
                <SideToolbar
                    activeTool={activeTool}
                    onSelectTool={handleToolSelect}
                />
            }
            rightSidebar={
                <RightPanel
                    activeTab={activeRightTab}
                    onTabSelect={setActiveRightTab}
                    layerPanel={
                        <LayerPanel
                            layers={layers}
                            selectedLayerId={activeLayerId}
                            onSelectLayer={setActiveLayerId}
                            onUpdateLayer={updateLayer}
                            onRemoveLayer={removeLayer}
                            onReorderLayer={reorderLayers}
                        />
                    }
                    propertiesPanel={
                        <PropertiesPanel title="Tool Properties">
                            {renderPropertiesContent()}
                        </PropertiesPanel>
                    }
                />
            }
            bottomBar={
                <BottomBar
                    scale={viewState.scale}
                    onZoomChange={(newScale) => setViewState(prev => ({ ...prev, scale: Math.max(0.1, Math.min(5, newScale)) }))}
                    onFit={() => {
                        // Reset to default fit (simplified)
                        setViewState({ scale: 0.85, x: 0, y: 0 });
                        // Ideally we'd recalculate fit based on canvas/container size, but that logic is in CanvasArea.
                        // For now, this is a "Reset"
                    }}
                    dimensions={canvasSize}
                />
            }
        >
            <div className="w-full h-full flex items-center justify-center relative">
                {layers.length > 0 ? (
                    <CanvasArea
                        layers={layers}
                        canvasSize={canvasSize}
                        activeLayerId={activeLayerId}
                        onCanvasClick={handleCanvasClick}
                        activeTool={activeTool}
                        toolSettings={toolSettings}
                        onUpdateLayer={updateLayer}
                        viewState={viewState}
                        onViewStateChange={setViewState}
                        isCropping={isCropping}
                        cropRect={cropRect}
                        onUpdateCropRect={updateCropRect}
                    />
                ) : (
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                            <ImageIcon size={40} className="text-white/40" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Start Editing</h3>
                        <p className="text-white/40 max-w-xs mx-auto">Upload an image to start creating your masterpiece.</p>
                        <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer transition-all hover:scale-105 shadow-lg shadow-blue-500/20">
                            <Plus size={20} />
                            <span>Upload Image</span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        initializeEditor(e.target.files[0]);
                                    }
                                }}
                            />
                        </label>
                    </div>
                )}
            </div>
        </EditorLayout>
    );
};

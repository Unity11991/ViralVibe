import React, { useState, useEffect, useRef } from 'react';
import { X, Download, RotateCcw, Video, Sliders, Wand2, Type, Sticker, Crop, Scissors, Upload, Monitor, Film, Palette, Zap } from 'lucide-react';
import { useMediaProcessor } from './MediaEditor/hooks/useMediaProcessor';
import { useCanvasRenderer } from './MediaEditor/hooks/useCanvasRenderer';
import { useOverlays } from './MediaEditor/hooks/useOverlays';
import { useExport } from './MediaEditor/hooks/useExport';
import { getInitialAdjustments, applyFilterPreset } from './MediaEditor/utils/filterUtils';
import { buildFilterString } from './MediaEditor/utils/canvasUtils';
import { EditorCanvas } from './MediaEditor/components/EditorCanvas';
import { VideoTimeline } from './MediaEditor/components/VideoTimeline';
import { CropOverlay } from './MediaEditor/components/CropOverlay';
import { AdjustPanel } from './MediaEditor/components/AdjustPanel';
import { FilterPanel } from './MediaEditor/components/FilterPanel';
import { EffectsPanel, EFFECTS_PRESETS } from './MediaEditor/components/EffectsPanel';
import { TextPanel } from './MediaEditor/components/TextPanel';
import { StickerPanel } from './MediaEditor/components/StickerPanel';
import { CropPanel } from './MediaEditor/components/CropPanel';
import { Button } from './MediaEditor/components/UI';

/**
 * MediaEditor - Professional Video & Image Editor
 * Rebuilt from scratch with optimized performance and responsive design
 */
const MediaEditor = ({ mediaFile: initialMediaFile, onClose, initialText, initialAdjustments, suggestedFilter, isPro = false }) => {
    // Hooks
    const {
        mediaFile,
        mediaUrl,
        mediaType,
        videoDuration,
        isLoading,
        mediaElementRef,
        loadMedia,
        isVideo
    } = useMediaProcessor();

    const {
        canvasRef,
        canvasDimensions,
        initializeCanvas,
        render
    } = useCanvasRenderer(mediaElementRef, mediaType);

    const {
        textOverlays,
        stickers,
        stickerImages,
        activeOverlayId,
        isDraggingOverlay,
        overlayRef,
        addTextOverlay,
        updateTextOverlay,
        deleteOverlay,
        addSticker,
        updateSticker,
        setActiveOverlayId,
        startDragging,
        updateOverlayPosition,
        stopDragging
    } = useOverlays();

    const {
        isExporting,
        exportProgress,
        showExportModal,
        exportSettings,
        setShowExportModal,
        setExportSettings,
        handleExport,
        cancelExport
    } = useExport(mediaElementRef, mediaType);

    // Editor State
    const [activeTab, setActiveTab] = useState('adjust');
    const [adjustments, setAdjustments] = useState(getInitialAdjustments());
    const [activeFilterId, setActiveFilterId] = useState('normal');
    const [activeEffectId, setActiveEffectId] = useState(null);
    const [effectIntensity, setEffectIntensity] = useState(50);
    const [cropPreset, setCropPreset] = useState('free');
    const [cropData, setCropData] = useState({ x: 0, y: 0, width: 100, height: 100 });
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [trimRange, setTrimRange] = useState({ start: 0, end: 0 });
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [memeMode, setMemeMode] = useState(!!initialText);

    const fileInputRef = useRef(null);
    const containerRef = useRef(null);
    const previewContainerRef = useRef(null);

    // Load initial media
    useEffect(() => {
        if (initialMediaFile) {
            loadMedia(initialMediaFile);
        }
    }, [initialMediaFile, loadMedia]);

    // Load Google Fonts
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Arimo&family=Cabin&family=Concert+One&family=Dosis&family=Fira+Sans&family=Inconsolata&family=Karla&family=Lato&family=Lora&family=Merriweather&family=Montserrat&family=Mulish&family=Noto+Sans&family=Nunito&family=Open+Sans&family=Oswald&family=Oxygen&family=PT+Sans&family=Pacifico&family=Playfair+Display&family=Poppins&family=Quicksand&family=Raleway&family=Roboto&family=Rubik&family=Slabo+27px&family=Source+Sans+Pro&family=Titillium+Web&family=Ubuntu&family=Work+Sans&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        return () => {
            document.head.removeChild(link);
        };
    }, []);

    const initialTextProcessed = useRef(false);

    // Handle Initial Text (Meme Mode)
    useEffect(() => {
        if (initialText && !initialTextProcessed.current) {
            initialTextProcessed.current = true;
            setMemeMode(true);
            setActiveTab('text');
            // Small delay to ensure canvas is ready
            setTimeout(() => {
                addTextOverlay({
                    text: initialText,
                    fontSize: 12,
                    fontFamily: 'Arial',
                    fontWeight: 'bold',
                    color: '#000000',
                    x: 50,
                    y: 12 // Slightly lower in the header to ensure visibility
                });
                setActiveOverlayId(null); // Deselect immediately to avoid ghost box
            }, 500);
        }
    }, [initialText, addTextOverlay]);

    // Initialize canvas when media loads and handle resizing
    useEffect(() => {
        if (!mediaUrl || !mediaElementRef.current || !previewContainerRef.current) return;

        const updateCanvasSize = () => {
            const container = previewContainerRef.current;
            if (!container) return;

            const mediaAspect = mediaElementRef.current.videoWidth
                ? mediaElementRef.current.videoWidth / mediaElementRef.current.videoHeight
                : mediaElementRef.current.width / mediaElementRef.current.height;

            // Use 90% of container width/height to leave some padding
            const maxWidth = container.clientWidth * 0.9;
            const maxHeight = container.clientHeight * 0.9;

            initializeCanvas(
                maxWidth,
                maxHeight,
                mediaAspect,
                memeMode ? 0.3 : 0 // 30% header if meme mode
            );
        };

        // Initial sizing
        updateCanvasSize();

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            updateCanvasSize();
        });

        resizeObserver.observe(previewContainerRef.current);

        if (isVideo) {
            setTrimRange({ start: 0, end: videoDuration });
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [mediaUrl, mediaElementRef, initializeCanvas, isVideo, videoDuration]);

    // Render loop
    useEffect(() => {
        if (!mediaUrl || !canvasRef.current) return;

        const renderState = {
            adjustments,
            vignette: adjustments.vignette,
            grain: adjustments.grain,
            textOverlays: [], // Hide text on canvas during preview (handled by HTML overlay)
            stickers,
            stickerImages,
            transform: { rotation, zoom },
            transform: { rotation, zoom },
            canvasDimensions,
            activeOverlayId,
            activeOverlayId,
            memePadding: memeMode ? 0.3 : 0,
            memePadding: memeMode ? 0.3 : 0,
            memePadding: memeMode ? 0.3 : 0,
            activeEffectId, // Pass effect ID
            effectIntensity, // Pass effect intensity
            activeFilterId // Pass filter ID for color grading
        };

        const interval = setInterval(() => {
            render(renderState, { applyFiltersToContext: false });
        }, 16); // ~60fps

        return () => clearInterval(interval);
    }, [mediaUrl, adjustments, textOverlays, stickers, stickerImages, rotation, zoom, render, canvasRef, canvasDimensions, activeEffectId, effectIntensity]);

    // Video playback handling
    useEffect(() => {
        const video = mediaElementRef.current;
        if (!video || !isVideo) return;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            if (video.currentTime >= trimRange.end) {
                video.pause();
                setIsPlaying(false);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [mediaElementRef, isVideo, trimRange]);

    // Overlay dragging
    useEffect(() => {
        const handlePointerMove = (e) => {
            if (isDraggingOverlay) {
                updateOverlayPosition(isDraggingOverlay, e.clientX, e.clientY);
            }
        };

        const handlePointerUp = () => {
            stopDragging();
        };

        if (isDraggingOverlay) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDraggingOverlay, updateOverlayPosition, stopDragging]);

    // Handlers
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            loadMedia(file);
        }
    };

    const handleFilterSelect = (filterId) => {
        setActiveFilterId(filterId);
        setAdjustments(applyFilterPreset(filterId));
    };

    const handlePlay = () => {
        if (mediaElementRef.current) {
            mediaElementRef.current.play();
            setIsPlaying(true);
        }
    };

    const handlePause = () => {
        if (mediaElementRef.current) {
            mediaElementRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleSeek = (time) => {
        if (mediaElementRef.current) {
            mediaElementRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleReset = () => {
        setAdjustments(getInitialAdjustments());
        setActiveFilterId('normal');
        setRotation(0);
        setZoom(1);
        setCropPreset('free');
        setCropData({ x: 0, y: 0, width: 100, height: 100 });
    };

    const handleCropPresetChange = (presetId) => {
        setCropPreset(presetId);

        // Define aspect ratios for presets
        const aspectRatios = {
            'free': null,
            '16:9': 16 / 9,
            '9:16': 9 / 16,
            '1:1': 1,
            '4:5': 4 / 5
        };

        const ratio = aspectRatios[presetId];

        if (ratio) {
            // Calculate crop dimensions to fit aspect ratio
            const currentAspect = cropData.width / cropData.height;

            if (ratio > currentAspect) {
                // Wider - adjust height
                const newHeight = cropData.width / ratio;
                const newY = cropData.y + (cropData.height - newHeight) / 2;
                setCropData({
                    ...cropData,
                    y: Math.max(0, newY),
                    height: Math.min(newHeight, 100 - cropData.y)
                });
            } else {
                // Taller - adjust width
                const newWidth = cropData.height * ratio;
                const newX = cropData.x + (cropData.width - newWidth) / 2;
                setCropData({
                    ...cropData,
                    x: Math.max(0, newX),
                    width: Math.min(newWidth, 100 - cropData.x)
                });
            }
        }
    };

    const handleStickerUpload = async (file) => {
        try {
            await addSticker(file);
        } catch (error) {
            alert('Failed to upload sticker');
        }
    };

    const handleEffectSelect = (effectId) => {
        setActiveEffectId(effectId);
    };

    const handleExportClick = () => {
        const renderState = {
            adjustments,
            vignette: adjustments.vignette,
            grain: adjustments.grain,
            textOverlays,
            stickers,
            stickerImages,
            transform: { crop: cropData, rotation, zoom },
            memePadding: memeMode ? 0.3 : 0,
            memePadding: memeMode ? 0.3 : 0,
            activeEffectId, // Pass effect ID
            effectIntensity // Pass effect intensity
        };

        handleExport(canvasRef, renderState, trimRange);
    };

    // Render upload screen if no media
    if (!mediaUrl) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
                <div className="max-w-md w-full p-8 bg-[#1a1a1f] rounded-3xl border border-white/10 shadow-2xl text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                        <Video size={32} className="text-blue-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Media Editor</h2>
                    <p className="text-white/50 mb-8">Upload a video or image to start editing.</p>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,video/*"
                        className="hidden"
                    />

                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="primary"
                        className="w-full"
                        icon={Upload}
                    >
                        Select File
                    </Button>

                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="w-full mt-4"
                        icon={X}
                    >
                        Close
                    </Button>
                </div>
            </div>
        );
    }

    // Main editor interface
    return (
        <div className="fixed inset-0 z-50 flex bg-black/95 backdrop-blur-xl" ref={containerRef}>
            {/* Export Modal */}
            {showExportModal && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md bg-[#1a1a1f] rounded-3xl border border-white/10 p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Export Settings</h3>
                            <button onClick={() => setShowExportModal(false)} className="text-white/50 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Resolution */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-white/70">
                                    <Monitor size={16} /> Resolution
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['HD', '2K', '4K'].map(res => {
                                        const isLocked = res === '4K' && !isPro;
                                        return (
                                            <button
                                                key={res}
                                                onClick={() => {
                                                    if (isLocked) {
                                                        alert("Upgrade to Pro to export in 4K!");
                                                        return;
                                                    }
                                                    setExportSettings(s => ({ ...s, resolution: res }))
                                                }}
                                                className={`py-2 rounded-xl border text-sm font-bold transition-all relative ${exportSettings.resolution === res
                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                    : isLocked
                                                        ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
                                                        : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                                                    }`}
                                            >
                                                {res}
                                                {isLocked && (
                                                    <div className="absolute -top-2 -right-2 bg-yellow-500 text-black p-1 rounded-full">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {isVideo && (
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm font-medium text-white/70">
                                        <Film size={16} /> Frame Rate
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[24, 30, 60].map(fps => (
                                            <button
                                                key={fps}
                                                onClick={() => setExportSettings(s => ({ ...s, fps }))}
                                                className={`py-2 rounded-xl border text-sm font-bold transition-all ${exportSettings.fps === fps
                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                    : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                                                    }`}
                                            >
                                                {fps} FPS
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={handleExportClick}
                                variant="primary"
                                className="w-full"
                                icon={Download}
                            >
                                Start Export
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Progress */}
            {isExporting && (
                <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2">Exporting...</h3>
                    <p className="text-white/50 mb-6">Please wait while we process your media.</p>
                    <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mb-8">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${exportProgress}%` }}
                        />
                    </div>
                    <p className="text-blue-400 font-mono mb-8">{Math.round(exportProgress)}%</p>
                    <Button onClick={cancelExport} variant="secondary" icon={X}>
                        Cancel
                    </Button>
                </div>
            )}

            {/* Main Layout */}
            <div className="flex flex-col md:flex-row w-full h-full">
                {/* Left: Preview */}
                <div className="flex-1 flex flex-col bg-[#0f0f12] relative">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <Video size={20} className="text-blue-500" />
                            <h2 className="text-lg font-bold text-white">Media Editor</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={handleReset} variant="ghost" size="sm" icon={RotateCcw}>
                                Reset
                            </Button>
                            <Button onClick={() => setShowExportModal(true)} variant="primary" size="sm" icon={Download}>
                                Export
                            </Button>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 p-4 overflow-hidden relative flex items-center justify-center" ref={previewContainerRef}>
                        <div className="relative flex items-center justify-center">
                            <EditorCanvas
                                canvasRef={canvasRef}
                                overlayRef={overlayRef}
                                textOverlays={textOverlays}
                                stickers={stickers}
                                stickerImages={stickerImages}
                                activeOverlayId={activeOverlayId}
                                onOverlayPointerDown={(e, id) => {
                                    e.stopPropagation();
                                    startDragging(id);
                                }}
                                onUpdateText={updateTextOverlay}
                                onDeleteOverlay={deleteOverlay}
                                onBackgroundClick={() => setActiveOverlayId(null)}
                                filterString={buildFilterString(adjustments)}
                            />
                            <CropOverlay
                                canvasRef={canvasRef}
                                cropData={cropData}
                                onCropChange={setCropData}
                                aspectRatio={cropPreset === 'free' ? null : cropPreset === '16:9' ? 16 / 9 : cropPreset === '9:16' ? 9 / 16 : cropPreset === '1:1' ? 1 : cropPreset === '4:5' ? 4 / 5 : null}
                                isActive={activeTab === 'crop'}
                            />
                        </div>
                    </div>

                    {/* Video Timeline */}
                    {isVideo && (
                        <VideoTimeline
                            videoRef={mediaElementRef}
                            duration={videoDuration}
                            currentTime={currentTime}
                            isPlaying={isPlaying}
                            trimRange={trimRange}
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onSeek={handleSeek}
                            onTrimChange={setTrimRange}
                        />
                    )}
                </div>

                {/* Right: Tools */}
                <div className="w-full h-[45vh] md:h-full md:w-[400px] bg-[#1a1a1f] border-t md:border-t-0 md:border-l border-white/5 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex p-2 gap-2 border-b border-white/5 overflow-x-auto">
                        {[
                            { id: 'adjust', icon: Sliders, label: 'Adjust' },
                            { id: 'filters', icon: Wand2, label: 'Filters' },
                            { id: 'effects', icon: Zap, label: 'Effects' },
                            { id: 'text', icon: Type, label: 'Text' },
                            { id: 'stickers', icon: Sticker, label: 'Stickers' },
                            { id: 'crop', icon: Crop, label: 'Crop' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-white/10 text-white shadow-lg'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {activeTab === 'adjust' && (
                            <AdjustPanel
                                adjustments={adjustments}
                                onUpdate={setAdjustments}
                                aiSuggestions={initialAdjustments}
                            />
                        )}
                        {activeTab === 'filters' && (
                            <FilterPanel
                                activeFilterId={activeFilterId}
                                onFilterSelect={handleFilterSelect}
                                suggestedFilter={suggestedFilter}
                            />
                        )}
                        {activeTab === 'effects' && (
                            <EffectsPanel
                                activeEffectId={activeEffectId}
                                onEffectSelect={handleEffectSelect}
                                intensity={effectIntensity}
                                onIntensityChange={setEffectIntensity}
                            />
                        )}
                        {activeTab === 'text' && (
                            <TextPanel
                                textOverlays={textOverlays}
                                activeOverlayId={activeOverlayId}
                                onAddText={addTextOverlay}
                                onUpdateText={updateTextOverlay}
                                onDeleteText={deleteOverlay}
                            />
                        )}
                        {activeTab === 'stickers' && (
                            <StickerPanel
                                stickers={stickers}
                                activeOverlayId={activeOverlayId}
                                onUploadSticker={handleStickerUpload}
                                onUpdateSticker={updateSticker}
                                onDeleteSticker={deleteOverlay}
                            />
                        )}
                        {activeTab === 'crop' && (
                            <CropPanel
                                cropPreset={cropPreset}
                                rotation={rotation}
                                zoom={zoom}
                                onCropPresetChange={handleCropPresetChange}
                                onRotationChange={setRotation}
                                onZoomChange={setZoom}
                                onReset={handleReset}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                @keyframes slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default MediaEditor;

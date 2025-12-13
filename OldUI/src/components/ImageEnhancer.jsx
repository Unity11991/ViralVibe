import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Download, Upload, ArrowLeftRight, Wand2, Sliders } from 'lucide-react';

const ImageEnhancer = ({ onClose }) => {
    const [image, setImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [enhancedUrl, setEnhancedUrl] = useState(null);
    const [showComparison, setShowComparison] = useState(false);
    const [sliderPosition, setSliderPosition] = useState(50);
    const [settings, setSettings] = useState({
        brightness: 1.1,
        contrast: 1.1,
        saturation: 1.2,
        sharpen: 1
    });

    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setImage(file);
            setPreviewUrl(url);
            setEnhancedUrl(null);
            setShowComparison(false);
        }
    };

    const applyEnhancement = async () => {
        if (!image || !previewUrl) return;

        setIsProcessing(true);

        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw original
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Apply simple enhancement filters (simulating AI)
            // 1. Contrast & Brightness
            const contrast = settings.contrast; // 1.1
            const brightness = settings.brightness; // 1.1
            const saturation = settings.saturation; // 1.2

            for (let i = 0; i < data.length; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                // Brightness
                r *= brightness;
                g *= brightness;
                b *= brightness;

                // Contrast
                r = ((r - 128) * contrast) + 128;
                g = ((g - 128) * contrast) + 128;
                b = ((b - 128) * contrast) + 128;

                // Saturation
                const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
                r = gray + (r - gray) * saturation;
                g = gray + (g - gray) * saturation;
                b = gray + (b - gray) * saturation;

                // Clamp values
                data[i] = Math.min(255, Math.max(0, r));
                data[i + 1] = Math.min(255, Math.max(0, g));
                data[i + 2] = Math.min(255, Math.max(0, b));
            }

            ctx.putImageData(imageData, 0, 0);

            // Simple Sharpening (Convolution) - Optional, keeping it simple for now

            setEnhancedUrl(canvas.toDataURL('image/png'));
            setIsProcessing(false);
            setShowComparison(true);
        };

        img.src = previewUrl;
    };

    const handleDownload = () => {
        if (!enhancedUrl) return;
        const link = document.createElement('a');
        link.href = enhancedUrl;
        link.download = 'enhanced-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSliderChange = (clientX) => {
        // Calculate percentage based on click/drag position
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        setSliderPosition(percentage);
    };

    const handleInteraction = (e) => {
        let clientX;
        if (e.type === 'touchmove' || e.type === 'touchstart') {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }
        handleSliderChange(clientX);
    };

    // Mouse move handler for slider
    const handleMouseMove = (e) => {
        if (e.buttons === 1) { // Left mouse button pressed
            handleInteraction(e);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4">
            <div className="w-full max-w-6xl h-[90vh] bg-[#0f0f12] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Sparkles className="text-purple-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">AI Image Enhancer</h2>
                            <p className="text-white/50 text-sm">Upscale and improve image quality instantly</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col-reverse lg:flex-row overflow-hidden">

                    {/* Left Sidebar - Controls */}
                    <div className="w-full lg:w-80 h-auto lg:h-full border-t lg:border-t-0 lg:border-r border-white/5 p-6 flex flex-col gap-6 bg-[#131316] shrink-0 overflow-y-auto custom-scrollbar z-10">

                        {!image ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/10 rounded-2xl p-8 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="text-white/50 group-hover:text-purple-400" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Upload Image</h3>
                                <p className="text-white/40 text-sm">Drag & drop or click to browse</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-medium flex items-center gap-2">
                                            <Sliders size={16} className="text-purple-400" />
                                            Enhancement Level
                                        </h3>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Brightness</label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="1.5"
                                                step="0.1"
                                                value={settings.brightness}
                                                onChange={(e) => setSettings({ ...settings, brightness: parseFloat(e.target.value) })}
                                                className="w-full accent-purple-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Contrast</label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="1.5"
                                                step="0.1"
                                                value={settings.contrast}
                                                onChange={(e) => setSettings({ ...settings, contrast: parseFloat(e.target.value) })}
                                                className="w-full accent-purple-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Saturation</label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="2"
                                                step="0.1"
                                                value={settings.saturation}
                                                onChange={(e) => setSettings({ ...settings, saturation: parseFloat(e.target.value) })}
                                                className="w-full accent-purple-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <button
                                        onClick={applyEnhancement}
                                        disabled={isProcessing}
                                        className={`
                                            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
                                            ${isProcessing
                                                ? 'bg-white/5 text-white/50 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02]'
                                            }
                                        `}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Enhancing...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 size={20} />
                                                Magic Enhance
                                            </>
                                        )}
                                    </button>
                                </div>

                                {enhancedUrl && (
                                    <button
                                        onClick={handleDownload}
                                        className="w-full py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Download size={20} />
                                        Download Result
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        setImage(null);
                                        setPreviewUrl(null);
                                        setEnhancedUrl(null);
                                    }}
                                    className="text-sm text-white/40 hover:text-white transition-colors text-center w-full mt-2"
                                >
                                    Start Over
                                </button>
                            </>
                        )}
                    </div>

                    {/* Right Area - Canvas/Preview */}
                    <div className="flex-1 bg-[#0a0a0c] relative flex items-center justify-center p-4 lg:p-8 overflow-hidden min-h-[300px]">

                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        </div>

                        {!previewUrl ? (
                            <div className="text-center text-white/20">
                                <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No image selected</p>
                            </div>
                        ) : (
                            <div
                                className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden select-none"
                                ref={containerRef}
                                onMouseMove={showComparison ? handleMouseMove : undefined}
                                onTouchMove={showComparison ? handleInteraction : undefined}
                                onClick={showComparison ? (e) => handleInteraction(e) : undefined}
                                onTouchStart={showComparison ? handleInteraction : undefined}
                            >
                                {/* Base Image (Original or Enhanced based on state) */}
                                <img
                                    src={showComparison ? previewUrl : (enhancedUrl || previewUrl)}
                                    alt="Preview"
                                    className="max-w-full max-h-[80vh] object-contain block"
                                />

                                {/* Comparison Overlay */}
                                {showComparison && enhancedUrl && (
                                    <div
                                        className="absolute inset-0 overflow-hidden border-r-2 border-white shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                        style={{ width: `${sliderPosition}%` }}
                                    >
                                        <img
                                            src={enhancedUrl}
                                            alt="Enhanced"
                                            className="max-w-none h-full object-cover"
                                            style={{
                                                width: containerRef.current?.getBoundingClientRect().width,
                                                height: containerRef.current?.getBoundingClientRect().height
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Slider Handle */}
                                {showComparison && enhancedUrl && (
                                    <div
                                        className="absolute inset-y-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10"
                                        style={{ left: `${sliderPosition}%` }}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform -translate-x-1/2">
                                            <ArrowLeftRight size={16} />
                                        </div>
                                    </div>
                                )}

                                {/* Labels */}
                                {showComparison && enhancedUrl && (
                                    <>
                                        <div className="absolute top-4 left-4 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none z-20">
                                            Enhanced
                                        </div>
                                        <div className="absolute top-4 right-4 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none z-20">
                                            Original
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEnhancer;

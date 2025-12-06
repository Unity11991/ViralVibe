import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { X, Play, Pause, RotateCcw, Check, Sliders, Scissors, Crop, Download, Upload, Video, ChevronDown, ChevronRight, Wand2, Settings, Monitor, Film, Palette } from 'lucide-react';
import { FILTER_PRESETS } from '../utils/filterPresets';

const MediaEditor = ({ mediaFile, onClose }) => {
    const [activeTab, setActiveTab] = useState('adjust'); // 'adjust', 'filters', 'trim', 'crop'
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // --- Export State ---
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportSettings, setExportSettings] = useState({
        resolution: 'HD', // HD, 2K, 4K
        fps: 30,          // 24, 30, 60
        color: 'SDR'      // SDR, HDR
    });

    // --- Adjustment State ---
    const initialAdjustments = {
        // Light
        exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, brightness: 0,
        // Color
        saturation: 0, vibrance: 0, temp: 0, tint: 0,
        // HSL
        hue: 0, hslSaturation: 0, hslLightness: 0,
        // Effects
        clarity: 0, sepia: 0, grayscale: 0,
        // Style
        sharpen: 0, blur: 0, vignette: 0, grain: 0, fade: 0
    };

    const [adjustments, setAdjustments] = useState(initialAdjustments);
    const [activeFilterId, setActiveFilterId] = useState('normal');

    const [expandedSections, setExpandedSections] = useState({
        light: true,
        color: true,
        hsl: false,
        effects: false,
        style: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // --- Trim State ---
    const [trimRange, setTrimRange] = useState({ start: 0, end: 0 });
    const [isDraggingTrim, setIsDraggingTrim] = useState(null); // 'start' | 'end' | null
    const trimTrackRef = useRef(null);

    // --- Crop State ---
    const cropperRef = useRef(null);
    const [cropPreset, setCropPreset] = useState('original'); // 'original', '16:9', etc.
    const [videoPoster, setVideoPoster] = useState(null); // For video cropping
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);

    const videoRef = useRef(null);
    const [localMediaFile, setLocalMediaFile] = useState(mediaFile);
    const fileInputRef = useRef(null);

    const isExportingRef = useRef(false);
    const mediaRecorderRef = useRef(null);

    // --- Initialization ---
    useEffect(() => {
        if (mediaFile) {
            setLocalMediaFile(mediaFile);
        }
    }, [mediaFile]);

    const [mediaUrl, setMediaUrl] = useState(null);
    const isVideo = localMediaFile?.type?.startsWith('video/');

    useEffect(() => {
        if (localMediaFile) {
            const url = URL.createObjectURL(localMediaFile);
            setMediaUrl(url);

            // Generate poster for video cropping
            if (localMediaFile.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = url;
                video.currentTime = 0.1; // Capture first frame
                video.onloadeddata = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0);
                    setVideoPoster(canvas.toDataURL());
                };
            } else {
                setVideoPoster(null);
            }

            return () => URL.revokeObjectURL(url);
        }
    }, [localMediaFile]);

    // --- File Upload Handler ---
    // --- File Upload Handler ---
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setLocalMediaFile(file);
            // Reset value to allow selecting the same file again
            e.target.value = '';
        }
    };

    // --- Filter Application ---
    const applyFilter = (filter) => {
        setActiveFilterId(filter.id);
        setAdjustments(prev => ({
            ...initialAdjustments, // Reset base adjustments
            ...filter.values // Apply preset values
        }));
    };

    // --- Video Handlers ---
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setTrimRange({ start: 0, end: videoRef.current.duration });
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            // Loop trim range
            if (!isExportingRef.current && videoRef.current.currentTime >= trimRange.end) {
                videoRef.current.currentTime = trimRange.start;
                videoRef.current.play();
            }
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // --- Filter Logic (CSS Approximation) ---
    const getFilterString = () => {
        // Base values (100% or 0deg)
        let b = 100; // Brightness
        let c = 100; // Contrast
        let s = 100; // Saturation
        let h = 0;   // Hue Rotate
        let sep = 0; // Sepia
        let g = 0;   // Grayscale
        let blur = 0; // Blur (Noise Reduction)
        let op = 100; // Opacity (Fade)

        // Light
        b += adjustments.brightness + adjustments.exposure + (adjustments.whites / 2) - (adjustments.blacks / 2);
        c += adjustments.contrast + (adjustments.clarity / 2);
        b += adjustments.highlights / 3;
        b += adjustments.shadows / 3;

        // Color
        s += adjustments.saturation + adjustments.vibrance + adjustments.hslSaturation;

        // Temp/Tint
        if (adjustments.temp > 0) {
            sep += adjustments.temp / 2;
            h += adjustments.temp / 5;
        } else {
            h += adjustments.temp / 2;
        }
        h += adjustments.tint;
        h += adjustments.hue;

        // HSL Lightness
        b += adjustments.hslLightness;

        // Effects
        sep += adjustments.sepia;
        g += adjustments.grayscale;

        // Style
        blur += adjustments.blur / 10; // Scale down blur

        // Fade logic: Reduce contrast and lift brightness slightly, or reduce opacity
        if (adjustments.fade > 0) {
            c -= adjustments.fade / 2;
            b += adjustments.fade / 5;
        }

        let filterStr = `
            brightness(${Math.max(0, b)}%) 
            contrast(${Math.max(0, c)}%) 
            saturate(${Math.max(0, s)}%) 
            sepia(${Math.min(100, Math.max(0, sep))}%) 
            grayscale(${Math.min(100, Math.max(0, g))}%)
            hue-rotate(${h}deg)
            blur(${blur}px)
        `;

        // Append SVG filters if active
        if (adjustments.sharpen > 0) {
            filterStr += ` url(#sharpen)`;
        }

        return filterStr;
    };

    const handleCropPresetChange = (preset) => {
        setCropPreset(preset);
        let newAspect;
        switch (preset) {
            case '16:9': newAspect = 16 / 9; break;
            case '9:16': newAspect = 9 / 16; break;
            case '1:1': newAspect = 1; break;
            case '4:5': newAspect = 4 / 5; break;
            case 'original': newAspect = NaN; break; // NaN for Free/Original in cropperjs
            default: newAspect = NaN;
        }

        if (cropperRef.current && cropperRef.current.cropper) {
            cropperRef.current.cropper.setAspectRatio(newAspect);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Trimmer Interaction ---
    const handleTrimPointerDown = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingTrim(type);

        // Pause video while trimming
        if (isPlaying && videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (!isDraggingTrim || !trimTrackRef.current) return;

            const rect = trimTrackRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const percentage = x / rect.width;
            const time = percentage * duration;

            setTrimRange(prev => {
                if (isDraggingTrim === 'start') {
                    const newStart = Math.min(time, prev.end - 0.5); // Min 0.5s duration
                    if (videoRef.current) videoRef.current.currentTime = newStart;
                    setCurrentTime(newStart);
                    return { ...prev, start: newStart };
                } else {
                    const newEnd = Math.max(time, prev.start + 0.5);
                    if (videoRef.current) videoRef.current.currentTime = newEnd;
                    setCurrentTime(newEnd);
                    return { ...prev, end: newEnd };
                }
            });
        };

        const handlePointerUp = () => {
            setIsDraggingTrim(null);
        };

        if (isDraggingTrim) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDraggingTrim, duration]);

    // --- Export Logic ---
    const handleExport = async () => {
        setShowExportModal(false);
        setIsExporting(true);
        isExportingRef.current = true;
        setExportProgress(0);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!isVideo) {
                // Image Export using Cropper's built-in method
                if (cropperRef.current && cropperRef.current.cropper) {
                    const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas({
                        maxWidth: 4096,
                        maxHeight: 4096,
                        fillColor: '#000000', // Fill transparent areas if any
                        imageSmoothingEnabled: true,
                        imageSmoothingQuality: 'high',
                    });

                    canvas.width = croppedCanvas.width;
                    canvas.height = croppedCanvas.height;

                    // Apply filters
                    ctx.filter = getFilterString();
                    ctx.drawImage(croppedCanvas, 0, 0);

                    // Apply Vignette
                    if (adjustments.vignette > 0) {
                        const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.2, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
                        gradient.addColorStop(0, 'rgba(0,0,0,0)');
                        gradient.addColorStop(1, `rgba(0,0,0,${adjustments.vignette / 100})`);
                        ctx.fillStyle = gradient;
                        ctx.globalCompositeOperation = 'multiply';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.globalCompositeOperation = 'source-over';
                    }

                    // Apply Grain
                    if (adjustments.grain > 0) {
                        const noiseCanvas = document.createElement('canvas');
                        noiseCanvas.width = 200;
                        noiseCanvas.height = 200;
                        const noiseCtx = noiseCanvas.getContext('2d');

                        const idata = noiseCtx.createImageData(200, 200);
                        const buffer32 = new Uint32Array(idata.data.buffer);
                        for (let i = 0; i < buffer32.length; i++) {
                            if (Math.random() < 0.5) buffer32[i] = 0xff000000;
                        }
                        noiseCtx.putImageData(idata, 0, 0);

                        const pattern = ctx.createPattern(noiseCanvas, 'repeat');
                        ctx.fillStyle = pattern;
                        ctx.globalAlpha = adjustments.grain / 100 * 0.5;
                        ctx.globalCompositeOperation = 'overlay';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.globalAlpha = 1.0;
                        ctx.globalCompositeOperation = 'source-over';
                    }

                    const url = canvas.toDataURL('image/png', 0.9);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `govyral_export_${Date.now()}.png`;
                    a.click();
                    setIsExporting(false);
                    isExportingRef.current = false;
                    return;
                }
            }

            // Video Export
            const video = videoRef.current;

            // Get crop data from cropper (applied to the poster)
            let cropData = null;
            if (cropperRef.current && cropperRef.current.cropper) {
                cropData = cropperRef.current.cropper.getData();
            }

            // Set Resolution
            let width = video.videoWidth;
            let height = video.videoHeight;

            if (exportSettings.resolution === 'HD') {
                width = 1920; height = 1080;
            } else if (exportSettings.resolution === '2K') {
                width = 2560; height = 1440;
            } else if (exportSettings.resolution === '4K') {
                width = 3840; height = 2160;
            }

            // Determine Source Rect (Crop)
            let srcX = 0, srcY = 0, srcW = video.videoWidth, srcH = video.videoHeight;

            if (cropData) {
                srcX = cropData.x;
                srcY = cropData.y;
                srcW = cropData.width;
                srcH = cropData.height;
            }

            // Determine Destination Size (Fit to Resolution while maintaining aspect)
            const cropAspect = srcW / srcH;
            let targetW = width;
            let targetH = height;

            if (exportSettings.resolution !== 'Original') {
                if (cropAspect > (width / height)) {
                    targetH = width / cropAspect;
                } else {
                    targetW = height * cropAspect;
                }
            } else {
                targetW = srcW;
                targetH = srcH;
            }

            canvas.width = targetW;
            canvas.height = targetH;

            // Setup MediaRecorder
            const stream = canvas.captureStream(exportSettings.fps);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: exportSettings.resolution === '4K' ? 25000000 : 8000000
            });
            mediaRecorderRef.current = mediaRecorder;

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                if (!isExportingRef.current) return; // Cancelled

                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `govyral_export_${Date.now()}.webm`;
                a.click();
                setIsExporting(false);
                isExportingRef.current = false;
            };

            mediaRecorder.start();

            // Playback and Record
            video.currentTime = trimRange.start;
            video.play();

            // Pre-generate noise canvas for video
            let noisePattern = null;
            if (adjustments.grain > 0) {
                const noiseCanvas = document.createElement('canvas');
                noiseCanvas.width = 200;
                noiseCanvas.height = 200;
                const noiseCtx = noiseCanvas.getContext('2d');
                const idata = noiseCtx.createImageData(200, 200);
                const buffer32 = new Uint32Array(idata.data.buffer);
                for (let i = 0; i < buffer32.length; i++) {
                    if (Math.random() < 0.5) buffer32[i] = 0xff000000;
                }
                noiseCtx.putImageData(idata, 0, 0);
                noisePattern = ctx.createPattern(noiseCanvas, 'repeat');
            }

            const processFrame = () => {
                if (video.currentTime >= trimRange.end || video.paused) {
                    mediaRecorder.stop();
                    video.pause();
                    return;
                }

                // Apply Filters
                ctx.filter = getFilterString();

                // Draw cropped video frame
                ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

                // Apply Vignette
                if (adjustments.vignette > 0) {
                    const gradient = ctx.createRadialGradient(targetW / 2, targetH / 2, targetW * 0.2, targetW / 2, targetH / 2, targetW * 0.8);
                    gradient.addColorStop(0, 'rgba(0,0,0,0)');
                    gradient.addColorStop(1, `rgba(0,0,0,${adjustments.vignette / 100})`);
                    ctx.fillStyle = gradient;
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.fillRect(0, 0, targetW, targetH);
                    ctx.globalCompositeOperation = 'source-over';
                }

                // Apply Grain
                if (adjustments.grain > 0 && noisePattern) {
                    ctx.fillStyle = noisePattern;
                    ctx.globalAlpha = adjustments.grain / 100 * 0.5;
                    ctx.globalCompositeOperation = 'overlay';
                    ctx.fillRect(0, 0, targetW, targetH);
                    ctx.globalAlpha = 1.0;
                    ctx.globalCompositeOperation = 'source-over';
                }

                // Update Progress
                const progress = ((video.currentTime - trimRange.start) / (trimRange.end - trimRange.start)) * 100;
                setExportProgress(Math.min(100, progress));

                requestAnimationFrame(processFrame);
            };

            processFrame();

        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed. Please try a lower resolution.");
            setIsExporting(false);
            isExportingRef.current = false;
        }
    };

    const handleCancelExport = () => {
        isExportingRef.current = false;
        setIsExporting(false);
        if (videoRef.current) videoRef.current.pause();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };


    // --- Render Upload Screen ---
    if (!localMediaFile) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in p-4">
                <div className="w-full max-w-md bg-[#1a1a1f] rounded-3xl border border-white/10 p-8 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

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

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Upload size={20} />
                        Select File
                    </button>
                </div>
            </div>
        );
    }

    // Show loader if mediaUrl is not ready yet
    if (!mediaUrl) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    // --- Render Editor ---
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in p-0 md:p-8">

            {/* SVG Filters Definition */}
            <svg className="hidden">
                <defs>
                    <filter id="sharpen">
                        <feConvolveMatrix
                            order="3"
                            preserveAlpha="true"
                            kernelMatrix={`
                                0 -${adjustments.sharpen / 100} 0
                                -${adjustments.sharpen / 100} ${1 + (4 * (adjustments.sharpen / 100))} -${adjustments.sharpen / 100}
                                0 -${adjustments.sharpen / 100} 0
                            `}
                        />
                    </filter>
                </defs>
            </svg>

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
                                    {['HD', '2K', '4K'].map(res => (
                                        <button
                                            key={res}
                                            onClick={() => setExportSettings(s => ({ ...s, resolution: res }))}
                                            className={`py-2 rounded-xl border text-sm font-bold transition-all ${exportSettings.resolution === res
                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                                                }`}
                                        >
                                            {res}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Frame Rate */}
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

                            {/* Color */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-white/70">
                                    <Palette size={16} /> Color Profile
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['SDR', 'HDR'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setExportSettings(s => ({ ...s, color }))}
                                            className={`py-2 rounded-xl border text-sm font-bold transition-all ${exportSettings.color === color
                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                                                }`}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleExport}
                                className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-xl mt-4"
                            >
                                <Download size={20} />
                                Start Export
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Progress Overlay */}
            {isExporting && (
                <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                    <h3 className="text-2xl font-bold text-white mb-2">Exporting Video...</h3>
                    <p className="text-white/50 mb-6">Please wait while we render your masterpiece.</p>
                    <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mb-8">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${exportProgress}%` }}
                        ></div>
                    </div>
                    <p className="text-blue-400 font-mono mb-8">{Math.round(exportProgress)}%</p>

                    <button
                        onClick={handleCancelExport}
                        className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-2"
                    >
                        <X size={16} />
                        Cancel
                    </button>
                </div>
            )}


            <div className="w-full max-w-6xl h-[100dvh] md:h-[90vh] flex flex-col md:flex-row bg-[#0f0f12] rounded-none md:rounded-3xl overflow-hidden border-0 md:border border-white/10 shadow-2xl relative">

                {/* Close Button (Moved to top-right of container) */}


                {/* Left: Preview Area */}
                <div className="flex-none h-[50vh] md:h-auto md:flex-1 relative flex items-center justify-center bg-black/50 p-4 md:p-8 overflow-hidden group border-b border-white/10 md:border-b-0">


                    <div className="relative w-full h-full flex items-center justify-center bg-black/50">

                        {/* Close Button (Moved to top-right of Preview Area) */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white transition-all z-50 border border-white/10 shadow-xl"
                        >
                            <X size={20} />
                        </button>

                        {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center z-0">
                                <video
                                    ref={videoRef}
                                    src={mediaUrl}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain'
                                    }}
                                    className="pointer-events-none"
                                />
                            </div>
                        )}

                        <div className={`relative w-full h-full z-10 ${isVideo ? 'opacity-80' : ''}`}>
                            <Cropper
                                src={isVideo ? videoPoster : mediaUrl}
                                style={{ height: '100%', width: '100%' }}
                                initialAspectRatio={NaN}
                                guides={true}
                                ref={cropperRef}
                                viewMode={1}
                                dragMode="move"
                                scalable={true}
                                cropBoxMovable={true}
                                cropBoxResizable={true}
                                background={!isVideo}
                                autoCropArea={1}
                                checkCrossOrigin={false}
                            />

                            {/* Vignette Overlay */}
                            <div
                                className="absolute inset-0 pointer-events-none z-20"
                                style={{
                                    background: 'radial-gradient(circle, transparent 50%, black 140%)',
                                    opacity: adjustments.vignette / 100,
                                    mixBlendMode: 'multiply'
                                }}
                            />

                            {/* Grain Overlay */}
                            <div
                                className="absolute inset-0 pointer-events-none z-20"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
                                    opacity: adjustments.grain / 100,
                                    mixBlendMode: 'overlay'
                                }}
                            />

                            {/* Dynamic Style for Filters */}
                            <style>{`
                                .cropper-view-box img, .cropper-canvas img {
                                    filter: ${getFilterString()} !important;
                                    transition: filter 0.2s ease;
                                }
                            `}</style>
                        </div>
                    </div>

                    {/* Video Controls (Bottom of Preview) */}
                    {isVideo && (
                        <div className="absolute bottom-8 left-8 right-8 flex items-center gap-4 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                            <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                            </button>
                            <span className="text-xs font-mono text-white/70 min-w-[80px]">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full relative"
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Tools Panel */}
                <div className="flex-1 md:flex-none w-full md:w-[400px] bg-[#1a1a1f] border-l border-white/5 flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 mb-0.5">
                                <Video size={20} className="text-blue-500" />
                                Media Editor
                            </h2>
                            <p className="text-xs md:text-sm text-white/40">Adjust and enhance</p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Mobile Export Button */}
                            <button
                                onClick={() => setShowExportModal(true)}
                                className="md:hidden px-3 py-1.5 bg-white text-black rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
                            >
                                <Download size={14} />
                                Export
                            </button>

                            <button
                                onClick={() => {
                                    setAdjustments(initialAdjustments);
                                    setActiveFilterId('normal');
                                    handleCropPresetChange('original');
                                    setCrop({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
                                }}
                                className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors"
                                title="Reset All"
                            >
                                <RotateCcw size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-2 gap-2 border-b border-white/5 overflow-x-auto custom-scrollbar">
                        {[
                            { id: 'adjust', icon: Sliders, label: 'Adjust' },
                            { id: 'filters', icon: Wand2, label: 'Filters' },
                            { id: 'trim', icon: Scissors, label: 'Trim', disabled: !isVideo },
                            { id: 'crop', icon: Crop, label: 'Crop' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                                disabled={tab.disabled}
                                className={`
                                    flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                                    ${activeTab === tab.id
                                        ? 'bg-white/10 text-white shadow-lg'
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }
                                    ${tab.disabled ? 'opacity-30 cursor-not-allowed' : ''}
                                `}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                        {/* Adjust Tab */}
                        {activeTab === 'adjust' && (
                            <div className="space-y-4 animate-slide-up">

                                {/* Light Section */}
                                <div className="space-y-4">
                                    <button
                                        onClick={() => toggleSection('light')}
                                        className="w-full flex items-center justify-between text-sm font-bold text-white/80 hover:text-white"
                                    >
                                        <span>Light</span>
                                        {expandedSections.light ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {expandedSections.light && (
                                        <div className="space-y-4 pl-2 border-l border-white/5">
                                            {[
                                                { label: 'Exposure', key: 'exposure', min: -100, max: 100 },
                                                { label: 'Contrast', key: 'contrast', min: -100, max: 100 },
                                                { label: 'Brightness', key: 'brightness', min: -100, max: 100 },
                                                { label: 'Highlights', key: 'highlights', min: -100, max: 100 },
                                                { label: 'Shadows', key: 'shadows', min: -100, max: 100 },
                                                { label: 'Whites', key: 'whites', min: -100, max: 100 },
                                                { label: 'Blacks', key: 'blacks', min: -100, max: 100 },
                                            ].map((adj) => (
                                                <div key={adj.key} className="space-y-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-white/60">{adj.label}</span>
                                                        <span className="text-blue-400 font-mono">{adjustments[adj.key]}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={adj.min}
                                                        max={adj.max}
                                                        value={adjustments[adj.key]}
                                                        onChange={(e) => setAdjustments({ ...adjustments, [adj.key]: Number(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Color Section */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => toggleSection('color')}
                                        className="w-full flex items-center justify-between text-sm font-bold text-white/80 hover:text-white"
                                    >
                                        <span>Color</span>
                                        {expandedSections.color ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {expandedSections.color && (
                                        <div className="space-y-4 pl-2 border-l border-white/5">
                                            {[
                                                { label: 'Saturation', key: 'saturation', min: -100, max: 100 },
                                                { label: 'Vibrance', key: 'vibrance', min: -100, max: 100 },
                                                { label: 'Temp', key: 'temp', min: -100, max: 100 },
                                                { label: 'Tint', key: 'tint', min: -100, max: 100 },
                                            ].map((adj) => (
                                                <div key={adj.key} className="space-y-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-white/60">{adj.label}</span>
                                                        <span className="text-blue-400 font-mono">{adjustments[adj.key]}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={adj.min}
                                                        max={adj.max}
                                                        value={adjustments[adj.key]}
                                                        onChange={(e) => setAdjustments({ ...adjustments, [adj.key]: Number(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* HSL Section */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => toggleSection('hsl')}
                                        className="w-full flex items-center justify-between text-sm font-bold text-white/80 hover:text-white"
                                    >
                                        <span>HSL</span>
                                        {expandedSections.hsl ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {expandedSections.hsl && (
                                        <div className="space-y-4 pl-2 border-l border-white/5">
                                            {[
                                                { label: 'Hue', key: 'hue', min: -180, max: 180 },
                                                { label: 'Saturation', key: 'hslSaturation', min: -100, max: 100 },
                                                { label: 'Lightness', key: 'hslLightness', min: -100, max: 100 },
                                            ].map((adj) => (
                                                <div key={adj.key} className="space-y-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-white/60">{adj.label}</span>
                                                        <span className="text-blue-400 font-mono">{adjustments[adj.key]}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={adj.min}
                                                        max={adj.max}
                                                        value={adjustments[adj.key]}
                                                        onChange={(e) => setAdjustments({ ...adjustments, [adj.key]: Number(e.target.value) })}
                                                        className={`w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full ${adj.key === 'hue' ? '[&::-webkit-slider-thumb]:bg-white bg-gradient-to-r from-red-500 via-green-500 to-blue-500' : '[&::-webkit-slider-thumb]:bg-blue-500'}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Style Section */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => toggleSection('style')}
                                        className="w-full flex items-center justify-between text-sm font-bold text-white/80 hover:text-white"
                                    >
                                        <span>Style</span>
                                        {expandedSections.style ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {expandedSections.style && (
                                        <div className="space-y-4 pl-2 border-l border-white/5">
                                            {[
                                                { label: 'Sharpen', key: 'sharpen', min: 0, max: 100 },
                                                { label: 'Noise Reduction', key: 'blur', min: 0, max: 100 },
                                                { label: 'Fade', key: 'fade', min: 0, max: 100 },
                                                { label: 'Vignette', key: 'vignette', min: 0, max: 100 },
                                                { label: 'Grain', key: 'grain', min: 0, max: 100 },
                                            ].map((adj) => (
                                                <div key={adj.key} className="space-y-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-white/60">{adj.label}</span>
                                                        <span className="text-blue-400 font-mono">{adjustments[adj.key]}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={adj.min}
                                                        max={adj.max}
                                                        value={adjustments[adj.key]}
                                                        onChange={(e) => setAdjustments({ ...adjustments, [adj.key]: Number(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Effects Section */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => toggleSection('effects')}
                                        className="w-full flex items-center justify-between text-sm font-bold text-white/80 hover:text-white"
                                    >
                                        <span>Effects</span>
                                        {expandedSections.effects ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {expandedSections.effects && (
                                        <div className="space-y-4 pl-2 border-l border-white/5">
                                            {[
                                                { label: 'Clarity', key: 'clarity', min: 0, max: 100 },
                                                { label: 'Sepia', key: 'sepia', min: 0, max: 100 },
                                                { label: 'Grayscale', key: 'grayscale', min: 0, max: 100 },
                                            ].map((adj) => (
                                                <div key={adj.key} className="space-y-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-white/60">{adj.label}</span>
                                                        <span className="text-blue-400 font-mono">{adjustments[adj.key]}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={adj.min}
                                                        max={adj.max}
                                                        value={adjustments[adj.key]}
                                                        onChange={(e) => setAdjustments({ ...adjustments, [adj.key]: Number(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}

                        {/* Filters Tab */}
                        {activeTab === 'filters' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-slide-up">
                                {FILTER_PRESETS.map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => applyFilter(filter)}
                                        className={`
                                            p-3 rounded-xl border transition-all flex flex-col items-center gap-2 text-center
                                            ${activeFilterId === filter.id
                                                ? 'bg-blue-500/20 border-blue-500 text-white'
                                                : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/10 hover:text-white'
                                            }
                                        `}
                                    >
                                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/50 relative">
                                            {/* Preview of filter effect (simplified) */}
                                            <div
                                                className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500"
                                                style={{
                                                    filter: `
                                                        brightness(${100 + (filter.values.brightness || 0)}%)
                                                        contrast(${100 + (filter.values.contrast || 0)}%)
                                                        saturate(${100 + (filter.values.saturation || 0)}%)
                                                        sepia(${(filter.values.sepia || 0)}%)
                                                        grayscale(${(filter.values.grayscale || 0)}%)
                                                        hue-rotate(${(filter.values.hue || 0) + (filter.values.tint || 0)}deg)
                                                    `
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium">{filter.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Trim Tab */}
                        {activeTab === 'trim' && isVideo && (
                            <div className="space-y-6 animate-slide-up">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex justify-between mb-4">
                                        <div className="text-center">
                                            <div className="text-xs text-white/40 mb-1">Start Time</div>
                                            <div className="font-mono text-xl text-white">{formatTime(trimRange.start)}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-white/40 mb-1">End Time</div>
                                            <div className="font-mono text-xl text-white">{formatTime(trimRange.end)}</div>
                                        </div>
                                    </div>

                                    {/* Custom Drag Trimmer */}
                                    <div
                                        ref={trimTrackRef}
                                        className="relative h-12 bg-black/40 rounded-lg mb-2 flex items-center px-2 select-none touch-none"
                                    >
                                        <div className="absolute left-0 right-0 h-1 bg-white/20 rounded-full mx-2"></div>

                                        {/* Active Range Bar */}
                                        <div
                                            className="absolute h-1 bg-blue-500 rounded-full mx-2"
                                            style={{
                                                left: `${(trimRange.start / duration) * 100}%`,
                                                right: `${100 - (trimRange.end / duration) * 100}%`
                                            }}
                                        ></div>

                                        {/* Start Handle */}
                                        <div
                                            onPointerDown={(e) => handleTrimPointerDown(e, 'start')}
                                            className="absolute w-6 h-8 bg-white rounded-md shadow-lg cursor-ew-resize z-20 flex items-center justify-center hover:scale-110 transition-transform"
                                            style={{ left: `calc(${(trimRange.start / duration) * 100}% + 8px - 12px)` }} // Center handle
                                        >
                                            <div className="w-1 h-4 bg-black/20 rounded-full"></div>
                                        </div>

                                        {/* End Handle */}
                                        <div
                                            onPointerDown={(e) => handleTrimPointerDown(e, 'end')}
                                            className="absolute w-6 h-8 bg-white rounded-md shadow-lg cursor-ew-resize z-20 flex items-center justify-center hover:scale-110 transition-transform"
                                            style={{ left: `calc(${(trimRange.end / duration) * 100}% + 8px - 12px)` }} // Center handle
                                        >
                                            <div className="w-1 h-4 bg-black/20 rounded-full"></div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-center text-white/30">Drag handles to trim video</p>
                                </div>
                            </div>
                        )}

                        {/* Crop Tab */}
                        {activeTab === 'crop' && (
                            <div className="space-y-6 animate-slide-up">
                                {/* Aspect Ratio Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'original', label: 'Free', ratio: 'Free' },
                                        { id: '16:9', label: 'Landscape', ratio: '16:9' },
                                        { id: '9:16', label: 'Portrait', ratio: '9:16' },
                                        { id: '1:1', label: 'Square', ratio: '1:1' },
                                        { id: '4:5', label: 'Social', ratio: '4:5' },
                                    ].map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => handleCropPresetChange(option.id)}
                                            className={`
                                                p-4 rounded-2xl border transition-all flex flex-col items-center gap-2
                                                ${cropPreset === option.id
                                                    ? 'bg-blue-500/20 border-blue-500 text-white'
                                                    : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/10 hover:text-white'
                                                }
                                            `}
                                        >
                                            <div className={`
                                                border-2 rounded-sm mb-1
                                                ${cropPreset === option.id ? 'border-blue-400' : 'border-current'}
                                            `} style={{
                                                    width: '24px',
                                                    height: option.id === '16:9' ? '14px' : option.id === '9:16' ? '32px' : option.id === '1:1' ? '24px' : '24px',
                                                    aspectRatio: option.id === 'original' ? 'auto' : option.id.replace(':', '/')
                                                }}></div>
                                            <span className="text-sm font-medium">{option.label}</span>
                                            <span className="text-xs opacity-50">{option.ratio}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Rotation & Zoom Controls */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-white/60">Rotation</span>
                                            <span className="text-blue-400 font-mono">{rotation}°</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-180"
                                            max="180"
                                            value={rotation}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                setRotation(val);
                                                if (cropperRef.current) cropperRef.current.cropper.rotateTo(val);
                                            }}
                                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-white/60">Zoom</span>
                                            <span className="text-blue-400 font-mono">{zoom.toFixed(1)}x</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="3"
                                            step="0.1"
                                            value={zoom}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                setZoom(val);
                                                if (cropperRef.current) cropperRef.current.cropper.zoomTo(val);
                                            }}
                                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setRotation(rotation - 90);
                                                if (cropperRef.current) cropperRef.current.cropper.rotate(-90);
                                            }}
                                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-xs flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw size={14} /> -90°
                                        </button>
                                        <button
                                            onClick={() => {
                                                setRotation(0);
                                                setZoom(1);
                                                if (cropperRef.current) {
                                                    cropperRef.current.cropper.reset();
                                                    setCropPreset('original');
                                                }
                                            }}
                                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-xs"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="hidden md:block p-4 border-t border-white/5 bg-[#0f0f12]">
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="w-full py-3 bg-white text-black rounded-xl font-bold text-base hover:bg-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-xl"
                        >
                            <Download size={18} />
                            Export
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaEditor;

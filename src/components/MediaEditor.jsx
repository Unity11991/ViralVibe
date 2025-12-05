import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Check, RotateCcw, Scissors, Crop, Sliders, Download, Image as ImageIcon, Video } from 'lucide-react';

const MediaEditor = ({ mediaFile, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [activeTab, setActiveTab] = useState('filters'); // filters, trim, crop

    // Edit States
    const [filters, setFilters] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        sepia: 0,
        grayscale: 0
    });
    const [trimRange, setTrimRange] = useState([0, 100]); // Percentage
    const [cropRatio, setCropRatio] = useState('original'); // original, 9:16, 16:9, 1:1

    const videoRef = useRef(null);
    const imageRef = useRef(null);
    const [mediaUrl, setMediaUrl] = useState(null);

    const isVideo = mediaFile?.type?.startsWith('video/');

    useEffect(() => {
        if (mediaFile) {
            const url = URL.createObjectURL(mediaFile);
            setMediaUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [mediaFile]);

    const handlePlayPause = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);

            // Loop logic for trim
            const end = (trimRange[1] / 100) * duration;
            if (videoRef.current.currentTime >= end) {
                videoRef.current.currentTime = (trimRange[0] / 100) * duration;
                if (!isPlaying) videoRef.current.play(); // Keep playing loop
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const getFilterString = () => {
        return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%)`;
    };

    const getCropStyle = () => {
        switch (cropRatio) {
            case '9:16': return { aspectRatio: '9/16', objectFit: 'cover' };
            case '16:9': return { aspectRatio: '16/9', objectFit: 'cover' };
            case '1:1': return { aspectRatio: '1/1', objectFit: 'cover' };
            default: return { width: '100%', height: '100%', objectFit: 'contain' };
        }
    };

    const resetFilters = () => {
        setFilters({
            brightness: 100,
            contrast: 100,
            saturation: 100,
            sepia: 0,
            grayscale: 0
        });
        setCropRatio('original');
        setTrimRange([0, 100]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in">
            <div className="w-full max-w-6xl h-[90vh] flex flex-col md:flex-row bg-[#0f0f12] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">

                {/* Left: Preview Area */}
                <div className="flex-1 relative flex items-center justify-center bg-black/50 p-8">
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors z-10"
                    >
                        <X size={24} />
                    </button>

                    <div
                        className="relative overflow-hidden shadow-2xl transition-all duration-500"
                        style={{
                            ...getCropStyle(),
                            maxWidth: '100%',
                            maxHeight: '100%'
                        }}
                    >
                        {isVideo ? (
                            <video
                                ref={videoRef}
                                src={mediaUrl}
                                className="w-full h-full"
                                style={{ filter: getFilterString(), objectFit: 'inherit' }}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                loop
                                playsInline
                            />
                        ) : (
                            <img
                                ref={imageRef}
                                src={mediaUrl}
                                className="w-full h-full"
                                style={{ filter: getFilterString(), objectFit: 'inherit' }}
                                alt="Preview"
                            />
                        )}

                        {/* Play Overlay (Video Only) */}
                        {isVideo && (
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={handlePlayPause}
                            >
                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30">
                                    {isPlaying ? <Pause size={32} className="text-white" fill="currentColor" /> : <Play size={32} className="text-white ml-1" fill="currentColor" />}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Controls (Video Only) */}
                    {isVideo && (
                        <div className="absolute bottom-8 left-8 right-8 flex items-center gap-4 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <button onClick={handlePlayPause} className="text-white hover:text-blue-400 transition-colors">
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                            </button>
                            <span className="text-xs font-mono text-white/70">
                                {new Date(currentTime * 1000).toISOString().substr(14, 5)} / {new Date(duration * 1000).toISOString().substr(14, 5)}
                            </span>
                            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Tools Panel */}
                <div className="w-full md:w-[400px] bg-[#1a1a1f] border-l border-white/5 flex flex-col">

                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                {isVideo ? <Video size={18} className="text-blue-400" /> : <ImageIcon size={18} className="text-purple-400" />}
                                Media Editor
                            </h3>
                            <p className="text-xs text-white/40 mt-1">Adjust and enhance your content</p>
                        </div>
                        <button
                            onClick={resetFilters}
                            className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors"
                            title="Reset All"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-2 gap-2 border-b border-white/5">
                        <button
                            onClick={() => setActiveTab('filters')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'filters' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <Sliders size={16} /> Filters
                        </button>
                        {isVideo && (
                            <button
                                onClick={() => setActiveTab('trim')}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'trim' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                                <Scissors size={16} /> Trim
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('crop')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'crop' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <Crop size={16} /> Crop
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">

                        {activeTab === 'filters' && (
                            <div className="space-y-6">
                                {[
                                    { label: 'Brightness', key: 'brightness', min: 0, max: 200 },
                                    { label: 'Contrast', key: 'contrast', min: 0, max: 200 },
                                    { label: 'Saturation', key: 'saturation', min: 0, max: 200 },
                                    { label: 'Sepia', key: 'sepia', min: 0, max: 100 },
                                    { label: 'Grayscale', key: 'grayscale', min: 0, max: 100 },
                                ].map((filter) => (
                                    <div key={filter.key}>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-medium text-white/70">{filter.label}</label>
                                            <span className="text-xs text-blue-400 font-mono">{filters[filter.key]}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={filter.min}
                                            max={filter.max}
                                            value={filters[filter.key]}
                                            onChange={(e) => setFilters({ ...filters, [filter.key]: Number(e.target.value) })}
                                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'trim' && isVideo && (
                            <div className="space-y-6">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-sm text-white/60 mb-4">Adjust the start and end time of your video loop.</p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-white/50 block mb-1">Start Point</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={trimRange[0]}
                                                onChange={(e) => setTrimRange([Math.min(Number(e.target.value), trimRange[1] - 5), trimRange[1]])}
                                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-white/50 block mb-1">End Point</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={trimRange[1]}
                                                onChange={(e) => setTrimRange([trimRange[0], Math.max(Number(e.target.value), trimRange[0] + 5)])}
                                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'crop' && (
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Original', value: 'original', icon: <ImageIcon size={16} /> },
                                    { label: 'Story (9:16)', value: '9:16', icon: <div className="w-3 h-5 border border-current rounded-sm" /> },
                                    { label: 'Post (16:9)', value: '16:9', icon: <div className="w-5 h-3 border border-current rounded-sm" /> },
                                    { label: 'Square (1:1)', value: '1:1', icon: <div className="w-4 h-4 border border-current rounded-sm" /> },
                                ].map((ratio) => (
                                    <button
                                        key={ratio.value}
                                        onClick={() => setCropRatio(ratio.value)}
                                        className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${cropRatio === ratio.value ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        {ratio.icon}
                                        <span className="text-xs font-medium">{ratio.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 bg-black/20">
                        <button className="w-full py-3 bg-white text-black rounded-xl font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-xl shadow-white/5">
                            <Download size={18} /> Export {isVideo ? 'Video' : 'Image'}
                            <span className="text-xs font-normal bg-black/10 px-2 py-0.5 rounded-full text-black/60">Concept</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MediaEditor;

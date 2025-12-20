import React, { useState, useEffect } from 'react';
import { X, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const ExportModal = ({ isOpen, onClose, onExport, isExporting, progress, status, error }) => {
    const [resolution, setResolution] = useState('1080p');
    const [fps, setFps] = useState(30);
    const [filename, setFilename] = useState('my-video');

    if (!isOpen) return null;

    const handleExport = () => {
        let width = 1920;
        let height = 1080;
        let bitrate = 8000000; // 8 Mbps for 1080p

        if (resolution === '4k') {
            width = 3840;
            height = 2160;
            bitrate = 20000000; // 20 Mbps
        } else if (resolution === '720p') {
            width = 1280;
            height = 720;
            bitrate = 4000000; // 4 Mbps
        }

        onExport({
            width,
            height,
            fps,
            bitrate,
            filename: `${filename}.mp4`
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Download className="w-5 h-5 text-indigo-400" />
                        Export Video
                    </h2>
                    {!isExporting && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium text-red-400">Export Failed</h3>
                            <p className="text-xs text-red-300/80 mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {isExporting ? (
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="relative w-20 h-20 mb-4">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="40"
                                        cy="40"
                                        r="36"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        className="text-white/10"
                                    />
                                    <circle
                                        cx="40"
                                        cy="40"
                                        r="36"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={2 * Math.PI * 36}
                                        strokeDashoffset={2 * Math.PI * 36 * ((100 - progress) / 100)}
                                        className="text-indigo-500 transition-all duration-300 ease-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-bold text-white">{progress}%</span>
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-1">{status}</h3>
                            <p className="text-sm text-gray-400">Please do not close this window</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Filename */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Filename</label>
                            <input
                                type="text"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                placeholder="Enter filename"
                            />
                        </div>

                        {/* Resolution */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Resolution</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['720p', '1080p', '4k'].map((res) => (
                                    <button
                                        key={res}
                                        onClick={() => setResolution(res)}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${resolution === res
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {res.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* FPS */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Frame Rate</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[24, 30, 60, 120].map((rate) => (
                                    <button
                                        key={rate}
                                        onClick={() => setFps(rate)}
                                        className={`px-2 py-2.5 rounded-xl text-sm font-medium transition-all ${fps === rate
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {rate}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleExport}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-4"
                        >
                            <Download className="w-5 h-5" />
                            Start Export
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportModal;

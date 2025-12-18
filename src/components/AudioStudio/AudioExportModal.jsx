import React from 'react';
import { X, Download, Music } from 'lucide-react';

const AudioExportModal = ({
    show,
    onClose,
    isExporting,
    progress,
    onExport,
    settings,
    onSettingsChange,
    onCancel
}) => {
    if (!show) return null;

    const formats = ['WAV', 'MP3'];
    const qualities = ['High (320kbps)', 'Medium (192kbps)', 'Low (128kbps)'];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1f] rounded-2xl border border-white/10 w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Download size={20} className="text-blue-500" />
                        Export Audio
                    </h2>
                    {!isExporting && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {isExporting ? (
                        <div className="text-center py-8">
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="44"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        className="text-white/10"
                                    />
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="44"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={2 * Math.PI * 44}
                                        strokeDashoffset={2 * Math.PI * 44 * (1 - progress / 100)}
                                        className="text-blue-500 transition-all duration-300 ease-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-bold text-white">{Math.round(progress)}%</span>
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Rendering Audio...</h3>
                            <p className="text-white/50 text-sm">Please keep this window open</p>

                            <button
                                onClick={onCancel}
                                className="mt-6 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors"
                            >
                                Cancel Export
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-white/70">Format</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {formats.map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => onSettingsChange({ ...settings, format: fmt })}
                                            className={`p-3 rounded-xl border text-center transition-all ${settings.format === fmt
                                                ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                                : 'bg-white/5 border-transparent text-white/70 hover:bg-white/10'
                                                }`}
                                        >
                                            <span className="block font-bold">{fmt}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <button
                                    onClick={onExport}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    <Download size={20} />
                                    Start Export
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioExportModal;

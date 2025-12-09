import React, { useRef, useState } from 'react';
import { X, Download, Share2, Sparkles, Flame } from 'lucide-react';
import html2canvas from 'html2canvas';

const ShareModal = ({ isOpen, onClose, results, image }) => {
    const cardRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen || !results) return null;

    const { viralPotential, roast, scores } = results;
    const imageUrl = image ? URL.createObjectURL(image) : null;

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);

        try {
            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 2, // Higher quality
                backgroundColor: '#000000', // Ensure dark background
            });

            const link = document.createElement('a');
            link.download = `govyral-score-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Failed to generate image:", error);
            alert("Failed to generate image. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-[#0f0f0f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Share2 size={18} className="text-indigo-400" />
                        Share Result
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-[#050505]">
                    {/* The Card to Capture */}
                    <div
                        ref={cardRef}
                        className="w-[320px] aspect-[9/16] bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl flex flex-col"
                    >
                        {/* Background Image Effect */}
                        {imageUrl && (
                            <div className="absolute inset-0 opacity-30">
                                <img src={imageUrl} alt="Background" className="w-full h-full object-cover blur-sm" />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90" />
                            </div>
                        )}

                        {/* Content */}
                        <div className="relative z-10 p-6 flex flex-col h-full justify-between">

                            {/* Top Branding */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                        <Sparkles size={16} className="text-white" />
                                    </div>
                                    <span className="font-bold text-white tracking-wide">GoVyral</span>
                                </div>
                                <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
                                    <span className="text-xs font-bold text-indigo-300">VIRAL AUDIT</span>
                                </div>
                            </div>

                            {/* Main Score */}
                            <div className="flex flex-col items-center justify-center my-4">
                                <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                                    {/* Circular Progress SVG */}
                                    <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                                        <circle
                                            cx="64" cy="64" r="58"
                                            stroke="currentColor" strokeWidth="8"
                                            fill="transparent"
                                            className="text-indigo-500"
                                            strokeDasharray={364}
                                            strokeDashoffset={364 - (364 * viralPotential) / 100}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-4xl font-black text-white">{viralPotential}</span>
                                        <span className="text-[10px] uppercase tracking-widest text-indigo-300">Score</span>
                                    </div>
                                </div>
                            </div>

                            {/* Roast Section */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl mb-4">
                                <div className="flex items-center gap-2 mb-2 text-orange-400">
                                    <Flame size={14} />
                                    <span className="text-xs font-bold uppercase">The Roast</span>
                                </div>
                                <p className="text-sm text-gray-200 italic leading-relaxed">
                                    "{roast ? (roast.length > 120 ? roast.substring(0, 120) + '...' : roast) : 'Your content is too good to roast!'}"
                                </p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-6">
                                {Object.entries(scores || {}).slice(0, 3).map(([key, score]) => (
                                    <div key={key} className="bg-white/5 rounded-lg p-2 flex flex-col items-center border border-white/5">
                                        <span className="text-lg font-bold text-white">{score}/10</span>
                                        <span className="text-[9px] uppercase text-gray-400 mt-1">{key}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="text-center border-t border-white/10 pt-4">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Analyzed by GoVyral.Online</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                Download Story Card
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ShareModal;

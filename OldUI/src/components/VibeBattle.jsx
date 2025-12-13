import React, { useState } from 'react';
import { Upload, X, Swords, Sparkles, Trophy, Loader, AlertCircle } from 'lucide-react';
import { analyzeImage } from '../utils/aiService';

const VibeBattle = ({ onClose, settings }) => {
    const [imageA, setImageA] = useState(null);
    const [imageB, setImageB] = useState(null);
    const [previewA, setPreviewA] = useState(null);
    const [previewB, setPreviewB] = useState(null);
    const [resultA, setResultA] = useState(null);
    const [resultB, setResultB] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);

    const handleImageUpload = (e, side) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (side === 'A') {
                setImageA(file);
                setPreviewA(url);
                setResultA(null);
            } else {
                setImageB(file);
                setPreviewB(url);
                setResultB(null);
            }
            setError(null);
        }
    };

    const startBattle = async () => {
        if (!imageA || !imageB) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            // Analyze both images in parallel
            const [resA, resB] = await Promise.all([
                analyzeImage(imageA, settings),
                analyzeImage(imageB, settings)
            ]);

            setResultA(resA);
            setResultB(resB);
        } catch (err) {
            setError(err.message || "Failed to analyze images.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getWinner = () => {
        if (!resultA || !resultB) return null;
        if (resultA.viralPotential > resultB.viralPotential) return 'A';
        if (resultB.viralPotential > resultA.viralPotential) return 'B';
        return 'Tie';
    };

    const winner = getWinner();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-6xl h-[90vh] bg-[#0f0f12] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col relative">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                            <Swords className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Vibe Battle</h2>
                            <p className="text-white/50 text-sm">Compare two images to see which one wins the algorithm.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Battle Arena */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">

                        {error && (
                            <div className="mb-6 mx-auto max-w-2xl bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-8 items-start justify-center min-h-[500px]">

                            {/* Contender A */}
                            <div className={`flex-1 w-full relative transition-all duration-500 ${winner === 'A' ? 'scale-105 z-10' : (winner === 'B' ? 'opacity-50 scale-95' : '')}`}>
                                <div className={`
                    relative aspect-[4/5] rounded-3xl overflow-hidden bg-white/5 border-2 
                    ${winner === 'A' ? 'border-green-500 shadow-[0_0_50px_-10px_rgba(34,197,94,0.3)]' : 'border-dashed border-white/20'}
                `}>
                                    {previewA ? (
                                        <img src={previewA} alt="Contender A" className="w-full h-full object-cover" />
                                    ) : (
                                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors group">
                                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Upload className="text-white/50 group-hover:text-white" size={32} />
                                            </div>
                                            <span className="text-white/50 group-hover:text-white font-medium">Upload Image A</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'A')} />
                                        </label>
                                    )}

                                    {/* Winner Badge */}
                                    {winner === 'A' && (
                                        <div className="absolute top-4 right-4 bg-green-500 text-black font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-bounce">
                                            <Trophy size={16} /> WINNER
                                        </div>
                                    )}

                                    {/* Score A */}
                                    {resultA && (
                                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                                            <div className="text-center">
                                                <span className="text-sm text-white/60 uppercase tracking-widest font-bold mb-1 block">Viral Score</span>
                                                <span className={`text-5xl font-black ${winner === 'A' ? 'text-green-400' : 'text-white'}`}>
                                                    {resultA.viralPotential}%
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* VS Badge */}
                            <div className="bg-white/10 rounded-full p-4 mt-[25%] self-center md:self-auto backdrop-blur-md border border-white/10 shrink-0 z-20">
                                <span className="text-2xl font-black italic text-white/50">VS</span>
                            </div>

                            {/* Contender B */}
                            <div className={`flex-1 w-full relative transition-all duration-500 ${winner === 'B' ? 'scale-105 z-10' : (winner === 'A' ? 'opacity-50 scale-95' : '')}`}>
                                <div className={`
                    relative aspect-[4/5] rounded-3xl overflow-hidden bg-white/5 border-2 
                    ${winner === 'B' ? 'border-green-500 shadow-[0_0_50px_-10px_rgba(34,197,94,0.3)]' : 'border-dashed border-white/20'}
                `}>
                                    {previewB ? (
                                        <img src={previewB} alt="Contender B" className="w-full h-full object-cover" />
                                    ) : (
                                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors group">
                                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Upload className="text-white/50 group-hover:text-white" size={32} />
                                            </div>
                                            <span className="text-white/50 group-hover:text-white font-medium">Upload Image B</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'B')} />
                                        </label>
                                    )}

                                    {/* Winner Badge */}
                                    {winner === 'B' && (
                                        <div className="absolute top-4 right-4 bg-green-500 text-black font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-bounce">
                                            <Trophy size={16} /> WINNER
                                        </div>
                                    )}

                                    {/* Score B */}
                                    {resultB && (
                                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                                            <div className="text-center">
                                                <span className="text-sm text-white/60 uppercase tracking-widest font-bold mb-1 block">Viral Score</span>
                                                <span className={`text-5xl font-black ${winner === 'B' ? 'text-green-400' : 'text-white'}`}>
                                                    {resultB.viralPotential}%
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Action Area */}
                        <div className="mt-10 flex justify-center">
                            <button
                                onClick={startBattle}
                                disabled={!imageA || !imageB || isAnalyzing}
                                className={`
                        px-10 py-5 rounded-2xl font-bold text-xl flex items-center gap-3 transition-all
                        ${!imageA || !imageB || isAnalyzing
                                        ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:scale-105 shadow-xl shadow-orange-500/20'
                                    }
                    `}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader className="animate-spin" /> Analyzing Contenders...
                                    </>
                                ) : (
                                    <>
                                        <Swords size={24} /> START BATTLE
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Detailed Stats */}
                        {resultA && resultB && (
                            <div className="mt-12 bg-white/5 rounded-2xl p-8 border border-white/5 animate-slide-in">
                                <h3 className="text-xl font-bold text-white mb-6 text-center">Detailed Breakdown</h3>

                                <div className="space-y-4">
                                    {/* Row 1 */}
                                    <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4">
                                        <div className="text-center font-bold text-gray-400">Contender A</div>
                                        <div className="text-center font-bold text-white uppercase tracking-wider text-sm">Metric</div>
                                        <div className="text-center font-bold text-gray-400">Contender B</div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="grid grid-cols-3 gap-4 items-center hover:bg-white/5 p-2 rounded-lg transition-colors">
                                        <div className={`text-center font-bold ${resultA.scores?.lighting > resultB.scores?.lighting ? 'text-green-400' : 'text-white/60'}`}>{resultA.scores?.lighting}/10</div>
                                        <div className="text-center text-white/60 text-sm">Lighting</div>
                                        <div className={`text-center font-bold ${resultB.scores?.lighting > resultA.scores?.lighting ? 'text-green-400' : 'text-white/60'}`}>{resultB.scores?.lighting}/10</div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 items-center hover:bg-white/5 p-2 rounded-lg transition-colors">
                                        <div className={`text-center font-bold ${resultA.scores?.composition > resultB.scores?.composition ? 'text-green-400' : 'text-white/60'}`}>{resultA.scores?.composition}/10</div>
                                        <div className="text-center text-white/60 text-sm">Composition</div>
                                        <div className={`text-center font-bold ${resultB.scores?.composition > resultA.scores?.composition ? 'text-green-400' : 'text-white/60'}`}>{resultB.scores?.composition}/10</div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 items-center hover:bg-white/5 p-2 rounded-lg transition-colors">
                                        <div className={`text-center font-bold ${resultA.scores?.creativity > resultB.scores?.creativity ? 'text-green-400' : 'text-white/60'}`}>{resultA.scores?.creativity}/10</div>
                                        <div className="text-center text-white/60 text-sm">Creativity</div>
                                        <div className={`text-center font-bold ${resultB.scores?.creativity > resultA.scores?.creativity ? 'text-green-400' : 'text-white/60'}`}>{resultB.scores?.creativity}/10</div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default VibeBattle;

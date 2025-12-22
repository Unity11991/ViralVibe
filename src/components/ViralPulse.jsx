import React, { useState, useEffect } from 'react';
import { X, Zap, TrendingUp, Music, Sparkles, Loader2, ArrowRight, Instagram, Globe, Flame, Hash, Monitor, Code } from 'lucide-react';
import { fetchTrends } from '../utils/trendService';
import { generateTrendInsights } from '../utils/aiService';

const ViralPulse = ({ onClose, settings }) => {
    const [trends, setTrends] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTrend, setSelectedTrend] = useState(null);
    const [aiInsights, setAiInsights] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedSource, setSelectedSource] = useState('reddit');

    const SOURCES = [
        { id: 'reddit', name: 'Reddit', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/20' },
        { id: 'google', name: 'Google Trends', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/20', border: 'border-blue-500/20' },
        { id: 'tiktok', name: 'TikTok', icon: Music, color: 'text-pink-500', bg: 'bg-pink-500/20', border: 'border-pink-500/20' },
        { id: 'twitter', name: 'X / Twitter', icon: Hash, color: 'text-sky-500', bg: 'bg-sky-500/20', border: 'border-sky-500/20' },
        { id: 'producthunt', name: 'Product Hunt', icon: Monitor, color: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/20' },
        { id: 'hackernews', name: 'Hacker News', icon: Code, color: 'text-orange-600', bg: 'bg-orange-600/20', border: 'border-orange-600/20' },
    ];

    const currentSource = SOURCES.find(s => s.id === selectedSource) || SOURCES[0];

    useEffect(() => {
        loadSignals(selectedSource);
    }, [selectedSource]);

    const loadSignals = async (source) => {
        setIsLoading(true);
        setSelectedTrend(null); // Reset selection on source switch
        setAiInsights(null);

        const data = await fetchTrends(source);
        if (data) {
            setTrends(data);
        }
        setIsLoading(false);
    };

    const handleAnalyzeTrend = async (trend) => {
        setSelectedTrend(trend);
        setAiInsights(null);
        setIsGenerating(true);

        try {
            // Use existing AI service to generate specific Instagram strategy
            // We pass the single trend context to the AI
            const insight = await generateTrendInsights([trend], settings.apiKey);
            setAiInsights(insight);
        } catch (error) {
            console.error("AI Insight Error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className={`w-full max-w-6xl bg-[#0f0f12] rounded-3xl border ${currentSource.border} shadow-2xl overflow-hidden flex flex-col h-[90vh] transition-colors duration-500`}>

                {/* Header */}
                <div className={`p-6 border-b border-white/5 bg-gradient-to-r from-black via-black to-${currentSource.color.split('-')[1]}-950/20 flex items-center justify-between`}>
                    <div className="flex items-center gap-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Zap className="text-yellow-400 fill-yellow-400" size={24} />
                                Viral Pulse
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">Real-time viral signals scanner</p>
                        </div>

                        <div className="h-8 w-px bg-white/10 mx-2"></div>

                        {/* Source Selector Tabs */}
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar max-w-2xl">
                            {SOURCES.map(source => (
                                <button
                                    key={source.id}
                                    onClick={() => setSelectedSource(source.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedSource === source.id
                                        ? `${source.bg} ${source.color} ring-1 ring-inset ${source.border.replace('border-', 'ring-')}`
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                        }`}
                                >
                                    <source.icon size={14} />
                                    {source.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Trend Feed */}
                    <div className="w-1/3 border-r border-white/5 overflow-y-auto custom-scrollbar bg-black/20">
                        <div className="p-4 sticky top-0 bg-[#0f0f12]/95 backdrop-blur z-10 border-b border-white/5 flex justify-between items-center">
                            <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${currentSource.color}`}>
                                <currentSource.icon size={16} />
                                {currentSource.name} Trends
                            </h3>
                            <button onClick={() => loadSignals(selectedSource)} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white" title="Refresh">
                                <TrendingUp size={16} />
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="p-12 text-center">
                                <Loader2 className={`animate-spin mx-auto mb-3 ${currentSource.color}`} size={32} />
                                <p className="text-sm text-slate-500">Scanning {currentSource.name}...</p>
                            </div>
                        ) : (
                            <div className="space-y-1 p-2">
                                {trends.map((trend) => (
                                    <button
                                        key={trend.id}
                                        onClick={() => handleAnalyzeTrend(trend)}
                                        className={`w-full text-left p-4 rounded-xl transition-all border group relative overflow-hidden ${selectedTrend?.id === trend.id
                                            ? `${currentSource.bg} ${currentSource.border} text-white`
                                            : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-300 hover:text-white'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/20 ${currentSource.color} opacity-80`}>#{trend.id}</span>
                                            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-slate-400">{trend.growth}</span>
                                        </div>
                                        <h4 className="font-bold leading-tight mb-1 line-clamp-2">{trend.name}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                            <span className="truncate max-w-[120px]">{trend.category}</span>
                                            <span>•</span>
                                            <span>Just now</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Analysis Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gradient-to-br from-[#0f0f12] to-white/5">
                        {!selectedTrend ? (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-50">
                                <div className={`w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse ${currentSource.color}`}>
                                    <currentSource.icon size={48} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Select a Signal</h3>
                                <p className="text-slate-400">Choose a trending topic from {currentSource.name} to generate an instant Instagram strategy.</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in space-y-8">
                                {/* Trend Header */}
                                <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`px-2 py-1 rounded ${currentSource.bg} ${currentSource.color} text-xs font-bold uppercase`}>
                                                {currentSource.name} VIRAL
                                            </span>
                                            <span className="text-slate-500 text-sm">{new Date().toLocaleDateString()}</span>
                                        </div>
                                        <h2 className="text-4xl font-bold text-white mb-4 leading-tight">{selectedTrend.name}</h2>

                                        {selectedTrend.image && (
                                            <div className="w-full h-64 rounded-2xl bg-cover bg-center border border-white/10 mb-6 relative overflow-hidden group shadow-2xl" style={{ backgroundImage: `url(${selectedTrend.image})` }}>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                                                <p className="absolute bottom-6 left-6 right-6 text-white text-lg font-medium leading-relaxed drop-shadow-md">{selectedTrend.description}</p>
                                            </div>
                                        )}

                                        {!selectedTrend.image && (
                                            <p className="text-lg text-slate-300 mb-6 bg-white/5 p-6 rounded-2xl border border-white/10">{selectedTrend.description}</p>
                                        )}
                                    </div>
                                    {selectedTrend.url && (
                                        <a
                                            href={selectedTrend.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
                                            title={`View on ${currentSource.name}`}
                                        >
                                            <ArrowRight size={24} className="-rotate-45" />
                                        </a>
                                    )}
                                </div>

                                {/* AI Strategy Section */}
                                {isGenerating ? (
                                    <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center animate-pulse">
                                        <Sparkles className={`animate-spin ${currentSource.color} mx-auto mb-4`} size={40} />
                                        <h3 className="text-xl font-bold text-white mb-2">Analyzing {currentSource.name} Trend...</h3>
                                        <p className="text-slate-400">Finding the perfect audio, hook, and caption for this topic.</p>
                                    </div>
                                ) : aiInsights ? (
                                    <div className="space-y-6 animate-slide-up">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Sparkles className="text-yellow-400" size={24} />
                                            <h3 className="text-2xl font-bold text-white">Viral Strategy</h3>
                                        </div>

                                        {/* 1. The Strategy Card */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {aiInsights.ideas?.map((idea, idx) => (
                                                <div key={idx} className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Instagram size={18} className="text-indigo-400" />
                                                        <span className="text-xs font-bold text-indigo-300 uppercase">{idea.format || 'Reel Idea'}</span>
                                                    </div>
                                                    <h4 className="text-lg font-bold text-white mb-2">{idea.title}</h4>
                                                    <p className="text-sm text-slate-300 leading-relaxed">{idea.description}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 2. Audio & Keywords */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Audio */}
                                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                                                    <Music size={16} /> Recommended Audio
                                                </h4>
                                                <div className="space-y-3">
                                                    {aiInsights.audio?.map((track, i) => (
                                                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                                            <div className="w-8 h-8 rounded bg-pink-500/20 flex items-center justify-center shrink-0 text-pink-400 text-xs font-bold group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                                                {i + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-white">{track.title}</p>
                                                                <p className="text-xs text-slate-400">{track.artist}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Keywords */}
                                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                                                    <TrendingUp size={16} /> High-Traffic Tags
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {aiInsights.keywords?.map((tag, i) => (
                                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:text-white hover:border-white/30 transition-all cursor-copy">
                                                            #{tag.replace(/^#/, '')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                                        <p className="text-red-400">Failed to generate insights. Please try another signal.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViralPulse;

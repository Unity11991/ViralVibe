import React, { useState, useEffect } from 'react';
import { TrendingUp, Hash, Music, ArrowUpRight, Loader, Sparkles, Lightbulb, Play } from 'lucide-react';
import { fetchGoogleTrends } from '../utils/trendService';
import { generateTrendInsights } from '../utils/aiService';

const TrendingSidebar = ({ apiKey }) => {
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aiInsights, setAiInsights] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);

    // Initial mock data until AI generates it
    const [trendingAudio, setTrendingAudio] = useState([
        { id: 1, title: 'Sped Up - Nightcore', artist: 'Viral Hits' },
        { id: 2, title: 'Classical Violin Remix', artist: 'Orchestra' },
        { id: 3, title: 'Lo-Fi Chill', artist: 'Study Beats' },
    ]);
    const [hotKeywords, setHotKeywords] = useState(['POV', 'GRWM', 'DayInLife', 'Hack', 'Tutorial', 'ASMR', 'Satisfying']);

    useEffect(() => {
        const loadTrends = async () => {
            const data = await fetchGoogleTrends();
            setTrends(data);
            setLoading(false);
        };
        loadTrends();
    }, []);

    const handleGenerateInsights = async () => {
        if (!apiKey) {
            setError("Please enter your API Key in Settings to generate AI insights.");
            return;
        }
        if (trends.length === 0) return;

        setGenerating(true);
        setError(null);
        try {
            const insights = await generateTrendInsights(trends, apiKey);
            setAiInsights(insights);
            if (insights.audio) setTrendingAudio(insights.audio.map((a, i) => ({ ...a, id: i })));
            if (insights.keywords) setHotKeywords(insights.keywords);
        } catch (err) {
            console.error(err);
            setError("Failed to generate insights. Try again.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* AI Generator Header */}
            <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-2xl p-6 border border-indigo-500/30">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                            <Sparkles className="text-yellow-400" /> Viral Content Strategist
                        </h2>
                        <p className="text-indigo-200/80">
                            Turn today's trends into your next viral hit. Get tailored video ideas, audio, and keywords.
                        </p>
                        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    </div>
                    <button
                        onClick={handleGenerateInsights}
                        disabled={generating || loading}
                        className="px-6 py-3 bg-white text-indigo-900 font-bold rounded-xl shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap flex items-center gap-2"
                    >
                        {generating ? <Loader className="animate-spin" size={20} /> : <ZapIcon />}
                        {generating ? "Brainstorming..." : "Generate Strategy"}
                    </button>
                </div>
            </div>

            {/* AI Ideas Section */}
            {aiInsights && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {aiInsights.ideas.map((idea, idx) => (
                        <div key={idx} className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-xl hover:bg-indigo-600/20 transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-md uppercase">{idea.format}</span>
                                <h4 className="font-bold text-white text-lg leading-tight">{idea.title}</h4>
                            </div>
                            <p className="text-sm text-indigo-200">{idea.description}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">

                {/* Main Trends List */}
                <div className="flex-1 space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <TrendingUp className="text-orange-400" /> Google Trends (Daily)
                    </h3>

                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader className="animate-spin text-white/50" size={32} />
                        </div>
                    ) : (
                        trends.map((trend, idx) => (
                            <div key={trend.id} className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:bg-white/5 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-400 group-hover:to-pink-500 transition-all truncate pr-4">
                                            {trend.name}
                                        </h4>
                                        <p className="text-white/50 text-sm mb-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: trend.description }}></p>

                                        {trend.source && (
                                            <span className="text-xs text-blue-300 font-medium">
                                                Source: {trend.source}
                                            </span>
                                        )}
                                    </div>
                                    {trend.image && (
                                        <img src={trend.image} alt={trend.name} className="w-16 h-16 rounded-lg object-cover bg-white/5 hidden sm:block" />
                                    )}
                                </div>

                                <div className="flex flex-row md:flex-col items-center gap-2 self-end md:self-auto shrink-0">
                                    {trend.growth && (
                                        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex items-center gap-1 whitespace-nowrap">
                                            <ArrowUpRight size={14} /> {trend.growth}
                                        </span>
                                    )}
                                    <span className="text-xs text-white/40 uppercase font-bold tracking-wider">{trend.category}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Sidebar: Audio & Keywords */}
                <div className="md:w-80 space-y-6">

                    {/* Trending Audio */}
                    <div className="glass-panel p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Music className="text-purple-400" /> Viral Audio
                            {aiInsights && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded ml-auto">AI Picked</span>}
                        </h3>
                        <div className="space-y-3">
                            {trendingAudio.map((track, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{track.title}</p>
                                        <p className="text-xs text-white/50 truncate" title={track.reason || track.artist}>{track.artist}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play size={14} className="text-green-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hot Keywords */}
                    <div className="glass-panel p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Hash className="text-blue-400" /> Hot Keywords
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {hotKeywords.map(kw => (
                                <span key={kw} className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-bold cursor-pointer transition-colors border border-blue-500/20">
                                    {kw.startsWith('#') ? kw : `#${kw}`}
                                </span>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const ZapIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);

export default TrendingSidebar;

import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Clock, Hash, MessageSquare, Music, TrendingUp, Sparkles, Play, Pause, Loader, Bookmark, Globe, Share2, Flame, Wrench } from 'lucide-react';
import { searchTrack } from '../utils/musicService';

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className={`
                p-2 rounded-lg transition-all duration-300 relative overflow-hidden
                ${copied ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10 text-secondary hover:text-primary'}
            `}
            title="Copy to clipboard"
        >
            <div className={`transition-all duration-300 ${copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
                <Copy size={16} />
            </div>
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                <Check size={16} />
            </div>
        </button>
    );
};

const MusicPlayer = ({ song, artist }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const audioRef = useRef(null);

    const togglePlay = async () => {
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
        }

        if (audioUrl) {
            audioRef.current.play();
            setIsPlaying(true);
            return;
        }

        setIsLoading(true);
        const url = await searchTrack(song, artist);
        setIsLoading(false);

        if (url) {
            setAudioUrl(url);
            audioRef.current = new Audio(url);
            audioRef.current.onended = () => setIsPlaying(false);
            audioRef.current.play();
            setIsPlaying(true);
        } else {
            alert("Preview not available for this track.");
        }
    };

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    return (
        <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:scale-110 transition-all disabled:opacity-50 shadow-lg active:scale-95"
        >
            {isLoading ? <Loader size={14} className="animate-spin" /> : isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
        </button>
    );
};

export const ResultsSection = ({ results, onOpenPremium, onOpenEditor }) => {
    const [activeMusicTab, setActiveMusicTab] = useState('trending');

    if (!results) return null;

    const { viralPotential = 75, bestTime, captions, hashtags: rawHashtags, musicRecommendations = [] } = results;
    const hashtags = rawHashtags.flatMap(tag => tag.split(/(?=#)/g)).filter(tag => tag.trim() !== '');

    return (
        <div className="space-y-6 animate-fade-in pb-10">

            {/* Viral Audit Card */}
            <div className="glass-panel p-6 border-orange-500/30 bg-orange-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Flame size={100} className="text-orange-500" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                            <Flame size={20} fill="currentColor" />
                        </div>
                        <h3 className="text-xl font-bold text-primary">Viral Audit</h3>
                    </div>

                    {/* The Roast */}
                    <div className="mb-6 bg-black/20 p-4 rounded-xl border border-orange-500/20">
                        <p className="text-orange-200 italic text-lg font-medium text-center">"{results.roast || "No roast available."}"</p>
                    </div>

                    {/* Vibe Scores */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {Object.entries(results.scores || {}).map(([key, score]) => (
                            <div key={key} className="flex flex-col items-center gap-2">
                                <div className="relative w-16 h-16 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-700" />
                                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-orange-500" strokeDasharray={175.93} strokeDashoffset={175.93 - (175.93 * score) / 10} strokeLinecap="round" />
                                    </svg>
                                    <span className="absolute text-lg font-bold text-primary">{score}</span>
                                </div>
                                <span className="text-xs text-secondary uppercase font-bold">{key}</span>
                            </div>
                        ))}
                    </div>

                    {/* The Fix */}
                    <div>
                        <h4 className="text-sm font-bold text-secondary mb-3 flex items-center gap-2">
                            <Wrench size={14} className="text-blue-400" /> The Fix
                        </h4>
                        <ul className="space-y-2">
                            {(results.improvements || []).map((tip, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-secondary">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                        {onOpenEditor && (
                            <button
                                onClick={onOpenEditor}
                                className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
                            >
                                <Wrench size={14} /> Open Editor
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Viral Potential Card */}
                <div className="glass-panel p-5 flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2 text-secondary text-xs font-bold uppercase tracking-wider">
                            <TrendingUp size={14} className="text-emerald-400" /> Viral Score
                        </div>
                        <span className="text-2xl font-bold text-primary">{viralPotential}%</span>
                    </div>

                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                            style={{ width: `${viralPotential}%` }}
                        />
                    </div>
                    <p className="text-xs text-tertiary">High probability of engagement.</p>
                </div>

                {/* Best Time Card */}
                <div className="glass-panel p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-secondary text-xs font-bold uppercase tracking-wider mb-2">
                        <Clock size={14} className="text-amber-400" /> Best Time
                    </div>
                    <div>
                        <p className="text-xl font-bold text-primary">{bestTime}</p>
                        <p className="text-xs text-tertiary mt-1">Optimized for your audience.</p>
                    </div>
                </div>
            </div>

            {/* Captions */}
            <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2 text-secondary font-medium">
                        <MessageSquare size={16} className="text-indigo-400" />
                        <h3>Captions</h3>
                    </div>
                </div>
                <div className="space-y-3">
                    {captions.map((caption, idx) => (
                        <div key={idx} className="group p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all flex justify-between gap-4">
                            <p className="text-secondary text-sm leading-relaxed font-medium">{caption}</p>
                            <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <CopyButton text={caption} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hashtags */}
            <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2 text-secondary font-medium">
                        <Hash size={16} className="text-blue-400" />
                        <h3>Hashtags</h3>
                    </div>
                    <CopyButton text={hashtags.join(' ')} />
                </div>
                <div className="flex flex-wrap gap-2">
                    {hashtags.map((tag, idx) => (
                        <span
                            key={idx}
                            className="px-3 py-1.5 bg-blue-500/10 text-blue-300 rounded-lg text-xs font-medium border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-default"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Music */}
            {musicRecommendations.length > 0 && (
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2 text-secondary font-medium">
                            <Music size={16} className="text-rose-400" />
                            <h3>Audio</h3>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {musicRecommendations.map((track, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500/20 to-purple-500/20 rounded-lg flex items-center justify-center text-rose-300">
                                        <Music size={16} />
                                    </div>
                                    <div>
                                        <p className="text-primary text-sm font-bold">{track.song}</p>
                                        <p className="text-tertiary text-xs">{track.artist}</p>
                                    </div>
                                </div>
                                <MusicPlayer song={track.song} artist={track.artist} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Premium Features Button */}
            <div className="flex justify-center pt-6">
                <button
                    onClick={onOpenPremium}
                    className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <div className="relative flex items-center gap-2">
                        <Sparkles size={20} className="animate-pulse" />
                        <span>Unlock Premium Magic</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default ResultsSection;

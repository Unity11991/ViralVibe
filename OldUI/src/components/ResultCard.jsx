import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Clock, Hash, MessageSquare, Music, TrendingUp, Sparkles, Play, Pause, Loader, Bookmark, Globe } from 'lucide-react';
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
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            title="Copy to clipboard"
        >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
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

    // Cleanup audio on unmount
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
            className="w-8 h-8 flex items-center justify-center bg-white text-rose-500 rounded-full hover:scale-105 transition-all disabled:opacity-50 shadow-lg"
        >
            {isLoading ? <Loader size={14} className="animate-spin" /> : isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
        </button>
    );
};

export const ResultsSection = ({ results }) => {
    const [activeMusicTab, setActiveMusicTab] = useState('trending');

    if (!results) return null;

    const { viralPotential = 75, bestTime, captions, hashtags: rawHashtags, musicRecommendations = [] } = results;

    // Ensure hashtags are properly split and spaced
    const hashtags = rawHashtags.flatMap(tag => tag.split(/(?=#)/g)).filter(tag => tag.trim() !== '');

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in">

            {/* AI Insights Widget */}
            <div className="glass-panel p-6">
                <div className="flex items-center gap-2 mb-6 text-purple-300 border-b border-white/5 pb-4">
                    <Sparkles size={20} />
                    <h3 className="font-bold text-lg">AI Insights</h3>
                </div>

                <div className="space-y-6">
                    {/* Viral Potential */}
                    <div>
                        <div className="flex justify-between text-sm font-medium mb-2">
                            <span className="flex items-center gap-2 text-slate-300">
                                <TrendingUp size={16} className="text-blue-400" /> Viral Potential
                            </span>
                            <span className="text-white">{viralPotential}%</span>
                        </div>
                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${viralPotential}%` }}
                            />
                        </div>
                    </div>

                    {/* Best Time */}
                    <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-white/5">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <Clock size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Best Time to Post</p>
                            <p className="text-slate-200 font-medium">{bestTime}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Captions Widget */}
            <div className="glass-panel p-6">
                <div className="flex items-center gap-2 mb-4 text-pink-300">
                    <MessageSquare size={20} />
                    <h3 className="font-bold text-lg">Caption Suggestions</h3>
                </div>
                <div className="space-y-3">
                    {captions.map((caption, idx) => (
                        <div key={idx} className="group p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all">
                            <div className="flex justify-between items-start gap-4">
                                <p className="text-slate-200 leading-relaxed text-sm">{caption}</p>
                                <CopyButton text={caption} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hashtags Widget */}
            <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-blue-300">
                        <Hash size={20} />
                        <h3 className="font-bold text-lg">Viral Hashtags</h3>
                    </div>
                    <CopyButton text={hashtags.join(' ')} />
                </div>
                <div className="flex flex-wrap gap-2">
                    {hashtags.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-white/5 text-blue-300 rounded-full text-sm font-medium border border-white/10 hover:bg-white/10 transition-colors">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Music Recommendations Widget */}
            {musicRecommendations.length > 0 && (
                <div className="glass-panel p-6">
                    <div className="flex items-center gap-2 mb-4 text-rose-300">
                        <Music size={20} />
                        <h3 className="font-bold text-lg">Music Recommendations</h3>
                    </div>

                    {/* Music Tabs */}
                    <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg mb-4">
                        {[
                            { id: 'trending', label: 'Trending', icon: TrendingUp },
                            { id: 'international', label: 'International Music', icon: Globe },
                            { id: 'saved', label: 'Saved', icon: Bookmark },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveMusicTab(tab.id)}
                                className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeMusicTab === tab.id
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {activeMusicTab === tab.id && <tab.icon size={12} />}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {activeMusicTab === 'trending' ? (
                            musicRecommendations.map((track, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-purple-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                                            <Music size={18} />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">{track.song}</p>
                                            <p className="text-slate-400 text-xs">{track.artist}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button className="text-slate-500 hover:text-white transition-colors">
                                            <Bookmark size={18} />
                                        </button>
                                        <MusicPlayer song={track.song} artist={track.artist} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                {activeMusicTab === 'saved' ? 'No saved tracks yet.' : 'No international charts available.'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultsSection;

import React, { useState, useEffect, useRef } from 'react';
import { X, Music, Sparkles, Loader2, Play, Pause, ExternalLink, StopCircle } from 'lucide-react';
import { fetchMusicTrends, fetchTrackPreview } from '../utils/trendService';
import { generateTrendInsights } from '../utils/aiService';

const TrendingAudio = ({ onClose, settings }) => {
    const [trends, setTrends] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [aiInsights, setAiInsights] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Audio Player State
    const [playingTrackId, setPlayingTrackId] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const audioRef = useRef(new Audio());

    useEffect(() => {
        loadMusicOnOpen();

        // Cleanup audio on unmount
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    const loadMusicOnOpen = async () => {
        setIsLoading(true);
        const data = await fetchMusicTrends();
        if (data) {
            setTrends(data);
        }
        setIsLoading(false);
    };

    const handlePlayPreview = async (e, track) => {
        e.stopPropagation(); // Prevent selecting the track row if playing from list (optional)

        // If clicking the same track that is playing
        if (playingTrackId === track.id) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
            return;
        }

        // Stop current
        audioRef.current.pause();
        setIsPlaying(false);
        setPlayingTrackId(track.id);
        setIsLoadingAudio(true);

        // Fetch preview
        const previewUrl = await fetchTrackPreview(track.trackId);

        if (previewUrl) {
            audioRef.current.src = previewUrl;
            audioRef.current.volume = 0.5; // Default to 50%
            try {
                await audioRef.current.play();
                setIsPlaying(true);
            } catch (err) {
                console.error("Playback failed", err);
                setPlayingTrackId(null);
            }
        } else {
            console.warn("No preview available for", track.name);
            setPlayingTrackId(null); // Reset if failed
        }
        setIsLoadingAudio(false);

        // Auto-select track for analysis if not selected
        if (selectedTrack?.id !== track.id) {
            handleAnalyzeTrack(track);
        }
    };

    const handleAnalyzeTrack = async (track) => {
        setSelectedTrack(track);
        setAiInsights(null);
        setIsGenerating(true);

        try {
            // Contextualize for AI: "Generate a Reel idea for this song"
            // We reuse the trend insight service but with music context
            const insight = await generateTrendInsights([track], settings.apiKey);
            setAiInsights(insight);
        } catch (error) {
            console.error("AI Insight Error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-5xl bg-[#0f0f12] rounded-3xl border border-pink-500/20 shadow-2xl overflow-hidden flex flex-col h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-pink-500/10 bg-pink-950/20 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Music className="text-pink-400 fill-pink-400" size={24} />
                            Trending Audio
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider border border-white/10">
                                Apple Music Top 25
                            </span>
                        </h2>
                        <p className="text-pink-200/60 mt-1">Real-time viral songs from the charts. Analyzed for Reels.</p>
                    </div>
                    <button onClick={() => {
                        audioRef.current.pause();
                        onClose();
                    }} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Music List */}
                    <div className="w-1/3 border-r border-white/5 overflow-y-auto custom-scrollbar bg-black/20">
                        {isLoading ? (
                            <div className="p-8 text-center">
                                <Loader2 className="animate-spin text-pink-500 mx-auto mb-2" size={24} />
                                <p className="text-xs text-slate-500">Fetching charts...</p>
                            </div>
                        ) : (
                            <div className="space-y-1 p-2">
                                {trends.map((track, index) => (
                                    <button
                                        key={track.id}
                                        onClick={() => handleAnalyzeTrack(track)}
                                        className={`w-full text-left p-2 rounded-xl transition-all border group relative overflow-hidden flex items-center gap-3 ${selectedTrack?.id === track.id
                                            ? 'bg-pink-500/10 border-pink-500/40 text-white'
                                            : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-300 hover:text-white'
                                            }`}
                                    >
                                        <div className="relative w-10 h-10 shrink-0">
                                            {/* Rank or Play Button */}
                                            <div className="absolute inset-0 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-slate-400 overflow-hidden group-hover:hidden">
                                                {playingTrackId === track.id && isPlaying ? (
                                                    <span className="animate-pulse bg-pink-500 w-full h-full flex items-center justify-center text-white"><Music size={14} /></span>
                                                ) : (
                                                    index + 1
                                                )}
                                            </div>

                                            {/* Play Toggle Overlay (Hover) */}
                                            <div
                                                onClick={(e) => handlePlayPreview(e, track)}
                                                className={`absolute inset-0 rounded flex items-center justify-center cursor-pointer transition-colors z-10 ${playingTrackId === track.id
                                                    ? 'bg-pink-500 text-white'
                                                    : 'bg-white text-black opacity-0 group-hover:opacity-100'
                                                    }`}
                                            >
                                                {isLoadingAudio && playingTrackId === track.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : playingTrackId === track.id && isPlaying ? (
                                                    <Pause size={16} fill="currentColor" />
                                                ) : (
                                                    <Play size={16} fill="currentColor" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden shrink-0">
                                            {track.image && <img src={track.image} alt={track.name} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className={`font-bold leading-tight truncate ${playingTrackId === track.id ? 'text-pink-400' : ''}`}>{track.name}</h4>
                                            <p className="text-xs text-slate-500 truncate">{track.growth}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Analysis Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gradient-to-br from-[#0f0f12] to-pink-950/10">
                        {!selectedTrack ? (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-50">
                                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse">
                                    <Music size={48} className="text-slate-600" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Select a Track</h3>
                                <p className="text-slate-400">Choose a song from the charts to listen and generate Reel concepts.</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in space-y-8">
                                {/* Track Header */}
                                <div className="flex items-start gap-6">
                                    <div className="relative w-40 h-40 rounded-2xl bg-white/10 overflow-hidden shadow-2xl border border-white/10 shrink-0 group">
                                        {selectedTrack.image && <img src={selectedTrack.image} alt={selectedTrack.name} className="w-full h-full object-cover" />}

                                        {/* Large Action Overlay */}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handlePlayPreview(e, selectedTrack)}
                                                className="w-14 h-14 rounded-full bg-pink-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
                                            >
                                                {isLoadingAudio && playingTrackId === selectedTrack.id ? (
                                                    <Loader2 size={24} className="animate-spin" />
                                                ) : playingTrackId === selectedTrack.id && isPlaying ? (
                                                    <Pause size={24} fill="currentColor" />
                                                ) : (
                                                    <Play size={24} fill="currentColor" className="ml-1" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 pt-2">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="px-2 py-1 rounded bg-pink-500/20 text-pink-400 text-xs font-bold">TRENDING AUDIO</span>
                                            {playingTrackId === selectedTrack.id && (
                                                <span className="flex items-center gap-1 text-pink-400 text-xs font-bold animate-pulse">
                                                    <Music size={12} /> NOW PLAYING
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-4xl font-bold text-white mb-2 leading-tight">{selectedTrack.name}</h2>
                                        <p className="text-xl text-slate-400 mb-6">{selectedTrack.growth}</p>

                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={(e) => handlePlayPreview(e, selectedTrack)}
                                                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all ${playingTrackId === selectedTrack.id && isPlaying
                                                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
                                                    : 'bg-white text-black hover:bg-slate-200'
                                                    }`}
                                            >
                                                {playingTrackId === selectedTrack.id && isPlaying ? (
                                                    <><Pause size={18} fill="currentColor" /> Pause Preview</>
                                                ) : (
                                                    <><Play size={18} fill="currentColor" /> Play Preview</>
                                                )}
                                            </button>

                                            <a
                                                href={selectedTrack.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 text-white font-bold text-sm hover:bg-white/10 border border-white/10 transition-colors"
                                            >
                                                Open in Music <ExternalLink size={16} />
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Strategy Section */}
                                {isGenerating ? (
                                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center animate-pulse">
                                        <Sparkles className="animate-spin text-pink-400 mx-auto mb-4" size={32} />
                                        <h3 className="text-lg font-bold text-white mb-2">Listening & Brainstorming...</h3>
                                        <p className="text-slate-400 text-sm">AI is creating a video concept for this song.</p>
                                    </div>
                                ) : aiInsights ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-4">
                                            {aiInsights.ideas?.map((idea, idx) => (
                                                <div key={idx} className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Sparkles size={18} className="text-pink-400" />
                                                        <span className="text-xs font-bold text-pink-300 uppercase">Video Concept</span>
                                                    </div>
                                                    <h4 className="text-lg font-bold text-white mb-2">{idea.title}</h4>
                                                    <p className="text-sm text-slate-300 leading-relaxed mb-4">{idea.description}</p>

                                                    {/* Hook Suggestion */}
                                                    <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Text Overlay Hook</p>
                                                        <p className="text-white font-medium">"{idea.hook || `Using ${selectedTrack.name} for...`}"</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                                        <p className="text-red-400">Failed to generate insights. Ensure your API Key is set.</p>
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

export default TrendingAudio;

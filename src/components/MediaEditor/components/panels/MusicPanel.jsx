import React, { useState, useRef } from 'react';
import { Play, Pause, Plus, Search, Music, Volume2, VolumeX } from 'lucide-react';

// Curated list of royalty-free music (using SoundHelix for demo purposes)
// In a real app, these would be hosted on a CDN or bundled
const MUSIC_LIBRARY = [
    {
        id: 'upbeat-1',
        name: 'Summer Vibes',
        artist: 'SoundHelix',
        category: 'Upbeat',
        duration: 372,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=100&h=100&fit=crop'
    },
    {
        id: 'cinematic-1',
        name: 'Epic Journey',
        artist: 'SoundHelix',
        category: 'Cinematic',
        duration: 425,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        cover: 'https://images.unsplash.com/photo-1459749411177-0473ef7161cf?w=100&h=100&fit=crop'
    },
    {
        id: 'lofi-1',
        name: 'Chill Study',
        artist: 'SoundHelix',
        category: 'Lo-Fi',
        duration: 315,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        cover: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=100&h=100&fit=crop'
    },
    {
        id: 'corporate-1',
        name: 'Business Success',
        artist: 'SoundHelix',
        category: 'Corporate',
        duration: 300,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop'
    },
    {
        id: 'ambient-1',
        name: 'Deep Space',
        artist: 'SoundHelix',
        category: 'Ambient',
        duration: 350,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        cover: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=100&h=100&fit=crop'
    },
    {
        id: 'upbeat-2',
        name: 'Happy Days',
        artist: 'SoundHelix',
        category: 'Upbeat',
        duration: 320,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        cover: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=100&h=100&fit=crop'
    },
    {
        id: 'cinematic-2',
        name: 'Heroic Rise',
        artist: 'SoundHelix',
        category: 'Cinematic',
        duration: 400,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
        cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=100&h=100&fit=crop'
    },
    {
        id: 'lofi-2',
        name: 'Night Rain',
        artist: 'SoundHelix',
        category: 'Lo-Fi',
        duration: 280,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
        cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100&h=100&fit=crop'
    }
];

const CATEGORIES = ['All', 'Upbeat', 'Cinematic', 'Lo-Fi', 'Corporate', 'Ambient'];

export const MusicPanel = ({ onAddAsset, onUpload }) => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [playingId, setPlayingId] = useState(null);
    const audioRef = useRef(null);

    const filteredMusic = MUSIC_LIBRARY.filter(track => {
        const matchesCategory = activeCategory === 'All' || track.category === activeCategory;
        const matchesSearch = track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            track.artist.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handlePlayPause = (track) => {
        if (playingId === track.id) {
            // Pause
            audioRef.current.pause();
            setPlayingId(null);
        } else {
            // Play new
            if (audioRef.current) {
                audioRef.current.src = track.url;
                audioRef.current.play().catch(e => console.error("Audio play error:", e));
                setPlayingId(track.id);
            }
        }
    };

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Hidden Audio Element for Preview */}
            <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

            {/* Search and Upload */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                    <input
                        type="text"
                        placeholder="Search music..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                <div className="p-4 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-white/30 hover:border-blue-500/50 hover:bg-white/5 transition-all cursor-pointer relative group">
                    <input
                        type="file"
                        accept="audio/*"
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                Array.from(e.target.files).forEach(file => {
                                    onUpload(file);
                                });
                            }
                        }}
                    />
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                        <Music size={20} />
                    </div>
                    <span className="text-xs font-medium">Upload your own music</span>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === cat
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {filteredMusic.map(track => (
                    <div
                        key={track.id}
                        className={`group flex items-center gap-3 p-2 rounded-xl transition-all ${playingId === track.id ? 'bg-white/10 border-white/10' : 'bg-transparent hover:bg-white/5 border border-transparent hover:border-white/5'
                            }`}
                    >
                        {/* Cover / Play Button */}
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={track.cover} alt={track.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                            <button
                                onClick={() => handlePlayPause(track)}
                                className={`absolute inset-0 flex items-center justify-center text-white transition-transform ${playingId === track.id ? 'scale-100' : 'scale-0 group-hover:scale-100'
                                    }`}
                            >
                                {playingId === track.id ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                            </button>
                            {/* Equalizer animation when playing */}
                            {playingId === track.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 animate-pulse" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${playingId === track.id ? 'text-blue-400' : 'text-white'}`}>
                                {track.name}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <span>{track.artist}</span>
                                <span>•</span>
                                <span>{formatDuration(track.duration)}</span>
                            </div>
                        </div>

                        {/* Add Button */}
                        <button
                            onClick={() => onAddAsset('audio', {
                                url: track.url,
                                name: track.name,
                                duration: track.duration,
                                artist: track.artist,
                                cover: track.cover
                            })}
                            className="p-2 rounded-lg bg-white/5 hover:bg-blue-500 text-white/60 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                            title="Add to timeline"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                ))}

                {filteredMusic.length === 0 && (
                    <div className="text-center py-8 text-white/30 text-sm">
                        No music found
                    </div>
                )}
            </div>
        </div>
    );
};

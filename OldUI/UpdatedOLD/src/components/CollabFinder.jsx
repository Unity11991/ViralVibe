import React, { useState, useEffect } from 'react';
import { Users, Search, MessageCircle, Star, Briefcase, Instagram, Youtube, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const CollabFinder = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        niche: '',
        bio: '',
        contact_email: '',
        looking_for_collab: true
    });

    const NICHES = ['Fashion', 'Tech', 'Fitness', 'Food', 'Travel', 'Gaming', 'Lifestyle', 'Business'];

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) {
                setProfile(data);
                setFormData({
                    niche: data.niche || '',
                    bio: data.bio || '',
                    contact_email: data.contact_email || '',
                    looking_for_collab: data.looking_for_collab ?? true
                });
                if (data.niche) {
                    findMatches(data.niche);
                }
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const findMatches = async (niche) => {
        setLoading(true);
        try {
            // 1. Search Internal Users (Real GoVyral Users)
            const { data: internalMatches, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('niche', niche)
                .neq('id', user.id) // Exclude self
                .limit(10);

            if (error) throw error;

            let allMatches = internalMatches || [];

            const scoredMatches = allMatches.map(match => ({
                ...match,
                match_score: calculateMatchScore(match)
            }));

            setMatches(scoredMatches);

        } catch (error) {
            console.error("Error finding matches:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateMatchScore = (match) => {
        let score = 60;
        if (match.looking_for_collab) score += 30;
        if (match.bio && match.bio.length > 20) score += 10;
        return Math.min(score, 99);
    };

    const handleExternalSearch = (platform) => {
        const query = encodeURIComponent(`site:${platform}.com ${profile.niche} content creator`);
        window.open(`https://www.google.com/search?q=${query}`, '_blank');
    };

    const handleConnect = (match) => {
        if (match.contact_email) {
            window.location.href = `mailto:${match.contact_email}?subject=Collab Request from GoVyral&body=Hi ${match.full_name || match.username || 'Creator'}, I saw your profile on GoVyral and would love to collaborate!`;
        } else {
            alert("This user hasn't provided a contact email yet.");
        }
    };

    const handleSaveProfile = async () => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    niche: formData.niche,
                    bio: formData.bio,
                    contact_email: formData.contact_email,
                    looking_for_collab: formData.looking_for_collab
                })
                .eq('id', user.id);

            if (error) throw error;

            setProfile({ ...profile, ...formData });
            setIsEditing(false);
            findMatches(formData.niche);
            alert("Profile updated!");
        } catch (error) {
            alert("Error updating profile");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    if (!profile?.niche || isEditing) {
        return (
            <div className="max-w-2xl mx-auto glass-panel p-8 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-400">
                        <Users size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Setup Your Creator Profile</h2>
                    <p className="text-slate-400">Tell us about yourself to find the perfect collaboration partners.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Your Niche</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {NICHES.map(niche => (
                                <button
                                    key={niche}
                                    onClick={() => setFormData({ ...formData, niche })}
                                    className={`p-3 rounded-xl border transition-all ${formData.niche === niche ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {niche}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Bio</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full h-32 bg-slate-800 border border-white/10 rounded-xl p-4 text-white focus:border-pink-500 outline-none resize-none"
                            placeholder="Describe your content style and what kind of collabs you're looking for..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Contact Email (Public)</label>
                        <input
                            type="email"
                            value={formData.contact_email}
                            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl p-4 text-white focus:border-pink-500 outline-none"
                            placeholder="email@example.com"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={formData.looking_for_collab}
                            onChange={(e) => setFormData({ ...formData, looking_for_collab: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-600 text-pink-600 focus:ring-pink-500 bg-slate-800"
                        />
                        <span className="text-slate-300">I am actively looking for collaborations</span>
                    </div>

                    <button
                        onClick={handleSaveProfile}
                        disabled={!formData.niche}
                        className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/20 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        Find Matches
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="text-pink-400" /> Best Collab Matches
                    </h2>
                    <p className="text-slate-400">Based on your niche: <span className="text-white font-bold">{profile.niche}</span></p>
                </div>
                <button onClick={() => setIsEditing(true)} className="text-sm text-pink-400 hover:text-pink-300 underline">
                    Edit Profile
                </button>
            </div>

            {/* Internal Matches Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.length > 0 ? (
                    matches.map((match) => (
                        <div key={match.id} className="glass-panel p-6 hover:bg-slate-800/80 transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                                        {match.avatar_url ? (
                                            <img src={match.avatar_url} alt={match.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            (match.full_name || match.username || 'U')[0].toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{match.full_name || match.username || 'Anonymous'}</h3>
                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Briefcase size={12} /> {match.niche}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                                    {match.match_score}% Match
                                </div>
                            </div>

                            <p className="text-slate-300 text-sm mb-6 line-clamp-2 min-h-[40px]">
                                {match.bio || "No bio provided."}
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleConnect(match)}
                                    className="flex-1 py-2 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <MessageCircle size={16} /> Connect
                                </button>
                                <button className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                    <Star size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 glass-panel">
                        <Users size={48} className="mx-auto text-slate-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-300">No internal matches found</h3>
                        <p className="text-slate-500">Try our external search tools below to find creators on social media.</p>
                    </div>
                )}
            </div>

            {/* External Search Tools */}
            <div className="glass-panel p-6 border-t border-white/10 mt-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Search className="text-blue-400" /> Find Real Users on Social Media
                </h3>
                <p className="text-slate-400 mb-6 text-sm">
                    Search for creators in the <strong>{profile.niche}</strong> niche on other platforms.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <button
                        onClick={() => handleExternalSearch('instagram')}
                        className="p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        <Instagram size={18} /> Search Instagram
                    </button>
                    <button
                        onClick={() => handleExternalSearch('tiktok')}
                        className="p-4 bg-black border border-white/20 rounded-xl font-bold text-white hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
                    >
                        <Video size={18} /> Search TikTok
                    </button>
                    <button
                        onClick={() => handleExternalSearch('youtube')}
                        className="p-4 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Youtube size={18} /> Search YouTube
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CollabFinder;

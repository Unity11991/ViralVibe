import React, { useState } from 'react';
import { X, Calendar, Clock, Send, Instagram, Youtube, Linkedin, Twitter } from 'lucide-react';

const SchedulerModal = ({ isOpen, onClose, content, onSchedule, initialDate = '', initialTime = '', initialHashtags = '', initialMusic = '', generatedCaptions = [], generatedHashtags = [], generatedMusic = [] }) => {
    // Helper to convert 12h format (8:00 AM) to 24h format (08:00) for input type="time"
    const convertTo24Hour = (timeStr) => {
        if (!timeStr) return '';
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return timeStr; // Assume already 24h or invalid

        let [_, hours, minutes, modifier] = match;
        hours = parseInt(hours, 10);

        if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;

        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    };

    const [date, setDate] = useState(initialDate);
    const [time, setTime] = useState(convertTo24Hour(initialTime));
    const [platform, setPlatform] = useState('instagram');
    const [caption, setCaption] = useState(content);
    const [hashtags, setHashtags] = useState(initialHashtags);
    const [music, setMusic] = useState(initialMusic);
    const [loading, setLoading] = useState(false);

    // Update state when props change
    React.useEffect(() => {
        if (isOpen) {
            setCaption(content);
            setHashtags(initialHashtags);
            setMusic(initialMusic);
            setDate(initialDate);
            setTime(convertTo24Hour(initialTime));
        }
    }, [isOpen, content, initialHashtags, initialMusic, initialDate, initialTime]);

    if (!isOpen) return null;

    const handleSchedule = async () => {
        if (!date || !time) {
            alert("Please select both date and time.");
            return;
        }

        setLoading(true);
        try {
            await onSchedule({
                platform,
                date,
                time,
                caption,
                hashtags,
                music,
                scheduled_at: new Date(`${date}T${time}`).toISOString()
            });
            onClose();
        } catch (error) {
            console.error("Scheduling failed:", error);
            alert("Failed to schedule post. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#1a1a1f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#1a1a1f] z-10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar className="text-indigo-400" size={20} />
                        Schedule Post
                    </h3>
                    <button onClick={onClose} className="text-secondary hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Content Preview */}
                    {/* Content Editor */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-secondary flex justify-between">
                                Caption
                                {generatedCaptions.length > 0 && <span className="text-xs text-indigo-400">AI Suggestions Available</span>}
                            </label>

                            {/* Suggested Captions Dropdown/List */}
                            {generatedCaptions.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                                    {generatedCaptions.map((cap, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCaption(cap)}
                                            className="whitespace-nowrap px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-secondary hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
                                        >
                                            Option {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none resize-none"
                                placeholder="Write your caption..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-secondary">Hashtags</label>

                            {/* Suggested Hashtags */}
                            {generatedHashtags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2 max-h-20 overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-lg">
                                    {generatedHashtags.map((tag, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setHashtags(prev => prev.includes(tag) ? prev : `${prev} ${tag}`.trim())}
                                            className="px-2 py-1 rounded text-[10px] bg-blue-500/10 text-blue-300 hover:bg-blue-500/30 transition-colors"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <textarea
                                value={hashtags}
                                onChange={(e) => setHashtags(e.target.value)}
                                className="w-full h-16 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-indigo-300 focus:border-indigo-500 outline-none resize-none"
                                placeholder="#viral #trending..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-secondary">Music / Audio</label>
                            <div className="relative">
                                <select
                                    value={music}
                                    onChange={(e) => setMusic(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none appearance-none"
                                >
                                    <option value="">Select suggested audio...</option>
                                    {generatedMusic.map((m, idx) => (
                                        <option key={idx} value={`${m.song} - ${m.artist}`}>
                                            {m.song} - {m.artist}
                                        </option>
                                    ))}
                                    <option disabled>--- Generic ---</option>
                                    <option value="Trending: Lo-Fi Beats">Trending: Lo-Fi Beats</option>
                                    <option value="Viral: Upbeat Pop">Viral: Upbeat Pop</option>
                                    <option value="Mood: Cinematic Ambient">Mood: Cinematic Ambient</option>
                                    <option value="Trending: Phonk">Trending: Phonk</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Platform Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary">Select Platform</label>
                        <div className="flex gap-3">
                            {['instagram', 'facebook', 'youtube', 'twitter', 'linkedin'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPlatform(p)}
                                    className={`p-3 rounded-xl border transition-all ${platform === p
                                        ? 'bg-indigo-500/20 border-indigo-500 text-white'
                                        : 'bg-white/5 border-transparent text-secondary hover:bg-white/10'
                                        }`}
                                    title={p}
                                >
                                    {p === 'instagram' && <Instagram size={20} />}
                                    {p === 'facebook' && <span className="font-bold text-lg">Fb</span>}
                                    {p === 'youtube' && <Youtube size={20} />}
                                    {p === 'twitter' && <Twitter size={20} />}
                                    {p === 'linkedin' && <Linkedin size={20} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-secondary">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-secondary">Time</label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSchedule}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Clock size={18} />
                                Confirm Schedule
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SchedulerModal;

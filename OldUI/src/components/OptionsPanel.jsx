import React from 'react';
import { Settings, Key, Hash, MessageCircle, CheckCircle } from 'lucide-react';

const MOODS = [
    { id: 'adventurous', label: 'Adventurous', icon: '🌍' },
    { id: 'angry', label: 'Angry', icon: '😠' },
    { id: 'casual', label: 'Casual & Friendly', icon: '😊' },
    { id: 'confident', label: 'Confident & Bold', icon: '💪' },
    { id: 'divine', label: 'Divine & Spiritual', icon: '🕉️' },
    { id: 'dreamy', label: 'Dreamy & Whimsical', icon: '☁️' },
    { id: 'educational', label: 'Educational', icon: '📚' },
    { id: 'excited', label: 'Excited & Energetic', icon: '🔥' },
    { id: 'fierce', label: 'Fierce & Powerful', icon: '⚡' },
    { id: 'fun', label: 'Fun & Playful', icon: '😂' },
    { id: 'grateful', label: 'Grateful & Thankful', icon: '🙏' },
    { id: 'heartbroken', label: 'Heartbroken', icon: '💔' },
    { id: 'inspirational', label: 'Inspirational', icon: '✨' },
    { id: 'loving', label: 'Loving & Caring', icon: '❤️' },
    { id: 'motivational', label: 'Motivational', icon: '💪' },
    { id: 'mysterious', label: 'Mysterious', icon: '🌙' },
    { id: 'nostalgic', label: 'Nostalgic', icon: '🌅' },
    { id: 'peaceful', label: 'Peaceful & Zen', icon: '🧘' },
    { id: 'professional', label: 'Professional', icon: '💼' },
    { id: 'promotional', label: 'Promotional', icon: '📢' },
    { id: 'rebellious', label: 'Rebellious & Bold', icon: '🤘' },
];

const PLATFORMS = [
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'linkedin', label: 'LinkedIn', icon: '👔' },
    { id: 'twitter', label: 'Twitter / X', icon: '🐦' },
    { id: 'tiktok', label: 'TikTok', icon: '🎵' },
];

const OptionsPanel = ({ settings, onSettingsChange, showMoodError }) => {
    const isEnvKey = !!import.meta.env.VITE_GROQ_API_KEY;
    const isEnvModel = !!import.meta.env.VITE_AI_MODEL;
    const [isMoodOpen, setIsMoodOpen] = React.useState(false);

    const handleChange = (key, value) => {
        onSettingsChange({ ...settings, [key]: value });
        if (key === 'mood') setIsMoodOpen(false);
    };

    const selectedMood = MOODS.find(m => m.id === settings.mood);

    return (
        <div className="glass-panel p-8 w-full max-w-2xl mx-auto mb-10 animate-fade-in">
            {(!isEnvKey || !isEnvModel) && (
                <div className="flex items-center gap-3 mb-8 text-purple-300 border-b border-white/5 pb-4">
                    <Settings size={22} />
                    <h3 className="font-bold text-xl tracking-wide">Customize Your Vibe</h3>
                </div>
            )}

            <div className="space-y-8">
                {/* API Key Section */}
                {!isEnvKey && (
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                            <Key size={14} /> Groq API Key
                        </label>
                        <input
                            type="password"
                            value={settings.apiKey}
                            onChange={(e) => handleChange('apiKey', e.target.value)}
                            placeholder="Enter your Groq API Key"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                        <p className="text-xs text-slate-500 ml-1">
                            Your key is stored locally in your browser for this session only.
                        </p>
                    </div>
                )}

                {/* Model Selector */}
                {!isEnvModel && (
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                            <Settings size={14} /> AI Model
                        </label>
                        <input
                            type="text"
                            value={settings.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            placeholder="e.g., llama-3.2-11b-vision-preview"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                    </div>
                )}

                {/* Platform Selector */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                        <Hash size={14} /> Caption Language
                    </label>
                    <div className="relative">
                        <select
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white appearance-none focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                            value="English"
                            disabled
                        >
                            <option>English</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 ml-1">Selected: en</p>
                </div>

                {/* Mood Selector */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                        <MessageCircle size={14} /> Select Caption Mood
                    </label>
                    <div className={`relative ${showMoodError ? 'p-1 bg-red-500/10 border border-red-500/50 rounded-xl' : ''}`}>
                        <button
                            onClick={() => setIsMoodOpen(!isMoodOpen)}
                            className={`w-full bg-white text-slate-900 rounded-lg px-4 py-3.5 flex items-center justify-between transition-all ${showMoodError ? 'border-red-500' : 'border-transparent'}`}
                        >
                            <span className={`flex items-center gap-2 ${!selectedMood ? 'text-slate-400' : ''}`}>
                                {selectedMood ? (
                                    <><span>{selectedMood.icon}</span> {selectedMood.label}</>
                                ) : (
                                    "Choose the mood for your captions..."
                                )}
                            </span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform ${isMoodOpen ? 'rotate-180' : ''}`}>
                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {isMoodOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-[300px] overflow-y-auto">
                                {MOODS.map((mood) => (
                                    <button
                                        key={mood.id}
                                        onClick={() => handleChange('mood', mood.id)}
                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors border-b border-slate-100 last:border-0"
                                    >
                                        <span className="text-lg">{mood.icon}</span>
                                        <span className="font-medium">{mood.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {showMoodError && (
                        <p className="text-xs text-red-400 font-medium ml-1">Please select a mood to continue.</p>
                    )}
                </div>

                {/* Length Selector */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                        <CheckCircle size={14} /> Select Caption Length
                    </label>
                    <div className="flex bg-slate-800/40 rounded-xl p-1 border border-white/5">
                        {['Short', 'Medium', 'Long'].map((len) => (
                            <button
                                key={len}
                                onClick={() => handleChange('length', len)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                                    ${settings.length === len
                                        ? 'bg-white text-slate-900 shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {len}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Special Requirements */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                        <Settings size={14} /> Special Requirements (Optional)
                    </label>
                    <div>
                        
                    </div>
                    <textarea
                        value={settings.customInstructions || ''}
                        onChange={(e) => handleChange('customInstructions', e.target.value)}
                        placeholder="e.g., birthday wish, anniversary, graduation, product launch, holiday greeting..."
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all min-h-[100px] resize-y"
                    />
                    <div className="flex justify-end">
                        <span className="text-xs text-slate-500">{(settings.customInstructions || '').length}/120</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OptionsPanel;

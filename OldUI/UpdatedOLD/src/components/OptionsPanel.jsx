import React from 'react';
import { Settings, Key, Hash, MessageCircle, CheckCircle, ChevronDown, Sliders } from 'lucide-react';

const MOODS = [
    { id: 'best', label: 'Best Match', icon: '✨' },
    { id: 'adventurous', label: 'Adventurous', icon: '🌍' },
    { id: 'angry', label: 'Angry', icon: '😠' },
    { id: 'casual', label: 'Casual', icon: '😊' },
    { id: 'confident', label: 'Confident', icon: '💪' },
    { id: 'divine', label: 'Divine', icon: '🕉️' },
    { id: 'dreamy', label: 'Dreamy', icon: '☁️' },
    { id: 'educational', label: 'Educational', icon: '📚' },
    { id: 'excited', label: 'Excited', icon: '🔥' },
    { id: 'fierce', label: 'Fierce', icon: '⚡' },
    { id: 'fun', label: 'Fun', icon: '😂' },
    { id: 'grateful', label: 'Grateful', icon: '🙏' },
    { id: 'heartbroken', label: 'Heartbroken', icon: '💔' },
    { id: 'inspirational', label: 'Inspirational', icon: '✨' },
    { id: 'loving', label: 'Loving', icon: '❤️' },
    { id: 'motivational', label: 'Motivational', icon: '💪' },
    { id: 'mysterious', label: 'Mysterious', icon: '🌙' },
    { id: 'nostalgic', label: 'Nostalgic', icon: '🌅' },
    { id: 'peaceful', label: 'Peaceful', icon: '🧘' },
    { id: 'professional', label: 'Professional', icon: '💼' },
    { id: 'promotional', label: 'Promotional', icon: '📢' },
    { id: 'rebellious', label: 'Rebellious', icon: '🤘' },
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
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex items-center gap-2 text-primary/80 pb-2 border-b border-white/5">
                <Sliders size={18} />
                <h3 className="font-medium tracking-wide">Configuration</h3>
            </div>

            <div className="space-y-5">
                {/* API Key Section */}
                {!isEnvKey && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-wider">
                            Groq API Key
                        </label>
                        <input
                            type="password"
                            value={settings.apiKey}
                            onChange={(e) => handleChange('apiKey', e.target.value)}
                            placeholder="Enter your Groq API Key"
                            className="w-full input-liquid px-4 py-3 placeholder-secondary focus:ring-1 focus:ring-indigo-500/50"
                        />
                    </div>
                )}

                {/* Model Selector */}
                {!isEnvModel && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-wider">
                            AI Model
                        </label>
                        <input
                            type="text"
                            value={settings.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            placeholder="e.g., llama-3.2-11b-vision-preview"
                            className="w-full input-liquid px-4 py-3 placeholder-secondary focus:ring-1 focus:ring-indigo-500/50"
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    {/* Platform Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-wider">
                            Platform
                        </label>
                        <div className="relative">
                            <select
                                className="w-full input-liquid px-4 py-3 appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                                value={settings.platform}
                                onChange={(e) => handleChange('platform', e.target.value)}
                            >
                                <option value="instagram">Instagram</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="twitter">Twitter / X</option>
                                <option value="tiktok">TikTok</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Length Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-wider">
                            Length
                        </label>
                        <div className="relative">
                            <select
                                className="w-full input-liquid px-4 py-3 appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                                value={settings.length}
                                onChange={(e) => handleChange('length', e.target.value)}
                            >
                                <option value="Short">Short</option>
                                <option value="Medium">Medium</option>
                                <option value="Long">Long</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mood Selector */}
                <div className="space-y-2 relative z-20">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Vibe / Mood
                    </label>

                    <div className={`relative ${showMoodError ? 'ring-1 ring-red-500 rounded-xl' : ''}`}>
                        <button
                            onClick={() => setIsMoodOpen(!isMoodOpen)}
                            className={`w-full input-liquid px-4 py-3 flex items-center justify-between transition-all hover:bg-white/5 ${showMoodError ? 'bg-red-500/10' : ''}`}
                        >
                            <span className={`flex items-center gap-3 ${!selectedMood ? 'text-secondary' : 'text-primary'}`}>
                                {selectedMood ? (
                                    <>
                                        <span className="text-lg">{selectedMood.icon}</span>
                                        <span className="font-medium">{selectedMood.label}</span>
                                    </>
                                ) : (
                                    "Select a vibe..."
                                )}
                            </span>
                            <ChevronDown size={16} className={`text-secondary transition-transform duration-300 ${isMoodOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isMoodOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-xl overflow-hidden z-50 max-h-[300px] overflow-y-auto animate-fade-in custom-scrollbar">
                                <div className="p-1 grid grid-cols-2 gap-1">
                                    {MOODS.map((mood) => (
                                        <button
                                            key={mood.id}
                                            onClick={() => handleChange('mood', mood.id)}
                                            className={`px-3 py-2 text-left rounded-lg flex items-center gap-2 transition-all
                                                ${settings.mood === mood.id
                                                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                                    : 'text-secondary hover:bg-white/5 hover:text-primary'
                                                }`}
                                        >
                                            <span className="text-base">{mood.icon}</span>
                                            <span className="text-sm font-medium">{mood.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Special Requirements */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Custom Instructions
                    </label>
                    <textarea
                        value={settings.customInstructions || ''}
                        onChange={(e) => handleChange('customInstructions', e.target.value)}
                        placeholder="Any specific details to include?"
                        className="w-full input-liquid px-4 py-3 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 min-h-[80px] resize-none text-sm"
                    />
                </div>
            </div>
        </div>
    );
};

export default OptionsPanel;

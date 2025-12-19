import React, { useState, useEffect } from 'react';
import { Video, Sparkles, Image as ImageIcon, Music, Swords, ArrowRight, MessageCircle, TrendingUp, Clock, FileText, BarChart2, Crown, Globe } from 'lucide-react';

const FeatureShowcase = ({ onSelectTool, user, onOpenAuth }) => {
    const [activePremiumIndex, setActivePremiumIndex] = useState(0);

    const premiumFeatures = [
        {
            id: 'brand-voice',
            title: 'Brand Voice Clone',
            description: 'Clone your unique writing style instantly.',
            icon: MessageCircle,
            color: 'text-pink-400',
            bg: 'bg-pink-500/20',
            border: 'border-pink-500/30'
        },
        {
            id: 'trend-alerts',
            title: 'Trend Alerts',
            description: 'Get notified about viral trends before they peak.',
            icon: TrendingUp,
            color: 'text-rose-400',
            bg: 'bg-rose-500/20',
            border: 'border-rose-500/30'
        },
        {
            id: 'smart-scheduler',
            title: 'Smart Scheduler',
            description: 'Post at the exact moment your audience is online.',
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-amber-500/20',
            border: 'border-amber-500/30'
        },
        {
            id: 'script-generator',
            title: 'Script Generator',
            description: 'Turn ideas into viral video scripts in seconds.',
            icon: FileText,
            color: 'text-lime-400',
            bg: 'bg-lime-500/20',
            border: 'border-lime-500/30'
        },
        {
            id: 'analytics',
            title: 'Deep Analytics',
            description: 'Uncover hidden growth opportunities with AI.',
            icon: BarChart2,
            color: 'text-violet-400',
            bg: 'bg-violet-500/20',
            border: 'border-violet-500/30'
        }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActivePremiumIndex((prev) => (prev + 1) % premiumFeatures.length);
        }, 4000); // Slower rotation for better readability
        return () => clearInterval(interval);
    }, []);

    const features = [
        {
            id: 'audio-studio',
            title: 'Audio Studio',
            description: 'Pro-level audio editing & mixing suite.',
            icon: Music,
            color: 'text-emerald-400',
            gradient: 'from-emerald-500/10 to-teal-500/5',
            border: 'border-emerald-500/20',
            delay: '0'
        },
        {
            id: 'video-editor',
            title: 'Video Editor',
            description: 'AI-powered video editing & effects.',
            icon: Video,
            color: 'text-blue-400',
            gradient: 'from-blue-500/10 to-indigo-500/5',
            border: 'border-blue-500/20',
            delay: '100'
        },
        // Premium Carousel Slot
        {
            id: 'premium-carousel',
            isCarousel: true,
            delay: '200'
        },
        {
            id: 'image-enhancer',
            title: 'Image Enhancer',
            description: 'Upscale & restore images to 4K quality.',
            icon: ImageIcon,
            color: 'text-purple-400',
            gradient: 'from-purple-500/10 to-fuchsia-500/5',
            border: 'border-purple-500/20',
            delay: '300'
        }
    ];

    return (
        <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            <div className="mb-8 animate-fade-in">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Sparkles className="text-yellow-400 fill-yellow-400/20" size={28} />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                        Creative Suite
                    </span>
                </h2>
                <p className="text-white/50 text-lg font-medium">
                    Everything you need to go viral, in one place.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                {/* Highlighted: Viral Intelligence */}
                <button
                    onClick={() => onSelectTool('intelligence-hub')}
                    className="group relative p-6 rounded-[2rem] text-left transition-all duration-500 hover:scale-[1.02] overflow-hidden bg-slate-900 border border-cyan-500/30 hover:border-cyan-400/50 shadow-lg shadow-cyan-500/10"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform duration-500">
                                <Globe size={28} />
                            </div>
                            <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider animate-pulse">
                                New
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                            Viral Intelligence
                        </h3>
                        <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                            Real-time trend analysis and market insights.
                        </p>
                    </div>
                </button>

                {/* Highlighted: Trend Alerts */}
                <button
                    onClick={() => {
                        if (!user) {
                            onOpenAuth();
                        } else {
                            onSelectTool('premium-hub', 'trend-alerts');
                        }
                    }}
                    className="group relative p-6 rounded-[2rem] text-left transition-all duration-500 hover:scale-[1.02] overflow-hidden bg-slate-900 border border-rose-500/30 hover:border-rose-400/50 shadow-lg shadow-rose-500/10"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp size={28} />
                            </div>
                            <div className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={10} /> Hot
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-rose-300 transition-colors">
                            Trend Alerts
                        </h3>
                        <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                            Catch viral waves before they peak.
                        </p>
                    </div>
                </button>
            </div>

            <h3 className="text-xl font-bold text-white/80 mb-4 px-2">Creative Tools</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {features.map((feature) => {
                    if (feature.isCarousel) {
                        const activeFeature = premiumFeatures[activePremiumIndex];
                        return (
                            <button
                                key="premium-carousel"
                                onClick={() => {
                                    if (!user) {
                                        onOpenAuth();
                                    } else {
                                        onSelectTool('premium-hub', activeFeature.id);
                                    }
                                }}
                                className="group relative p-1 rounded-[2rem] text-left transition-all duration-500 hover:scale-[1.02] animate-fade-in-up overflow-hidden"
                                style={{ animationDelay: `${feature.delay}ms` }}
                            >
                                {/* Animated Border Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-50 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-xy" />

                                {/* Inner Card Content */}
                                <div className="relative h-full bg-[#0f0f12] rounded-[1.9rem] p-6 flex flex-col justify-between overflow-hidden">
                                    {/* Shimmer Effect */}
                                    <div className="absolute inset-0 translate-x-[-100%] group-hover:animate-shimmer z-0 pointer-events-none" />

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`w-14 h-14 rounded-2xl ${activeFeature.bg} ${activeFeature.border} border flex items-center justify-center transition-all duration-500 shadow-[0_0_30px_-5px_rgba(0,0,0,0.3)]`}>
                                                <activeFeature.icon size={28} className={`${activeFeature.color} drop-shadow-lg`} />
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 backdrop-blur-md">
                                                <Crown size={14} className="text-yellow-400 fill-yellow-400" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-white">Premium</span>
                                            </div>
                                        </div>

                                        <div className="h-[100px]"> {/* Fixed height container for stability */}
                                            <h3 className="text-2xl font-bold text-white mb-2 transition-all duration-300">
                                                {activeFeature.title}
                                            </h3>

                                            <p className="text-white/60 text-sm leading-relaxed font-medium">
                                                {activeFeature.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm font-bold text-white group-hover:gap-3 transition-all mt-2">
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Unlock Power</span>
                                            <ArrowRight size={16} className="text-pink-400" />
                                        </div>
                                    </div>

                                    {/* Progress Indicators */}
                                    <div className="flex gap-1.5 mt-6 relative z-10">
                                        {premiumFeatures.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-1.5 rounded-full transition-all duration-500 ${idx === activePremiumIndex ? 'w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'w-1.5 bg-white/10'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={feature.id}
                            onClick={() => onSelectTool(feature.id)}
                            className={`
                                group relative p-6 rounded-[2rem] border text-left transition-all duration-300
                                bg-gradient-to-br ${feature.gradient} ${feature.border}
                                hover:scale-[1.02] hover:shadow-2xl hover:border-white/20 hover:bg-white/[0.02]
                                animate-fade-in-up
                            `}
                            style={{ animationDelay: `${feature.delay}ms` }}
                        >
                            <div className="relative z-10">
                                <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                    <feature.icon size={28} className={feature.color} />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-white transition-colors">
                                    {feature.title}
                                </h3>

                                <p className="text-white/50 text-sm mb-6 leading-relaxed font-medium min-h-[40px]">
                                    {feature.description}
                                </p>

                                <div className={`flex items-center gap-2 text-sm font-bold ${feature.color} opacity-90 group-hover:opacity-100 group-hover:gap-3 transition-all`}>
                                    Launch Tool <ArrowRight size={16} />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-auto pt-10 text-center animate-fade-in opacity-50 hover:opacity-100 transition-opacity" style={{ animationDelay: '500ms' }}>
                <p className="text-white/30 text-xs font-medium uppercase tracking-widest">
                    Powered by ViralVibe AI Engine v2.0
                </p>
            </div>
        </div>
    );
};

export default FeatureShowcase;

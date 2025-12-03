import React, { useState } from 'react';
import { X, Sparkles, MessageCircle, Layers, Eye, Split, Palette, ArrowRight, Check, Lock, Repeat, Hash, UserCircle, Anchor, Calendar, Mail, MessageSquare, Type } from 'lucide-react';
import { generatePremiumContent } from '../utils/aiService';

const FEATURES = [
    { id: 'brand-voice', label: 'Brand Voice Clone', icon: MessageCircle, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
    { id: 'carousel', label: 'Carousel Architect', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { id: 'competitor', label: 'Competitor Spy', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { id: 'ab-test', label: 'A/B Simulator', icon: Split, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { id: 'glow-up', label: 'Visual Glow Up', icon: Palette, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { id: 'repurpose', label: 'Repurpose Pro', icon: Repeat, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { id: 'hashtag', label: 'Hashtag Helix', icon: Hash, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { id: 'bio', label: 'Bio Doctor', icon: UserCircle, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
    { id: 'hooks', label: 'Hook Master', icon: Anchor, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { id: 'calendar', label: 'Content Calendar', icon: Calendar, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { id: 'email', label: 'Email Architect', icon: Mail, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { id: 'response', label: 'Response Bot', icon: MessageSquare, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    { id: 'thumbnail', label: 'Thumbnail Text', icon: Type, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
];

const PremiumHub = ({ isOpen, onClose, settings, image }) => {
    const [activeTab, setActiveTab] = useState('brand-voice');
    const [loading, setLoading] = useState(false);

    // Unified state for all features
    const [featureData, setFeatureData] = useState({
        'brand-voice': { input: '', result: null },
        'carousel': { input: '', result: null },
        'competitor': { input: '', result: null },
        'ab-test': { input: '', result: null },
        'glow-up': { input: '', result: null },
        'repurpose': { input: '', result: null },
        'hashtag': { input: '', result: null },
        'bio': { input: '', result: null },
        'hooks': { input: '', result: null },
        'calendar': { input: '', result: null },
        'email': { input: '', result: null },
        'response': { input: '', result: null },
        'thumbnail': { input: '', result: null },
    });

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const currentInput = featureData[activeTab].input;
            const data = await generatePremiumContent(activeTab, { input: currentInput, image }, settings);

            setFeatureData(prev => ({
                ...prev,
                [activeTab]: { ...prev[activeTab], result: data }
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const updateInput = (value) => {
        setFeatureData(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], input: value }
        }));
    };

    const clearResult = () => {
        setFeatureData(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], result: null }
        }));
    };

    const renderContent = () => {
        const currentData = featureData[activeTab];

        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-secondary animate-pulse">Consulting the AI Oracle...</p>
                </div>
            );
        }

        if (currentData.result) {
            switch (activeTab) {
                case 'brand-voice':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="text-sm font-bold text-secondary uppercase mb-2">Voice Analysis</h4>
                                <p className="text-primary">{currentData.result.analysis}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                                <h4 className="text-sm font-bold text-pink-300 uppercase mb-2">Generated Caption</h4>
                                <p className="text-white text-lg font-medium leading-relaxed">{currentData.result.generatedCaption}</p>
                            </div>
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Try Another</button>
                        </div>
                    );
                case 'carousel':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex md:grid md:grid-cols-5 gap-3 overflow-x-auto pb-4 md:pb-0 snap-x hide-scrollbar">
                                {currentData.result.slides.map((slide, idx) => (
                                    <div key={idx} className="min-w-[85%] md:min-w-0 snap-center aspect-[4/5] bg-white/5 rounded-lg p-3 border border-white/10 flex flex-col justify-between">
                                        <span className="text-xs font-bold text-secondary">Slide {idx + 1}</span>
                                        <div>
                                            <h5 className="text-purple-300 font-bold text-sm mb-1">{slide.title}</h5>
                                            <p className="text-xs text-slate-300 line-clamp-4">{slide.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Reset</button>
                        </div>
                    );
                case 'ab-test':
                    return (
                        <div className="grid grid-cols-2 gap-6 animate-fade-in">
                            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex justify-between mb-3">
                                    <span className="text-xs font-bold text-secondary uppercase">Variant A</span>
                                    <span className="text-xs font-bold text-green-400">{currentData.result.variantA.prediction}</span>
                                </div>
                                <h4 className="font-bold text-primary mb-2">{currentData.result.variantA.title}</h4>
                                <p className="text-sm text-secondary">{currentData.result.variantA.content}</p>
                            </div>
                            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex justify-between mb-3">
                                    <span className="text-xs font-bold text-secondary uppercase">Variant B</span>
                                    <span className="text-xs font-bold text-green-400">{currentData.result.variantB.prediction}</span>
                                </div>
                                <h4 className="font-bold text-primary mb-2">{currentData.result.variantB.title}</h4>
                                <p className="text-sm text-secondary">{currentData.result.variantB.content}</p>
                            </div>
                        </div>
                    );
                case 'competitor':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="text-sm font-bold text-secondary uppercase mb-2">Viral Insight</h4>
                                <p className="text-primary">{currentData.result.insight}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <h4 className="text-sm font-bold text-blue-300 uppercase mb-2">Replication Strategy</h4>
                                <p className="text-white">{currentData.result.strategy}</p>
                            </div>
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Analyze Another</button>
                        </div>
                    );
                case 'glow-up':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                    {currentData.result.score}
                                </div>
                                <div>
                                    <h4 className="font-bold text-primary">Visual Quality Score</h4>
                                    <p className="text-sm text-secondary">Based on composition & lighting</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {currentData.result.tips.map((tip, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                                        <Check className="text-green-400 mt-0.5" size={16} />
                                        <p className="text-sm text-slate-300">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                case 'repurpose':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            {['LinkedIn', 'Twitter', 'Instagram'].map((platform) => (
                                <div key={platform} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex justify-between mb-2">
                                        <h4 className="text-sm font-bold text-cyan-400 uppercase">{platform}</h4>
                                        <button className="text-xs text-secondary hover:text-white" onClick={() => navigator.clipboard.writeText(currentData.result[platform.toLowerCase()])}>Copy</button>
                                    </div>
                                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{currentData.result[platform.toLowerCase()]}</p>
                                </div>
                            ))}
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Repurpose Another</button>
                        </div>
                    );
                case 'hashtag':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            {Object.entries(currentData.result).map(([key, tags]) => (
                                <div key={key} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <h4 className="text-sm font-bold text-yellow-400 uppercase mb-2">{key} Cluster</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag, i) => (
                                            <span key={i} className="px-2 py-1 rounded-md bg-white/10 text-xs text-slate-300">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Generate More</button>
                        </div>
                    );
                case 'bio':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="text-sm font-bold text-secondary uppercase mb-2">Current Vibe Check</h4>
                                <p className="text-primary">{currentData.result.analysis}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                                <h4 className="text-sm font-bold text-teal-300 uppercase mb-2">Optimized Bio</h4>
                                <p className="text-white text-lg font-medium whitespace-pre-wrap">{currentData.result.optimizedBio}</p>
                            </div>
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Analyze Another</button>
                        </div>
                    );
                case 'hooks':
                    return (
                        <div className="space-y-3 animate-fade-in">
                            {currentData.result.hooks.map((hook, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-3 items-start">
                                    <span className="text-red-400 font-bold text-lg">#{idx + 1}</span>
                                    <p className="text-white font-medium text-lg leading-snug">{hook}</p>
                                </div>
                            ))}
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Generate More Hooks</button>
                        </div>
                    );
                case 'calendar':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {currentData.result.plan.map((day, idx) => (
                                    <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-bold text-indigo-400 uppercase">Day {idx + 1}</span>
                                            <span className="text-xs text-secondary">{day.type}</span>
                                        </div>
                                        <p className="text-sm text-slate-200 font-medium">{day.idea}</p>
                                    </div>
                                ))}
                            </div>
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Create New Plan</button>
                        </div>
                    );
                case 'email':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="text-lg font-bold text-emerald-400 mb-2">{currentData.result.subject}</h4>
                                <div className="w-full h-px bg-white/10 my-3" />
                                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{currentData.result.body}</p>
                            </div>
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Draft Another</button>
                        </div>
                    );
                case 'response':
                    return (
                        <div className="space-y-3 animate-fade-in">
                            {currentData.result.replies.map((reply, idx) => (
                                <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-bold text-sky-400 uppercase">{reply.tone}</span>
                                    </div>
                                    <p className="text-slate-200">{reply.text}</p>
                                </div>
                            ))}
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Generate More</button>
                        </div>
                    );
                case 'thumbnail':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-2 gap-3">
                                {currentData.result.overlays.map((text, idx) => (
                                    <div key={idx} className="aspect-video bg-gradient-to-br from-gray-800 to-black rounded-lg flex items-center justify-center p-4 border border-white/10 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <h3 className="text-white font-black text-center text-xl uppercase leading-none drop-shadow-lg relative z-10">{text}</h3>
                                    </div>
                                ))}
                            </div>
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Generate More Ideas</button>
                        </div>
                    );
                default:
                    return <pre className="text-xs text-secondary overflow-auto">{JSON.stringify(currentData.result, null, 2)}</pre>;
            }
        }

        // Input State
        switch (activeTab) {
            case 'brand-voice':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Paste 3-5 examples of your best captions to clone your voice.</p>
                        <textarea
                            className="w-full h-32 input-liquid p-4 resize-none"
                            placeholder="Paste your captions here..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Sparkles size={18} /> Analyze & Generate
                        </button>
                    </div>
                );
            case 'carousel':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Generate a 5-slide carousel strategy based on your image.</p>
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Layers size={18} /> Create Carousel Plan
                        </button>
                    </div>
                );
            case 'competitor':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Paste the full text/caption of a viral post to reverse-engineer its success.</p>
                        <textarea
                            className="w-full h-32 input-liquid p-4 resize-none"
                            placeholder="Paste the viral post content here..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Eye size={18} /> Spy on Competitor
                        </button>
                    </div>
                );
            case 'repurpose':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Paste your content to rewrite it for multiple platforms.</p>
                        <textarea
                            className="w-full h-32 input-liquid p-4 resize-none"
                            placeholder="Paste your content here..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Repeat size={18} /> Repurpose Content
                        </button>
                    </div>
                );
            case 'hashtag':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Describe your niche or post topic to generate optimized hashtag clusters.</p>
                        <input
                            type="text"
                            className="w-full input-liquid p-4"
                            placeholder="E.g., Digital Marketing, Vegan Recipes..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Hash size={18} /> Generate Clusters
                        </button>
                    </div>
                );
            case 'bio':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Paste your current bio or describe yourself to get a conversion-optimized bio.</p>
                        <textarea
                            className="w-full h-32 input-liquid p-4 resize-none"
                            placeholder="Paste current bio or description..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <UserCircle size={18} /> Optimize Bio
                        </button>
                    </div>
                );
            case 'hooks':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">What is your video about? We'll generate scroll-stopping hooks.</p>
                        <input
                            type="text"
                            className="w-full input-liquid p-4"
                            placeholder="E.g., How to save money on groceries..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Anchor size={18} /> Generate Hooks
                        </button>
                    </div>
                );
            case 'calendar':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Describe your niche and target audience for a 7-day content plan.</p>
                        <textarea
                            className="w-full h-32 input-liquid p-4 resize-none"
                            placeholder="E.g., Fitness coach for busy moms..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Calendar size={18} /> Create Plan
                        </button>
                    </div>
                );
            case 'email':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Paste a social post to convert it into an engaging newsletter.</p>
                        <textarea
                            className="w-full h-32 input-liquid p-4 resize-none"
                            placeholder="Paste your post content here..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Mail size={18} /> Draft Email
                        </button>
                    </div>
                );
            case 'response':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Paste a comment you received to generate professional or witty replies.</p>
                        <textarea
                            className="w-full h-32 input-liquid p-4 resize-none"
                            placeholder="Paste the comment here..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <MessageSquare size={18} /> Generate Replies
                        </button>
                    </div>
                );
            case 'thumbnail':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Describe your video topic to get click-worthy thumbnail text overlays.</p>
                        <input
                            type="text"
                            className="w-full input-liquid p-4"
                            placeholder="E.g., Day in the life of a software engineer..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Type size={18} /> Generate Text
                        </button>
                    </div>
                );
            default:
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Unlock this premium feature to take your content to the next level.</p>
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Sparkles size={18} /> Generate Insights
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-5xl h-[80vh] glass-panel flex flex-col lg:flex-row overflow-hidden">
                {/* Sidebar */}
                <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/10 p-4 flex flex-row lg:flex-col gap-2 bg-black/20 overflow-x-auto shrink-0">
                    <div className="mb-6 px-2 hidden lg:block">
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            Premium Hub
                        </h2>
                        <p className="text-xs text-secondary">Pro Tools Suite</p>
                    </div>

                    {FEATURES.map((feature) => {
                        const Icon = feature.icon;
                        const isActive = activeTab === feature.id;
                        return (
                            <button
                                key={feature.id}
                                onClick={() => setActiveTab(feature.id)}
                                className={`
                                    w-auto lg:w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-300 text-left whitespace-nowrap
                                    ${isActive ? `${feature.bg} ${feature.border} border` : 'hover:bg-white/5 border border-transparent'}
                                `}
                            >
                                <div className={`p-2 rounded-lg ${isActive ? 'bg-white/10' : 'bg-white/5'} ${feature.color}`}>
                                    <Icon size={18} />
                                </div>
                                <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-secondary'}`}>
                                    {feature.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-secondary hover:text-white transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-4 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="max-w-2xl mx-auto mt-10">
                            <div className="mb-8 text-center">
                                <div className={`inline-flex p-3 rounded-2xl mb-4 ${FEATURES.find(f => f.id === activeTab).bg}`}>
                                    {React.createElement(FEATURES.find(f => f.id === activeTab).icon, {
                                        size: 32,
                                        className: FEATURES.find(f => f.id === activeTab).color
                                    })}
                                </div>
                                <h2 className="text-3xl font-bold text-primary mb-2">
                                    {FEATURES.find(f => f.id === activeTab).label}
                                </h2>
                                <p className="text-secondary">
                                    Advanced AI analysis to maximize your viral potential.
                                </p>
                            </div>

                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PremiumHub;

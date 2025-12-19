import React, { useState, useEffect } from 'react';

import { X, Sparkles, MessageCircle, Layers, Eye, Split, Palette, ArrowRight, Check, Lock, Repeat, Hash, UserCircle, Anchor, Calendar, Mail, MessageSquare, Type, TrendingUp, Clock, FileText, BarChart2, Play, Instagram, LogOut, Copy, Music, PlayCircle, Smile, Film } from 'lucide-react';
import { generatePremiumContent } from '../utils/aiService';
import SchedulerModal from './SchedulerModal';
import { schedulePost, runSchedulerSimulation, runEdgeFunctionScheduler } from '../utils/schedulerService';
import { supabase } from '../lib/supabase';

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
    { id: 'meme-maker', label: 'Meme Maker AI', icon: Smile, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { id: 'storyboarder', label: 'Storyboarder', icon: Film, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    // VIP Features
    { id: 'trend-alerts', label: 'Trend Alerts', icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', isVip: true },
    { id: 'smart-scheduler', label: 'Smart Scheduler', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', isVip: true },
    { id: 'script-generator', label: 'Script Generator', icon: FileText, color: 'text-lime-400', bg: 'bg-lime-500/10', border: 'border-lime-500/20', isVip: true },
    { id: 'analytics', label: 'Advanced Analytics', icon: BarChart2, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', isVip: true },
];

const COST_PER_USE = 50;

const PremiumHub = ({ isOpen, onClose, settings, image, coinBalance, onSpendCoins, onOpenAdModal, isPro, initialTab = 'brand-voice' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [loading, setLoading] = useState(false);
    const [showScheduler, setShowScheduler] = useState(false);
    const [schedulerContent, setSchedulerContent] = useState('');
    const [schedulerDate, setSchedulerDate] = useState('');
    const [schedulerTime, setSchedulerTime] = useState('');
    const [schedulerHashtags, setSchedulerHashtags] = useState('');
    const [schedulerMusic, setSchedulerMusic] = useState('');
    const [generatedCaptions, setGeneratedCaptions] = useState([]);
    const [generatedHashtagsList, setGeneratedHashtagsList] = useState([]);
    const [generatedMusicList, setGeneratedMusicList] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    // Check for existing connection on mount
    React.useEffect(() => {
        const checkConnection = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('connected_accounts')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('platform', 'instagram')
                    .maybeSingle();
                if (data) setIsConnected(true);
            }
        };
        checkConnection();
    }, []);

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    const handleOpenScheduler = (content, date = '', time = '', hashtags = '', music = '', captionsList = [], hashtagsList = [], musicList = []) => {
        setSchedulerContent(content);
        setSchedulerDate(date);
        setSchedulerTime(time);
        setSchedulerHashtags(hashtags);
        setSchedulerMusic(music);
        setGeneratedCaptions(captionsList);
        setGeneratedHashtagsList(hashtagsList);
        setGeneratedMusicList(musicList);
        setShowScheduler(true);
    };

    const handleSchedulePost = async (postData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Please log in to schedule posts.");
                return;
            }

            let mediaUrl = image; // Default if it's already a URL

            // 1. Upload Image if it's a File (from local selection)
            if (image instanceof File) {
                const fileExt = image.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('post_media')
                    .upload(filePath, image);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('post_media')
                    .getPublicUrl(filePath);

                mediaUrl = publicUrl;
                console.log("Image uploaded to:", mediaUrl);
            }

            // 2. Schedule Post
            // Filter out UI-only fields and map to DB schema
            const dbPostData = {
                user_id: user.id,
                content: `${postData.caption || ''}\n\n${postData.hashtags || ''}`.trim(),
                media_url: mediaUrl,
                platform: postData.platform,
                scheduled_at: postData.scheduled_at,
                music: postData.music,
                status: 'pending'
            };

            await schedulePost(dbPostData);

            alert("Post scheduled successfully!");
            setShowScheduler(false);
        } catch (error) {
            console.error("Error scheduling post:", error);
            alert("Failed to schedule post: " + error.message);
        }
    };

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
        'trend-alerts': { input: '', result: null },
        'smart-scheduler': { input: '', result: null },
        'script-generator': { input: '', result: null },
        'analytics': { input: '', result: null },
        'meme-maker': { input: '', result: null },
        'storyboarder': { input: '', result: null },
    });

    const handleConnectInstagram = () => {
        if (!window.FB) {
            alert("Facebook SDK not loaded yet.");
            return;
        }

        const processLoginResponse = async (response) => {
            if (response.authResponse) {
                const accessToken = response.authResponse.accessToken;
                console.log('Connected to Facebook, fetching Instagram accounts...');

                try {
                    // 0. Debug: Check Permissions
                    const permsResp = await fetch(`https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`);
                    const permsData = await permsResp.json();

                    // 1. Get the User's Pages
                    let pagesList = [];
                    const pagesResp = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`);
                    const pagesData = await pagesResp.json();

                    if (pagesData.data) {
                        pagesList = pagesData.data;
                    }

                    if (pagesList.length === 0) {
                        const grantedPerms = permsData.data.filter(p => p.status === 'granted').map(p => p.permission).join(', ');
                        const manualPageId = prompt(`We couldn't find your Pages automatically.\n\nGranted Permissions: ${grantedPerms}\n\nIf 'pages_show_list' is missing, you need to grant it.\nIf it IS there, you might need to select your Page in the "Edit Settings" of the login popup.\n\nFor now, please enter your Facebook Page ID manually:`);

                        if (manualPageId) {
                            pagesList = [{ id: manualPageId, name: "Manually Added Page" }];
                        } else {
                            alert("No Facebook Pages found and no ID provided. Cannot proceed.");
                            return;
                        }
                    }

                    // 2. Find the Page with a connected Instagram Business Account
                    let instagramAccount = null;
                    for (const page of pagesList) {
                        console.log(`Checking Page: ${page.name} (${page.id})`);
                        const igResp = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
                        const igData = await igResp.json();

                        if (igData.instagram_business_account) {
                            instagramAccount = {
                                id: igData.instagram_business_account.id,
                                pageId: page.id,
                                name: page.name
                            };
                            break;
                        }
                    }

                    if (!instagramAccount) {
                        alert("No Instagram Business Account found connected to your Pages.");
                        return;
                    }

                    // 3. Save to Supabase
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        alert("Please log in to Supabase first.");
                        return;
                    }

                    const { error } = await supabase
                        .from('connected_accounts')
                        .upsert({
                            user_id: user.id,
                            platform: 'instagram',
                            access_token: accessToken,
                            account_id: instagramAccount.id,
                            account_name: instagramAccount.name
                        });

                    if (error) throw error;

                    alert(`Successfully connected Instagram: ${instagramAccount.name}`);
                    setIsConnected(true);

                } catch (error) {
                    console.error("Error connecting Instagram:", error);
                    alert("Failed to connect Instagram.");
                }
            } else {
                console.log('User cancelled login or did not fully authorize.');
            }
        };

        window.FB.login(function (response) {
            processLoginResponse(response);
        }, {
            scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management',
            auth_type: 'reauthenticate'
        });
    };

    const handleDisconnectInstagram = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('connected_accounts')
            .delete()
            .eq('user_id', user.id)
            .eq('platform', 'instagram');

        if (error) {
            console.error("Error disconnecting:", error);
            alert("Failed to disconnect.");
        } else {
            setIsConnected(false);
            alert("Instagram disconnected.");
        }
    };



    const handleRunSimulation = async () => {
        try {
            const result = await runEdgeFunctionScheduler();
            console.log("Scheduler Result:", result);

            if (result.results && result.results.length > 0) {
                const failures = result.results.filter(r => r.status === 'failed');
                if (failures.length > 0) {
                    const errorMsg = failures.map(f => `Post ${f.id}: ${f.error}`).join('\n');
                    alert(`Scheduler ran but some posts failed:\n${errorMsg}`);
                } else {
                    alert(result.message || "Scheduler ran successfully! Check Instagram.");
                }
            } else {
                alert(result.message || "Scheduler ran successfully!");
            }
        } catch (error) {
            console.error(error);
            alert("Scheduler failed: " + error.message);
        }
    };

    const handleGenerate = async () => {
        if (coinBalance < COST_PER_USE) {
            alert("Insufficient coins! Please purchase more from the dashboard.");
            return;
        }

        setLoading(true);
        try {
            const currentInput = featureData[activeTab].input;
            const data = await generatePremiumContent(activeTab, { input: currentInput, image }, settings);

            setFeatureData(prev => ({
                ...prev,
                [activeTab]: { ...prev[activeTab], result: data }
            }));

            onSpendCoins(COST_PER_USE);
        } catch (error) {
            console.error(error);
            alert("Generation failed. Please try again.");
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
                <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                    <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-purple-500 border-b-pink-500 border-l-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="text-white animate-pulse" size={24} />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                        {activeTab === 'trend-alerts' ? 'Fetching Real-Time Trends...' : 'Generating Magic...'}
                    </h3>
                    <p className="text-slate-400 text-center max-w-xs">
                        {activeTab === 'trend-alerts'
                            ? 'Scanning Google Trends for the latest viral topics in your niche.'
                            : 'Our AI is crafting your premium content. This usually takes 10-20 seconds.'}
                    </p>
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
                            <div className="flex gap-2">
                                <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Try Another</button>
                                <button onClick={() => handleOpenScheduler(currentData.result.generatedCaption, '', '', '', 'Viral: Upbeat Pop')} className="ml-auto text-sm text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1">
                                    <Calendar size={14} /> Schedule
                                </button>
                            </div>
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
                            <div className="flex gap-2">
                                <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Repurpose Another</button>
                            </div>
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
                case 'meme-maker':
                    return (
                        <div className="space-y-6 animate-fade-in">
                            {currentData.result.memes.map((meme, idx) => (
                                <div key={idx} className="p-5 rounded-xl bg-white/5 border border-white/10">
                                    <h4 className="text-lg font-bold text-yellow-400 mb-3">{meme.template}</h4>
                                    <div className="aspect-video bg-black/40 rounded-lg flex flex-col items-center justify-center p-6 text-center border-2 border-white/10 mb-3 relative overflow-hidden">
                                        <p className="text-white font-black text-2xl uppercase tracking-wide drop-shadow-md mb-8 relative z-10">{meme.topText}</p>
                                        <p className="text-white font-black text-2xl uppercase tracking-wide drop-shadow-md relative z-10">{meme.bottomText}</p>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                            <Smile size={100} />
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-400 italic">Visual: {meme.description}</p>
                                </div>
                            ))}
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Generate More Memes</button>
                        </div>
                    );
                case 'storyboarder':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="space-y-4">
                                {currentData.result.scenes.map((scene, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="w-24 h-24 shrink-0 bg-black/40 rounded-lg border border-white/10 flex items-center justify-center text-indigo-400 font-bold text-xl">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-2">
                                                <h4 className="font-bold text-white">Scene {idx + 1}</h4>
                                                <span className="text-xs font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded">{scene.duration}</span>
                                            </div>
                                            <p className="text-slate-300 text-sm mb-2"><span className="text-secondary font-bold">Visual:</span> {scene.visual}</p>
                                            <p className="text-slate-300 text-sm"><span className="text-secondary font-bold">Audio:</span> {scene.audio}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Create New Storyboard</button>
                        </div>
                    );
                case 'trend-alerts':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            {currentData.result.trends.map((trend, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-lg font-bold text-rose-400">{trend.name}</h4>
                                        <span className="px-2 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold uppercase">Trending</span>
                                    </div>
                                    <p className="text-slate-300 text-sm mb-3">{trend.description}</p>
                                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                        <span className="text-xs font-bold text-rose-300 uppercase block mb-1">Content Idea</span>
                                        <p className="text-white text-sm mb-2">{trend.idea}</p>
                                        <button onClick={() => handleOpenScheduler(trend.idea, '', '', '#trending #viral', 'Trending: Phonk')} className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                            <Calendar size={12} /> Schedule Idea
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Find More Trends</button>
                        </div>
                    );
                case 'smart-scheduler':
                    return (
                        <div className="space-y-6 animate-fade-in">
                            {/* Best Times Slots */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {currentData.result.slots.map((slot, idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                                        <Clock size={24} className="text-amber-400 mb-2" />
                                        <h4 className="text-lg font-bold text-white mb-1">{slot.day}</h4>
                                        <span className="text-2xl font-black text-amber-400 mb-2">{slot.time}</span>
                                        <p className="text-xs text-secondary mb-3">{slot.reason}</p>
                                        <button
                                            onClick={() => {
                                                // Helper to get next date for a given day name
                                                const getNextDateForDay = (dayName) => {
                                                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                                    const targetDay = days.indexOf(dayName);
                                                    if (targetDay === -1) return '';

                                                    const today = new Date();
                                                    const currentDay = today.getDay();
                                                    let daysUntilTarget = targetDay - currentDay;

                                                    if (daysUntilTarget <= 0) {
                                                        daysUntilTarget += 7;
                                                    }

                                                    const nextDate = new Date(today);
                                                    nextDate.setDate(today.getDate() + daysUntilTarget);
                                                    return nextDate.toISOString().split('T')[0];
                                                };

                                                handleOpenScheduler(
                                                    `Post scheduled for ${slot.day} at ${slot.time}`,
                                                    getNextDateForDay(slot.day),
                                                    slot.time,
                                                    '#scheduled',
                                                    'Mood: Cinematic Ambient',
                                                    currentData.result.captions || [],
                                                    currentData.result.hashtags || [],
                                                    currentData.result.musicRecommendations || []
                                                )
                                            }}
                                            className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors font-bold"
                                        >
                                            <Calendar size={12} /> Schedule
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-2">
                                <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Recalculate</button>
                                {isConnected ? (
                                    <button onClick={handleDisconnectInstagram} className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs text-red-300 hover:text-white flex items-center justify-center gap-2 transition-colors border border-red-500/30">
                                        <LogOut size={12} /> Disconnect Instagram
                                    </button>
                                ) : (
                                    <button onClick={handleConnectInstagram} className="w-full py-2 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-xs text-pink-300 hover:text-white flex items-center justify-center gap-2 transition-colors border border-pink-500/30">
                                        <Instagram size={12} /> Connect Instagram
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                case 'script-generator':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                <h3 className="text-xl font-bold text-lime-400 mb-4">{currentData.result.title}</h3>

                                <div className="space-y-4">
                                    <div>
                                        <span className="text-xs font-bold text-secondary uppercase block mb-1">Hook (0-3s)</span>
                                        <p className="text-white font-medium">{currentData.result.hook}</p>
                                    </div>
                                    <div className="w-full h-px bg-white/10" />
                                    <div>
                                        <span className="text-xs font-bold text-secondary uppercase block mb-1">Body</span>
                                        <p className="text-slate-300 whitespace-pre-wrap">{currentData.result.body}</p>
                                    </div>
                                    <div className="w-full h-px bg-white/10" />
                                    <div>
                                        <span className="text-xs font-bold text-secondary uppercase block mb-1">Call to Action</span>
                                        <p className="text-lime-300 font-bold">{currentData.result.cta}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Write Another</button>
                            </div>
                        </div>
                    );
                case 'analytics':
                    return (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                                    <span className="text-xs text-secondary uppercase block mb-1">Growth</span>
                                    <span className="text-xl font-bold text-green-400">{currentData.result.metrics.growth}</span>
                                </div>
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                                    <span className="text-xs text-secondary uppercase block mb-1">Engagement</span>
                                    <span className="text-xl font-bold text-blue-400">{currentData.result.metrics.engagement}</span>
                                </div>
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                                    <span className="text-xs text-secondary uppercase block mb-1">Reach</span>
                                    <span className="text-xl font-bold text-purple-400">{currentData.result.metrics.reach}</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                <h4 className="text-sm font-bold text-violet-300 uppercase mb-3">AI Insights</h4>
                                <ul className="space-y-2">
                                    {currentData.result.insights.map((insight, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                                            <Sparkles size={14} className="text-violet-400 mt-1 shrink-0" />
                                            {insight}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <button onClick={clearResult} className="text-sm text-secondary hover:text-primary underline">Refresh Data</button>
                        </div>
                    );
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
                            <Sparkles size={18} /> Analyze & Generate <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
                        </button>
                    </div>
                );
            case 'carousel':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Generate a 5-slide carousel strategy based on your image.</p>
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Layers size={18} /> Create Carousel Plan <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
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
                            <Eye size={18} /> Spy on Competitor <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
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
                            <Repeat size={18} /> Repurpose Content <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
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
                            <Hash size={18} /> Generate Clusters <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
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
                            <UserCircle size={18} /> Optimize Bio <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
                        </button>
                    </div>
                );
            case 'meme-maker':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Enter a topic, situation, or feeling to generate viral meme concepts.</p>
                        <input
                            type="text"
                            className="w-full input-liquid p-4"
                            placeholder="E.g., Monday mornings, Debugging code, Coffee addiction..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Smile size={18} /> Generate Memes <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
                        </button>
                    </div>
                );
            case 'storyboarder':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Describe your video idea or paste a script to get a visual storyboard.</p>
                        <textarea
                            className="w-full h-32 input-liquid p-4 resize-none"
                            placeholder="E.g., A 30-second ad for a new energy drink featuring a tired student..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Film size={18} /> Create Storyboard <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
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
                            <Anchor size={18} /> Generate Hooks <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
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
                            <Calendar size={18} /> Create Plan <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
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
                            <Mail size={18} /> Draft Email <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
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
                            <MessageSquare size={18} /> Generate Replies <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
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
                            <Type size={18} /> Generate Text <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
                        </button>
                    </div>
                );
            case 'trend-alerts':
                return (
                    <div className="space-y-6">
                        {!currentData.result ? (
                            <div className="space-y-4">
                                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
                                    <TrendingUp className="text-rose-400 shrink-0 mt-1" size={20} />
                                    <div>
                                        <h4 className="font-bold text-rose-300">Viral Trend Simulator</h4>
                                        <p className="text-sm text-rose-200/70">
                                            Our AI analyzes current social patterns to predict what's about to go viral in your niche.
                                        </p>
                                    </div>
                                </div>
                                <p className="text-secondary">Enter your niche to discover exploding trends, viral audio, and hooks.</p>
                                <input
                                    type="text"
                                    className="w-full input-liquid p-4"
                                    placeholder="E.g., Skincare, Digital Marketing, Pet Owners..."
                                    value={currentData.input}
                                    onChange={(e) => updateInput(e.target.value)}
                                />
                                <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500">
                                    <TrendingUp size={18} /> Scan for Trends <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <TrendingUp className="text-rose-400" /> Trending Now
                                    </h3>
                                    <button onClick={() => updateResult(null)} className="text-sm text-slate-400 hover:text-white">
                                        New Scan
                                    </button>
                                </div>
                                <div className="grid gap-4">
                                    {currentData.result.trends?.map((trend, idx) => (
                                        <div key={idx} className="bg-slate-800/50 border border-white/10 rounded-xl p-5 hover:border-rose-500/30 transition-all group">
                                            <div className="flex items-start justify-between mb-3">
                                                <h4 className="font-bold text-lg text-white group-hover:text-rose-400 transition-colors">{trend.name}</h4>
                                                <span className="px-2 py-1 bg-rose-500/20 text-rose-300 text-xs font-bold rounded-full uppercase tracking-wider">Viral</span>
                                            </div>

                                            <p className="text-slate-300 text-sm mb-4">{trend.why_viral}</p>

                                            <div className="space-y-3">
                                                <div className="bg-black/30 rounded-lg p-3 flex items-center gap-3 border border-white/5">
                                                    <div className="p-2 bg-rose-500/20 rounded-full text-rose-400">
                                                        <Music size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase font-bold">Viral Audio</p>
                                                        <p className="text-sm font-medium text-white">{trend.audio}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-black/30 rounded-lg p-3 flex items-center gap-3 border border-white/5">
                                                    <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                                                        <Anchor size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase font-bold">The Hook</p>
                                                        <p className="text-sm font-medium text-white italic">"{trend.hook}"</p>
                                                    </div>
                                                </div>

                                                <div className="bg-black/30 rounded-lg p-3 flex items-center gap-3 border border-white/5">
                                                    <div className="p-2 bg-green-500/20 rounded-full text-green-400">
                                                        <Zap size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase font-bold">Execution</p>
                                                        <p className="text-sm font-medium text-white">{trend.idea}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'smart-scheduler':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Describe your target audience to find optimal posting times.</p>
                        <textarea
                            className="w-full h-32 input-liquid p-4 resize-none"
                            placeholder="E.g., Corporate professionals in New York..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Clock size={18} /> Calculate Best Times <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
                        </button>
                        {isConnected ? (
                            <button onClick={handleDisconnectInstagram} className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs text-red-300 hover:text-white flex items-center justify-center gap-2 transition-colors border border-red-500/30">
                                <LogOut size={12} /> Disconnect Instagram
                            </button>
                        ) : (
                            <button onClick={handleConnectInstagram} className="w-full py-2 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-xs text-pink-300 hover:text-white flex items-center justify-center gap-2 transition-colors border border-pink-500/30">
                                <Instagram size={12} /> Connect Instagram
                            </button>
                        )}
                    </div>
                );
            case 'script-generator':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">What's your video about? We'll write the full script.</p>
                        <textarea
                            className="w-full h-32 input-liquid p-4 resize-none"
                            placeholder="E.g., 3 tips to sleep better..."
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <FileText size={18} /> Generate Script <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
                        </button>
                    </div>
                );
            case 'analytics':
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Enter your niche/handle to simulate a performance audit.</p>
                        <input
                            type="text"
                            className="w-full input-liquid p-4"
                            placeholder="E.g., @mybrand or Tech Review Niche"
                            value={currentData.input}
                            onChange={(e) => updateInput(e.target.value)}
                        />
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <BarChart2 size={18} /> Run Audit <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
                        </button>
                    </div>
                );
            default:
                return (
                    <div className="space-y-4">
                        <p className="text-secondary">Unlock this premium feature to take your content to the next level.</p>
                        <button onClick={handleGenerate} className="btn-liquid-primary px-6 py-3 w-full flex items-center justify-center gap-2">
                            <Sparkles size={18} /> Generate Insights <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">-{COST_PER_USE}</span>
                        </button>
                    </div>
                );
        }
    };

    if (!isOpen) return null;



    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-5xl h-[90vh] md:h-[80vh] glass-panel flex flex-col lg:flex-row overflow-hidden">
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
                                {feature.isVip && (
                                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-orange-500 text-black">VIP</span>
                                )}
                            </button>
                        );
                    })}



                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                        {/* Connect Button Moved to Smart Scheduler Tab */}
                        {<button onClick={handleRunSimulation} className="w-full py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-xs text-indigo-300 hover:text-white flex items-center justify-center gap-2 transition-colors border border-indigo-500/30">
                            <Play size={12} /> Run Scheduler (Live)
                        </button>}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col relative min-h-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-secondary hover:text-white transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-4 md:p-8 flex-1 overflow-y-auto custom-scrollbar relative min-h-0">
                        {/* VIP Gate Overlay */}
                        {FEATURES.find(f => f.id === activeTab).isVip && !isPro && (
                            <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                                <div className="max-w-md w-full bg-[#1a1a1f] border border-amber-500/30 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                                        <Lock size={32} className="text-amber-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">VIP Feature Locked</h3>
                                    <p className="text-secondary mb-6">
                                        Upgrade to Pro to unlock Trend Alerts, Smart Scheduler, Script Generator, and Advanced Analytics.
                                    </p>
                                    <button className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold hover:opacity-90 transition-opacity">
                                        Unlock VIP Access
                                    </button>
                                </div>
                            </div>
                        )}

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

            {showScheduler && (
                <SchedulerModal
                    isOpen={showScheduler}
                    onClose={() => setShowScheduler(false)}
                    content={schedulerContent}
                    initialDate={schedulerDate}
                    initialTime={schedulerTime}
                    initialHashtags={schedulerHashtags}
                    initialMusic={schedulerMusic}
                    generatedCaptions={generatedCaptions}
                    generatedHashtags={generatedHashtagsList}
                    generatedMusic={generatedMusicList}
                    onSchedule={handleSchedulePost}
                />
            )}
        </div>
    );
};

export default PremiumHub;

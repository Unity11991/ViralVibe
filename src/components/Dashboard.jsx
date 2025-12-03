import React, { useState } from 'react';
import { Coins, ArrowLeft, Play, Zap, Shield, Users, CreditCard, Copy, Check, Share2, BarChart3, Heart, Coffee, Crown, Rocket } from 'lucide-react';

const PACKAGES = [
    { id: 1, price: 49, coins: 5000, label: 'Starter' },
    { id: 2, price: 99, coins: 12000, label: 'Best Value', popular: true },
    { id: 3, price: 199, coins: 25000, label: 'Pro' },
    { id: 4, price: 449, coins: 60000, label: 'Agency' },
    { id: 5, price: 949, coins: 150000, label: 'Enterprise' },
];

const PurchaseTab = ({ onWatchAd, onPurchase }) => (
    <div className="space-y-8 animate-fade-in">
        {/* Free Coins Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <Play size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-emerald-300">Free Coins</h3>
                    <p className="text-emerald-200/60">Watch a short ad to earn <span className="text-emerald-400 font-bold">+35 coins</span></p>
                </div>
            </div>
            <button
                onClick={onWatchAd}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
                <Play size={18} fill="currentColor" /> Watch Ad
            </button>
        </div>

        {/* Packages Grid */}
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Choose Your Plan ✨</h2>
                <p className="text-slate-400">Power up your content creation with AI coins</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PACKAGES.map((pkg) => (
                    <div
                        key={pkg.id}
                        className={`relative bg-slate-800/50 border ${pkg.popular ? 'border-purple-500 shadow-purple-500/20' : 'border-white/10'} rounded-2xl p-6 hover:bg-slate-800 transition-all hover:-translate-y-1 shadow-xl`}
                    >
                        {pkg.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
                                BEST VALUE
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-3xl font-bold">₹{pkg.price}</h3>
                                <div className="flex items-center gap-2 mt-1 text-amber-400">
                                    <Coins size={16} />
                                    <span className="font-bold">{pkg.coins.toLocaleString()} coins</span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-lg ${pkg.popular ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                                <CreditCard size={20} />
                            </div>
                        </div>

                        <button
                            onClick={() => onPurchase(pkg.coins, pkg.price)}
                            className={`w-full py-3 rounded-xl font-bold transition-all ${pkg.popular
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-slate-700 hover:bg-slate-600 text-white'
                                }`}
                        >
                            Pay ₹{pkg.price}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const ReferralTab = () => {
    const [copied, setCopied] = useState(false);
    const referralCode = "REF487873";
    const referralLink = `https://viralvibe.ai/referral/${referralCode}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                    <Users size={32} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Earn 500 Coins</h2>
                <p className="text-slate-300 max-w-lg mx-auto">
                    For every friend who signs up with your referral link, you get 500 coins and they get 1500 coins (1000 signup + 500 referral)!
                </p>
            </div>

            <div className="glass-panel p-6 space-y-6">
                <div>
                    <label className="text-sm font-medium text-slate-400 mb-2 block">Your Referral Code</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={referralCode}
                            readOnly
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 font-mono"
                        />
                        <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 transition-colors text-slate-400 hover:text-white">
                            <Copy size={20} />
                        </button>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-400 mb-2 block">Referral Link</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={referralLink}
                            readOnly
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 font-mono text-sm"
                        />
                        <button
                            onClick={handleCopy}
                            className="px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? "Copied" : "Copy"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                    {['Twitter', 'Facebook', 'WhatsApp', 'Telegram'].map((platform) => (
                        <button key={platform} className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-white/10 rounded-xl text-slate-400 hover:text-white transition-all text-sm font-medium">
                            {platform}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-panel p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Share2 size={20} className="text-blue-400" /> How it works
                </h3>
                <ol className="space-y-3 text-slate-300 text-sm list-decimal list-inside marker:text-purple-400">
                    <li>Share your referral link with friends</li>
                    <li>They sign up and get 1500 coins (1000 welcome + 500 referral)</li>
                    <li>You get 500 coins for each successful referral</li>
                    <li>No limit on referrals - keep earning!</li>
                </ol>
            </div>
        </div>
    );
};

const AnalyticsTab = ({ history, totalCoinsSpent }) => {
    // Calculate Stats
    const totalImages = history.length;
    const totalVideos = 0; // Placeholder for now

    const avgViralScore = history.length > 0
        ? Math.round(history.reduce((acc, item) => acc + (item.viralPotential || 0), 0) / history.length)
        : 0;

    // Weekly Activity Logic
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = new Array(7).fill(0);
    const today = new Date();

    history.forEach(item => {
        const date = new Date(item.timestamp);
        // Check if item is within the last 7 days
        const diffTime = Math.abs(today - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
            weeklyData[date.getDay()]++;
        }
    });

    const maxActivity = Math.max(...weeklyData, 1); // Avoid division by zero

    // Posting Time Analysis Logic
    const timeSlots = {
        morning: { label: 'Morning (6AM - 12PM)', count: 0, color: 'bg-green-400' },
        afternoon: { label: 'Afternoon (12PM - 6PM)', count: 0, color: 'bg-yellow-400' },
        evening: { label: 'Evening (6PM - 12AM)', count: 0, color: 'bg-purple-400' },
        night: { label: 'Night (12AM - 6AM)', count: 0, color: 'bg-blue-400' }
    };

    history.forEach(item => {
        const hour = new Date(item.timestamp).getHours();
        if (hour >= 6 && hour < 12) timeSlots.morning.count++;
        else if (hour >= 12 && hour < 18) timeSlots.afternoon.count++;
        else if (hour >= 18 && hour < 24) timeSlots.evening.count++;
        else timeSlots.night.count++;
    });

    const sortedTimeSlots = Object.values(timeSlots).sort((a, b) => b.count - a.count);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Images', value: totalImages, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                    { label: 'Total Videos', value: totalVideos, icon: Play, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                    { label: 'Coins Spent', value: totalCoinsSpent, icon: Coins, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: 'Avg Viral Score', value: `${avgViralScore}%`, icon: BarChart3, color: 'text-green-400', bg: 'bg-green-400/10' },
                ].map((stat, idx) => (
                    <div key={idx} className="glass-panel p-4 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">{stat.label}</p>
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-panel p-6">
                    <h3 className="font-bold text-lg mb-6">Weekly Activity</h3>
                    <div className="h-48 flex items-end justify-between gap-2 px-2">
                        {days.map((day, idx) => {
                            const count = weeklyData[idx];
                            const heightPercentage = (count / maxActivity) * 100;
                            return (
                                <div key={day} className="flex flex-col items-center gap-2 w-full group relative">
                                    <div
                                        className={`w-full rounded-t-lg transition-all duration-500 ${count > 0 ? 'bg-blue-500 group-hover:bg-blue-400' : 'bg-slate-700/30'}`}
                                        style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                                    ></div>
                                    <span className="text-xs text-slate-500 font-medium">{day}</span>
                                    {count > 0 && (
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            {count}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="glass-panel p-6">
                    <h3 className="font-bold text-lg mb-6">Posting Time Analysis</h3>
                    <p className="text-sm text-slate-400 mb-4">Most active times (based on your analysis history):</p>
                    <div className="space-y-4">
                        {sortedTimeSlots.map((slot, idx) => (
                            <div key={idx} className={`flex items-center gap-3 text-sm ${slot.count === 0 ? 'opacity-40' : ''}`}>
                                <div className={`w-3 h-3 rounded-full ${slot.color}`}></div>
                                <span className="text-white font-medium">{slot.label}</span>
                                <span className="ml-auto text-slate-500">{slot.count} analysis</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Recent Analysis</h3>
                    <div className="text-xs text-slate-500">Showing last 5 items</div>
                </div>
                <div className="space-y-2">
                    {history.length > 0 ? (
                        history.slice(0, 5).map((item) => (
                            <div key={item.id} className="p-3 bg-slate-800/50 rounded-xl border border-white/5 flex items-center justify-between hover:bg-slate-800 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-blue-400">
                                        {item.platform === 'instagram' ? <Zap size={18} /> : <Share2 size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                                            {item.captions && item.captions[0] ? item.captions[0].substring(0, 40) + '...' : 'Analysis Result'}
                                        </p>
                                        <p className="text-xs text-green-400">
                                            {item.viralPotential ? `${item.viralPotential}% Viral Potential` : 'Viral Score N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</p>
                                    <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            No analysis history yet. Start generating!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SupportTab = () => {
    const handleSupport = (amount) => {
        if (confirm(`Would you like to support us with ₹${amount}?`)) {
            alert("Thank you for your support! ❤️");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="text-center max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 text-pink-400 text-sm font-bold mb-4 border border-pink-500/20">
                    <Heart size={14} fill="currentColor" /> Support the Developer Team
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Help us build the future</h2>
                <p className="text-slate-400">
                    ViralVibe is built by a passionate team of developers who believe in democratizing AI-powered content creation. Your support helps us keep innovating and improving the platform.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: 'Buy us a coffee', price: 199, icon: Coffee, color: 'text-amber-400', bg: 'bg-amber-400/10', desc: 'Help fuel our late-night coding sessions' },
                    { title: 'Support development', price: 499, icon: Rocket, color: 'text-blue-400', bg: 'bg-blue-400/10', desc: 'Support ongoing feature development' },
                    { title: 'Power user support', price: 999, icon: Zap, color: 'text-purple-400', bg: 'bg-purple-400/10', desc: 'Help us build amazing new features' },
                    { title: 'Become a champion', price: 1999, icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10', desc: 'Champion the future of AI content creation' },
                ].map((tier, idx) => (
                    <div key={idx} className="glass-panel p-6 flex flex-col items-center text-center hover:bg-slate-800/80 transition-all border border-white/5 hover:border-white/10">
                        <div className={`p-4 rounded-full ${tier.bg} ${tier.color} mb-4`}>
                            <tier.icon size={24} />
                        </div>
                        <h3 className="font-bold text-lg mb-1">{tier.title}</h3>
                        <p className="text-2xl font-black text-white mb-3">₹{tier.price}</p>
                        <p className="text-xs text-slate-400 mb-6 min-h-[40px]">{tier.desc}</p>
                        <button
                            onClick={() => handleSupport(tier.price)}
                            className="w-full py-2 bg-slate-700 hover:bg-white hover:text-slate-900 text-white font-bold rounded-lg transition-all text-sm"
                        >
                            Support
                        </button>
                    </div>
                ))}
            </div>

            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-white/5 rounded-2xl p-8 text-center">
                <h3 className="font-bold text-lg mb-6">Why support us?</h3>
                <div className="grid md:grid-cols-3 gap-8">
                    <div>
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 text-purple-400">
                            <Zap size={20} />
                        </div>
                        <h4 className="font-bold text-white mb-1">Continuous Innovation</h4>
                        <p className="text-xs text-slate-400">We're constantly adding new AI features and capabilities</p>
                    </div>
                    <div>
                        <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 text-pink-400">
                            <Shield size={20} />
                        </div>
                        <h4 className="font-bold text-white mb-1">Server Costs</h4>
                        <p className="text-xs text-slate-400">AI processing and hosting require significant resources</p>
                    </div>
                    <div>
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 text-blue-400">
                            <Heart size={20} />
                        </div>
                        <h4 className="font-bold text-white mb-1">Community First</h4>
                        <p className="text-xs text-slate-400">Your support helps us keep the platform accessible</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = ({ balance, history, totalCoinsSpent, onBack, onWatchAd, onPurchase }) => {
    const [activeTab, setActiveTab] = useState('purchase');

    const tabs = [
        { id: 'purchase', label: 'Purchase', icon: CreditCard },
        { id: 'referral', label: 'Referral', icon: Share2 },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'support', label: 'Support', icon: Heart },
    ];

    return (
        <div className="h-screen overflow-y-auto bg-slate-900 text-white p-4 pt-24 animate-fade-in custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                {/* <div>
                    <h3 className="text-lg font-bold text-emerald-300">The project is currently in the development phase, and all functionalities are placeholders/dummy implementations at this stage.</h3>
                    <p className="text-emerald-200/60">Watch a short ad to earn <span className="text-emerald-400 font-bold">+35 coins</span></p>
                </div> */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back to Home
                    </button>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Zap className="text-purple-400" /> Dashboard
                    </h1>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-r from-amber-200 to-yellow-400 rounded-2xl p-6 text-slate-900 shadow-lg shadow-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <p className="text-sm font-semibold opacity-80 uppercase tracking-wider mb-1">Your Balance</p>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                                <Coins size={32} className="text-slate-900" />
                            </div>
                            <span className="text-5xl font-black">{balance.toLocaleString()}</span>
                            <span className="text-xl font-bold opacity-80">coins</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-xs font-bold opacity-60">Images: {Math.floor(balance / 50)} gens</p>
                        </div>
                        <button
                            onClick={() => setActiveTab('purchase')}
                            className="px-6 py-3 bg-white text-amber-600 font-bold rounded-xl shadow-lg hover:bg-slate-50 transition-all transform hover:scale-105 active:scale-95"
                        >
                            Buy More
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2 rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'purchase' && <PurchaseTab onWatchAd={onWatchAd} onPurchase={onPurchase} />}
                    {activeTab === 'referral' && <ReferralTab />}
                    {activeTab === 'analytics' && <AnalyticsTab history={history} totalCoinsSpent={totalCoinsSpent} />}
                    {activeTab === 'support' && <SupportTab />}
                </div>

            </div>
        </div>
    );
};

export default Dashboard;

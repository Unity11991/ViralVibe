import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, ArrowRight, Sparkles, Globe, AlertCircle, ArrowLeft, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { analyzeTrend } from '../utils/aiService';
import { supabase } from '../lib/supabase';
import { fetchGoogleTrends } from '../utils/trendService';

const COUNTRIES = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
];

const TIME_RANGES = [
    { value: 'now', label: 'Past 4 hours' },
    { value: 'today', label: 'Past 24 hours' },
    { value: 'week', label: 'Past 7 days' },
];

const IntelligenceHub = ({
    user,
    coinBalance,
    setShowAuthModal,
    setShowProfileModal,
    guestUsageCount,
    setShowToolsModal,
    theme,
    toggleTheme,
    settings
}) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [trends, setTrends] = useState([]);

    // Filter States
    const [selectedCountry, setSelectedCountry] = useState('IN'); // Default to India as per user context
    const [selectedTime, setSelectedTime] = useState('today');

    useEffect(() => {
        const loadTrends = async () => {
            // In a real implementation with a proper API, we'd pass selectedTime too.
            // For now, RSS primarily supports Geo.
            const data = await fetchGoogleTrends(selectedCountry);
            setTrends(data.slice(0, 9)); // Show more trends
        };
        loadTrends();
    }, [selectedCountry, selectedTime]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        if (!settings?.apiKey) {
            setError("Please enter your Groq API Key in settings to use this feature.");
            return;
        }

        setIsSearching(true);
        setError(null);
        setResults(null);

        try {
            const data = await analyzeTrend(query, settings.apiKey);
            setResults(data);
        } catch (err) {
            setError(err.message || "Failed to analyze trend. Please try again.");
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30 flex flex-col">
            {/* Background Effects */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-900/20 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-900/20 blur-[100px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
            </div>

            <div className="max-w-[1600px] mx-auto p-4 lg:p-8 w-full flex-1 flex flex-col">
                <header className="flex items-center justify-between mb-12 pt-safe-offset">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/10"
                            title="Back to Home"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                <Globe className="text-white" size={20} />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-white hidden md:block">Viral Intelligence</h1>
                        </div>
                    </div>

                    <Navbar
                        coinBalance={coinBalance}
                        theme={theme}
                        toggleTheme={toggleTheme}
                        onLoginClick={() => setShowAuthModal(true)}
                        onProfileClick={() => setShowProfileModal(true)}
                        guestUsageCount={guestUsageCount}
                        onToolsClick={() => setShowToolsModal(true)}
                    />
                </header>

                <main className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full">

                    {/* Hero / Search Section */}
                    <div className="w-full text-center mb-12 space-y-6">
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Decode</span> the Trend.
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            Ask anything about current trends, viral content, or market sentiment. Powered by real-time data.
                        </p>

                        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div className="relative flex items-center bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
                                <Search className="text-slate-400 ml-4" size={24} />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="What is trending in tech right now?"
                                    className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500 px-4 py-3 text-lg"
                                />
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="bg-white text-black rounded-xl px-6 py-3 font-medium hover:bg-cyan-50 transition-colors disabled:opacity-50"
                                >
                                    {isSearching ? <Sparkles className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                                </button>
                            </div>
                        </form>

                        {error && (
                            <div className="flex items-center justify-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 max-w-md mx-auto animate-fade-in">
                                <AlertCircle size={18} />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Results Area */}
                    {results && (
                        <div className="w-full bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-md animate-fade-in">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
                                    <Sparkles size={24} />
                                </div>
                                <div className="space-y-4 flex-1">
                                    <h3 className="text-xl font-semibold text-white">Insight</h3>
                                    <p className="text-slate-300 leading-relaxed text-lg">{results.summary}</p>

                                    {results.content_angle && (
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                            <h4 className="text-sm font-medium text-cyan-400 mb-1">Creator Angle</h4>
                                            <p className="text-slate-300 text-sm">{results.content_angle}</p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {results.related?.map((tag, i) => (
                                            <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-slate-400">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full border-4 border-cyan-500 flex items-center justify-center text-xl font-bold text-white mb-2">
                                        {results.viral_score || '?'}
                                    </div>
                                    <span className="text-xs text-slate-400 uppercase tracking-wider">Viral Score</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Suggested / Trending Ticker */}
                    {!results && (
                        <div className="mt-12 w-full">
                            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                                <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Real-time Signals</h3>

                                <div className="flex items-center gap-2">
                                    {/* Country Selector */}
                                    <div className="relative group/menu">
                                        <div className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 cursor-pointer text-sm text-slate-300 transition-colors">
                                            <MapPin size={14} className="text-cyan-400" />
                                            {COUNTRIES.find(c => c.code === selectedCountry)?.name}
                                            <span className="opacity-50 text-xs">▼</span>
                                        </div>
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden hidden group-hover/menu:block z-50 animate-fade-in-up">
                                            {COUNTRIES.map(country => (
                                                <button
                                                    key={country.code}
                                                    onClick={() => setSelectedCountry(country.code)}
                                                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors ${selectedCountry === country.code ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}
                                                >
                                                    <span>{country.flag}</span>
                                                    {country.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Time Selector */}
                                    <div className="relative group/menu">
                                        <div className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 cursor-pointer text-sm text-slate-300 transition-colors">
                                            <Clock size={14} className="text-cyan-400" />
                                            {TIME_RANGES.find(t => t.value === selectedTime)?.label}
                                            <span className="opacity-50 text-xs">▼</span>
                                        </div>
                                        <div className="absolute right-0 top-full mt-2 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden hidden group-hover/menu:block z-50 animate-fade-in-up">
                                            {TIME_RANGES.map(range => (
                                                <button
                                                    key={range.value}
                                                    onClick={() => setSelectedTime(range.value)}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-800 transition-colors ${selectedTime === range.value ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}
                                                >
                                                    {range.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {trends.length > 0 ? (
                                    trends.map((item, i) => (
                                        <div key={i} className="relative group perspective-1000">
                                            {/* Hover Card */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[320px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50 pointer-events-none">

                                                {item.image && (
                                                    <div className="w-full h-32 rounded-lg bg-cover bg-center mb-4 relative overflow-hidden" style={{ backgroundImage: `url(${item.image})` }}>
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-bold bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">{item.source || 'News'}</span>
                                                    <span className="text-xs text-slate-400">{item.date ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                                                </div>

                                                <h4 className="font-bold text-lg leading-tight mb-2 text-white">{item.name}</h4>

                                                <p className="text-sm text-slate-300 line-clamp-3">
                                                    {item.description || "No description available for this trending topic."}
                                                </p>

                                                {/* Arrow */}
                                                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-white/10 transform rotate-45"></div>
                                            </div>

                                            {/* Main Card */}
                                            <div
                                                onClick={() => setQuery(`Why is ${item.name} trending right now?`)}
                                                className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all cursor-pointer h-full"
                                            >
                                                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                                                    <TrendingUp size={16} />
                                                    <span className="text-xs font-medium uppercase tracking-wider">{item.growth || 'Trending'}</span>
                                                </div>
                                                <p className="text-slate-300 font-medium group-hover:text-white transition-colors truncate">
                                                    {item.name}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    // Loading Skeletons
                                    [1, 2, 3].map((i) => (
                                        <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse"></div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
};

export default IntelligenceHub;

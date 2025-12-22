import React, { useState, useEffect } from 'react';
import { Search, Globe, Sparkles, X, Check, AlertCircle, Loader2, Bookmark, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DomainScout = ({ onClose, user }) => {
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [watchlist, setWatchlist] = useState([]);
    const [activeTab, setActiveTab] = useState('search'); // 'search' | 'watchlist'
    const [error, setError] = useState(null);

    // Fetch watchlist on mount
    useEffect(() => {
        if (user) fetchWatchlist();
        else {
            const localWatchlist = JSON.parse(localStorage.getItem('domain_watchlist') || '[]');
            setWatchlist(localWatchlist);
        }
    }, [user]);

    const fetchWatchlist = async () => {
        try {
            const { data, error } = await supabase
                .from('watched_domains')
                .select('*')
                .order('created_at', { ascending: false });

            if (error && error.code !== 'PGRST116') { // Ignore if table doesn't exist yet
                console.warn("Watchlist fetch error (table might not exist yet):", error);
            }

            if (data) setWatchlist(data);
        } catch (err) {
            console.error("Error fetching watchlist:", err);
        }
    };

    const generateVariations = (base) => {
        const cleanBase = base.toLowerCase().replace(/[^a-z0-9]/g, '');
        const prefixes = ['get', 'go', 'try', 'the', 'my', 'pro', 'app', 'join', 'hello', 'real'];
        const suffixes = ['app', 'hq', 'io', 'ai', 'lab', 'hub', 'pro', 'zone', 'vibe', 'now', 'box'];
        const tlds = ['.com', '.io', '.ai', '.co', '.net', '.org', '.xyz'];

        const variations = [];

        // Exact match
        tlds.forEach(tld => variations.push(cleanBase + tld));

        // Prefixes
        prefixes.forEach(pre => {
            variations.push(pre + cleanBase + '.com');
            variations.push(pre + cleanBase + '.io');
        });

        // Suffixes
        suffixes.forEach(suf => {
            variations.push(cleanBase + suf + '.com');
            variations.push(cleanBase + suf + '.io');
        });

        // Random selection to keep it snappy (max 20)
        return variations.sort(() => 0.5 - Math.random()).slice(0, 20);
    };

    const checkAvailability = async (domain) => {
        try {
            // Google DNS-over-HTTPS
            // Status 0 = No Error (Exists)
            // Status 3 = NXDOMAIN (Does not exist -> Likely Available!)
            const response = await fetch(`https://dns.google/resolve?name=${domain}`);
            const data = await response.json();

            if (data.Status === 3) {
                return { domain, status: 'available', price: 10 }; // Standard reg fee
            } else {
                return { domain, status: 'taken', price: null };
            }
        } catch (err) {
            return { domain, status: 'unknown', price: null };
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!keyword.trim()) return;

        setIsSearching(true);
        setError(null);
        setResults([]);
        setActiveTab('search');

        try {
            const domainsToCheck = generateVariations(keyword);
            const promises = domainsToCheck.map(checkAvailability);
            const checkedResults = await Promise.all(promises);

            // Sort: Available first, then by length
            checkedResults.sort((a, b) => {
                if (a.status === 'available' && b.status !== 'available') return -1;
                if (a.status !== 'available' && b.status === 'available') return 1;
                return a.domain.length - b.domain.length;
            });

            setResults(checkedResults);
        } catch (err) {
            setError("Failed to check domains. Please try again.");
        } finally {
            setIsSearching(false);
        }
    };

    const toggleWatch = async (domainObj) => {
        const isWatching = watchlist.some(w => w.domain === domainObj.domain);

        if (isWatching) {
            // Remove
            const newList = watchlist.filter(w => w.domain !== domainObj.domain);
            setWatchlist(newList);

            if (user) {
                await supabase.from('watched_domains').delete().eq('domain', domainObj.domain).eq('user_id', user.id);
            } else {
                localStorage.setItem('domain_watchlist', JSON.stringify(newList));
            }
        } else {
            // Add
            const newItem = {
                domain: domainObj.domain,
                status: domainObj.status,
                created_at: new Date().toISOString()
            };
            const newList = [newItem, ...watchlist];
            setWatchlist(newList);

            if (user) {
                await supabase.from('watched_domains').insert([{
                    user_id: user.id,
                    domain: domainObj.domain,
                    status: domainObj.status
                }]);
            } else {
                localStorage.setItem('domain_watchlist', JSON.stringify(newList));
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-4xl bg-[#0f0f12] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b border-emerald-500/20 bg-emerald-950/20 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Globe className="text-emerald-400" size={24} />
                            Domain Scout
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                                Free
                            </span>
                        </h2>
                        <p className="text-emerald-200/60 mt-1">Find premium-sounding domains that are unregistered ($10).</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs & Search */}
                <div className="p-6 pb-0 flex flex-col gap-6">
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Enter a keyword (e.g., 'viral', 'creator')..."
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 pl-14 text-white text-lg placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400/50" size={24} />
                        <button
                            type="submit"
                            disabled={isSearching || !keyword}
                            className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                            Find Gems
                        </button>
                    </form>

                    <div className="flex items-center gap-4 border-b border-white/10">
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`pb-4 px-2 font-medium text-sm transition-all relative ${activeTab === 'search' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            Search Results
                            {activeTab === 'search' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 rounded-full" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('watchlist')}
                            className={`pb-4 px-2 font-medium text-sm transition-all relative ${activeTab === 'watchlist' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            Watchlist ({watchlist.length})
                            {activeTab === 'watchlist' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 rounded-full" />}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {activeTab === 'search' ? (
                        <div className="space-y-3">
                            {isSearching && (
                                <div className="text-center py-20">
                                    <Loader2 className="animate-spin text-emerald-500 mx-auto mb-4" size={40} />
                                    <p className="text-white/50">Scanning availability...</p>
                                </div>
                            )}

                            {!isSearching && results.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {results.map((res, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-xl border flex items-center justify-between group transition-all ${res.status === 'available'
                                                    ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                                                    : 'bg-white/5 border-white/5 opacity-60'
                                                }`}
                                        >
                                            <div>
                                                <h3 className={`font-bold text-lg ${res.status === 'available' ? 'text-white' : 'text-slate-400 line-through'}`}>
                                                    {res.domain}
                                                </h3>
                                                {res.status === 'available' ? (
                                                    <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                                        <Check size={12} strokeWidth={3} /> Available (~$10/yr)
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-red-400 font-medium">Taken</p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => toggleWatch(res)}
                                                    className={`p-2 rounded-lg transition-colors ${watchlist.some(w => w.domain === res.domain)
                                                            ? 'bg-emerald-500 text-black'
                                                            : 'bg-white/10 text-white hover:bg-white/20'
                                                        }`}
                                                    title="Add to Watchlist"
                                                >
                                                    <Bookmark size={18} fill={watchlist.some(w => w.domain === res.domain) ? "currentColor" : "none"} />
                                                </button>
                                                {res.status === 'available' && (
                                                    <a
                                                        href={`https://www.namecheap.com/domains/registration/results/?domain=${res.domain}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 transition-colors"
                                                        title="Register Now"
                                                    >
                                                        <ExternalLink size={18} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isSearching && results.length === 0 && !error && (
                                <div className="text-center py-20 text-white/30">
                                    <Globe size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Enter a keyword to look for hidden gem domains.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Watchlist Tab
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {watchlist.length > 0 ? watchlist.map((item, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{item.domain}</h3>
                                        <p className="text-xs text-emerald-400 font-medium">Tracked</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`https://www.namecheap.com/domains/registration/results/?domain=${item.domain}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                        >
                                            Buy
                                        </a>
                                        <button
                                            onClick={() => toggleWatch(item)}
                                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full text-center py-20 text-white/30">
                                    <Bookmark size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Your watchlist is empty.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DomainScout;

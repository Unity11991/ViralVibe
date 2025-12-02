import React from 'react';
import { Sparkles, History, Moon, Sun, Zap, Cloud, Coins } from 'lucide-react';

const THEMES = [
    { id: 'midnight', label: 'Midnight', icon: Moon },
    { id: 'sunset', label: 'Sunset', icon: Sun },
    { id: 'cyberpunk', label: 'Cyberpunk', icon: Zap },
    { id: 'genie', label: 'Genie', icon: Cloud },
    { id: 'monster', label: 'Monster', icon: Zap },
];

const Navbar = ({ currentTheme, onThemeChange, onHistoryClick, coinBalance, onCoinsClick }) => {
    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
            <div className="glass-panel rounded-full px-6 py-3 flex items-center justify-between shadow-2xl shadow-black/20 border border-white/20 backdrop-blur-xl bg-white/10">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight hidden sm:block">
                        Viral<span className="text-purple-300">Vibe</span>
                    </span>
                </div>

                {/* Themes */}
                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-full overflow-x-auto max-w-[150px] sm:max-w-none scrollbar-hide">
                    {THEMES.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => onThemeChange(theme.id)}
                            className={`p-2 rounded-full transition-all duration-300 relative group
                                ${currentTheme === theme.id
                                    ? 'bg-white text-black shadow-lg scale-100'
                                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                            title={theme.label}
                        >
                            <theme.icon size={18} />
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {/* Coin Balance */}
                    <button
                        onClick={onCoinsClick}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-all border border-amber-500/20 hover:border-amber-500/40"
                    >
                        <Coins size={18} />
                        <span className="font-bold">{coinBalance}</span>
                    </button>

                    {/* History */}
                    <button
                        onClick={onHistoryClick}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all border border-white/10 hover:border-white/20"
                    >
                        <History size={18} />
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

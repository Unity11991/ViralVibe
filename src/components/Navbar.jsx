import React from 'react';
import { History, Coins, Sun, Moon, LogOut, User, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onHistoryClick, coinBalance, onCoinsClick, theme, toggleTheme, onLoginClick, onProfileClick, guestUsageCount, onToolsClick, onTrendsClick, onPremiumClick }) => {
    const { user, signOut } = useAuth();

    return (
        <div className="flex items-center gap-2 md:gap-3">
            {/* Unlock Premium Magic Button */}
            <button
                onClick={onPremiumClick}
                className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all hover:scale-105 group animate-pulse-slow"
            >
                <Sparkles size={16} className="text-white fill-white" />
                <span className="font-bold text-sm hidden sm:inline">Unlock Premium Magic</span>
            </button>

            {/* Trends Button */}
            <button
                onClick={onTrendsClick}
                className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 transition-all border border-orange-500/20 hover:border-orange-500/40 group"
            >
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp size={12} className="text-white" />
                </div>
                <span className="font-medium text-sm hidden sm:inline">Trends</span>
            </button>

            {/* Tools Button */}
            <button
                onClick={onToolsClick}
                className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10 hover:border-white/20 group"
            >
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles size={12} className="text-white" fill="currentColor" />
                </div>
                <span className="font-medium text-sm hidden sm:inline">Tools</span>
            </button>

            {/* Guest Usage Counter */}
            {!user && (
                <div className="hidden xs:flex items-center gap-2 px-2 md:px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm font-medium">
                    <span className="whitespace-nowrap">Free: {Math.max(0, 3 - (guestUsageCount || 0))}/3</span>
                </div>
            )}

            {/* Coin Balance */}
            {user && (
                <button
                    onClick={onCoinsClick}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-all border border-amber-500/20 hover:border-amber-500/40 group"
                >
                    <Coins size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="font-bold font-mono">{coinBalance}</span>
                </button>
            )}

            {/* History */}
            <button
                onClick={onHistoryClick}
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10 hover:border-white/20 group"
                title="History"
            >
                <History size={18} className="group-hover:-rotate-12 transition-transform" />
            </button>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10 hover:border-white/20 group"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                {theme === 'dark' ? (
                    <Sun size={18} className="group-hover:rotate-90 transition-transform" />
                ) : (
                    <Moon size={18} className="group-hover:-rotate-12 transition-transform" />
                )}
            </button>

            {/* Auth Button */}
            {user ? (
                <button
                    onClick={onProfileClick}
                    className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all border border-indigo-500/20 hover:border-indigo-500/40 group"
                    title="Profile"
                >
                    <User size={18} className="group-hover:scale-110 transition-transform" />
                </button>
            ) : (
                <button
                    onClick={onLoginClick}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20"
                >
                    <User size={18} />
                    <span className="font-medium hidden sm:inline">Login</span>
                    <span className="sm:hidden text-sm">Login</span>
                </button>
            )}
        </div>
    );
};

export default Navbar;

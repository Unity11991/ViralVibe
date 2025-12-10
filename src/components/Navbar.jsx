import React, { useState } from 'react';
import { History, Coins, Sun, Moon, LogOut, User, Sparkles, TrendingUp, Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onHistoryClick, coinBalance, onCoinsClick, theme, toggleTheme, onLoginClick, onProfileClick, guestUsageCount, onToolsClick, onTrendsClick, onPremiumClick, onIntelligenceClick }) => {
    const { user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const MobileMenuItem = ({ onClick, icon: Icon, label, colorClass = "text-slate-300" }) => (
        <button
            onClick={() => {
                onClick();
                setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
        >
            <Icon size={20} className={colorClass} />
            <span className="font-medium text-slate-200">{label}</span>
        </button>
    );

    return (
        <div className="relative">
            {/* Main Bar */}
            <div className="flex items-center gap-2 md:gap-3">
                {/* Unlock Premium Magic Button - Always Visible but compact on mobile */}
                <button
                    onClick={onPremiumClick}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all hover:scale-105 group animate-pulse-slow"
                >
                    <Sparkles size={16} className="text-white fill-white" />
                    <span className="font-bold text-sm hidden md:inline">Unlock Premium Magic</span>
                </button>

                {/* Desktop Items (Hidden on Mobile) */}
                <div className="hidden md:flex items-center gap-2">
                    {/* Intelligence Button */}
                    <button
                        onClick={onIntelligenceClick}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition-all border border-cyan-500/20 hover:border-cyan-500/40 group"
                    >
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Globe size={12} className="text-white" />
                        </div>
                        <span className="font-medium text-sm">Intel</span>
                    </button>

                    {/* Trends Button */}
                    <button
                        onClick={onTrendsClick}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 transition-all border border-orange-500/20 hover:border-orange-500/40 group"
                    >
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <TrendingUp size={12} className="text-white" />
                        </div>
                        <span className="font-medium text-sm">Trends</span>
                    </button>

                    {/* Tools Button */}
                    <button
                        onClick={onToolsClick}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10 hover:border-white/20 group"
                    >
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles size={12} className="text-white" fill="currentColor" />
                        </div>
                        <span className="font-medium text-sm">Tools</span>
                    </button>
                </div>

                {/* Coin Balance - Always Visible */}
                {user && (
                    <button
                        onClick={onCoinsClick}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-all border border-amber-500/20 hover:border-amber-500/40 group"
                    >
                        <Coins size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="font-bold font-mono">{coinBalance}</span>
                    </button>
                )}

                {/* Desktop Actions (History, Theme) */}
                <div className="hidden md:flex items-center gap-2">
                    <button
                        onClick={onHistoryClick}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10 hover:border-white/20 group"
                        title="History"
                    >
                        <History size={18} className="group-hover:-rotate-12 transition-transform" />
                    </button>

                    <button
                        onClick={toggleTheme}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10 hover:border-white/20 group"
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {theme === 'dark' ? (
                            <Sun size={18} className="group-hover:rotate-90 transition-transform" />
                        ) : (
                            <Moon size={18} className="group-hover:-rotate-12 transition-transform" />
                        )}
                    </button>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                {/* Auth Button - Always Visible */}
                {user ? (
                    <button
                        onClick={onProfileClick}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all border border-indigo-500/20 hover:border-indigo-500/40 group"
                    >
                        <User size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                ) : (
                    <button
                        onClick={onLoginClick}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <User size={18} />
                        <span className="font-medium hidden sm:inline">Login</span>
                    </button>
                )}
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 md:hidden">
                    <MobileMenuItem onClick={onIntelligenceClick} icon={Globe} label="Viral Intelligence" colorClass="text-cyan-400" />
                    <MobileMenuItem onClick={onTrendsClick} icon={TrendingUp} label="Trending Now" colorClass="text-orange-400" />
                    <MobileMenuItem onClick={onToolsClick} icon={Sparkles} label="Creator Tools" colorClass="text-pink-400" />
                    <div className="h-px bg-white/10 my-1" />
                    <MobileMenuItem onClick={onHistoryClick} icon={History} label="History" />
                    <MobileMenuItem onClick={toggleTheme} icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} />
                    {!user && (
                        <div className="px-3 py-2 text-xs text-slate-500 text-center">
                            Free Generations: {Math.max(0, 3 - (guestUsageCount || 0))}/3
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Navbar;

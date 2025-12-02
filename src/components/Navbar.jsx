import React from 'react';
import { History, Coins, Sun, Moon } from 'lucide-react';

const Navbar = ({ onHistoryClick, coinBalance, onCoinsClick, theme, toggleTheme }) => {
    return (
        <div className="flex items-center gap-3">
            {/* Coin Balance */}
            <button
                onClick={onCoinsClick}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-all border border-amber-500/20 hover:border-amber-500/40 group"
            >
                <Coins size={18} className="group-hover:scale-110 transition-transform" />
                <span className="font-bold font-mono">{coinBalance}</span>
            </button>

            {/* History */}
            <button
                onClick={onHistoryClick}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10 hover:border-white/20 group"
                title="History"
            >
                <History size={20} className="group-hover:-rotate-12 transition-transform" />
            </button>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10 hover:border-white/20 group"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                {theme === 'dark' ? (
                    <Sun size={20} className="group-hover:rotate-90 transition-transform" />
                ) : (
                    <Moon size={20} className="group-hover:-rotate-12 transition-transform" />
                )}
            </button>
        </div>
    );
};

export default Navbar;

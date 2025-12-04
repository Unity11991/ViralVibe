import React from 'react';
import { History, Coins, Sun, Moon, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onHistoryClick, coinBalance, onCoinsClick, theme, toggleTheme, onLoginClick, onProfileClick }) => {
    const { user, signOut } = useAuth();

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

            {/* Auth Button */}
            {user ? (
                <button
                    onClick={onProfileClick}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all border border-indigo-500/20 hover:border-indigo-500/40 group"
                    title="Profile"
                >
                    <User size={20} className="group-hover:scale-110 transition-transform" />
                </button>
            ) : (
                <button
                    onClick={onLoginClick}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20"
                >
                    <User size={18} />
                    <span className="font-medium">Login</span>
                </button>
            )}
        </div>
    );
};

export default Navbar;

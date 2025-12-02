import React, { useState } from 'react';
import { Palette, Moon, Sun, Zap, Cloud } from 'lucide-react';

const THEMES = [
    { id: 'midnight', label: 'Midnight', icon: Moon, color: 'bg-slate-900' },
    { id: 'sunset', label: 'Sunset', icon: Sun, color: 'bg-orange-500' },
    { id: 'cyberpunk', label: 'Cyberpunk', icon: Zap, color: 'bg-green-500' },
    { id: 'genie', label: 'Genie', icon: Cloud, color: 'bg-blue-400' },
    { id: 'monster', label: 'Monster', icon: Zap, color: 'bg-sky-400' },
];

const ThemeSelector = ({ currentTheme, onThemeChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 rounded-full glass-panel hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                title="Change Theme"
            >
                <Palette size={20} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 glass-panel p-2 flex flex-col gap-1 z-50 animate-fade-in">
                    {THEMES.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => {
                                onThemeChange(theme.id);
                                setIsOpen(false);
                            }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${currentTheme === theme.id
                                    ? 'bg-white/10 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <theme.icon size={16} className={currentTheme === theme.id ? 'text-purple-400' : ''} />
                            {theme.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ThemeSelector;

import React from 'react';
import { X, Lock, Sparkles, Zap } from 'lucide-react';

const LimitReachedModal = ({ isOpen, onClose, onLogin }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-[#0f0f0f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white z-20"
                >
                    <X size={20} />
                </button>

                <div className="p-8 flex flex-col items-center text-center relative">

                    {/* Teaser Visual */}
                    <div className="relative w-full aspect-video bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-2xl mb-8 overflow-hidden border border-white/5 group">

                        {/* Blurred Content Layer */}
                        <div className="absolute inset-0 p-6 flex flex-col items-center justify-center blur-md opacity-50 scale-105">
                            <div className="w-20 h-20 rounded-full border-4 border-indigo-500 mb-4"></div>
                            <div className="h-4 w-3/4 bg-white/20 rounded mb-2"></div>
                            <div className="h-4 w-1/2 bg-white/20 rounded"></div>
                        </div>

                        {/* Lock Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px]">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-4 animate-bounce-slow">
                                <Lock size={32} className="text-white" />
                            </div>
                            <div className="px-4 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full backdrop-blur-md">
                                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Viral Potential: 94/100</span>
                            </div>
                        </div>
                    </div>

                    {/* Text Content */}
                    <h2 className="text-2xl font-bold text-white mb-2">
                        You've gone viral... <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">almost!</span>
                    </h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        You've reached your daily limit of 3 free generations. Create a free account to unlock this result and get <span className="text-white font-bold">50 free coins</span> instantly.
                    </p>

                    {/* Actions */}
                    <div className="w-full space-y-3">
                        <button
                            onClick={() => {
                                onClose();
                                onLogin();
                            }}
                            className="w-full py-4 bg-white text-black hover:bg-gray-100 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] shadow-xl shadow-white/10 flex items-center justify-center gap-2"
                        >
                            <Zap size={20} className="fill-black" />
                            Login to Reveal
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-3 text-gray-500 hover:text-white font-medium transition-colors text-sm"
                        >
                            Maybe later
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LimitReachedModal;

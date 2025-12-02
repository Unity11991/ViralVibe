import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Loader } from 'lucide-react';

const AdModal = ({ isOpen, onAdComplete }) => {
    const [timeLeft, setTimeLeft] = useState(5);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeLeft(5);
            setIsCompleted(false);
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setIsCompleted(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="glass-panel p-8 max-w-md w-full text-center relative overflow-hidden border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20">

                {/* Background Animation */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 z-0"></div>

                <div className="relative z-10">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-400">
                        {isCompleted ? <CheckCircle size={32} /> : <Play size={32} className="ml-1" />}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                        {isCompleted ? "Reward Granted!" : "Watch Ad for +35 Coins"}
                    </h2>

                    <p className="text-slate-300 mb-8">
                        {isCompleted
                            ? "You've earned 35 coins."
                            : "Support ViralVibe by watching this short ad."}
                    </p>

                    {!isCompleted ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-4xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                {timeLeft}s
                            </div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Remaining</p>
                        </div>
                    ) : (
                        <button
                            onClick={onAdComplete}
                            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Claim Reward
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdModal;

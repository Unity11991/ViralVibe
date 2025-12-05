import React from 'react';
import { Sparkles, Check, X, Zap } from 'lucide-react';

const ProModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-slate-900 border border-purple-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-purple-500/20 animate-fade-in overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-500/20 to-transparent pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                >
                    <X size={24} />
                </button>

                <div className="relative z-10 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-6 shadow-lg shadow-purple-500/30">
                        <Zap className="w-8 h-8 text-white fill-current" />
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">Upgrade to Pro</h2>
                    <p className="text-slate-400 mb-8">
                        You've reached your daily limit of 5 free vibes. Unlock unlimited power!
                    </p>

                    <div className="space-y-4 mb-8 text-left">
                        {[
                            'Unlimited AI Generations',
                            'Access to Advanced Models',
                            'Priority Processing Speed',
                            'Exclusive "Genie" & "Cyberpunk" Themes',
                            'Commercial Usage Rights'
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3 text-slate-200">
                                <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                                    <Check size={14} />
                                </div>
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>

                    <button className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25">
                        Get Pro Access - $9/mo
                    </button>

                    <p className="mt-4 text-xs text-slate-500">
                        Secure payment via Stripe. Cancel anytime.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProModal;

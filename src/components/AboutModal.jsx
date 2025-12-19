import React from 'react';
import { X, Github, Twitter, Linkedin, Mail, Globe, Sparkles, Code, Heart, Zap } from 'lucide-react';

import sawanProfileImg from '../assets/sawan-profile.png';

const AboutModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header Background */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-20" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="relative px-8 pt-12 pb-8">
                    {/* App Logo/Title */}
                    <div className="flex flex-col items-center text-center mb-10">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
                            <Zap className="text-white" size={32} fill="currentColor" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            GoVyral <span className="text-xs align-top opacity-50 font-medium">beta</span>
                        </h2>
                        <p className="text-slate-400 max-w-md">
                            The ultimate AI-powered creative suite for modern content creators.
                        </p>
                    </div>

                    {/* Creator Section */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-md">
                        <div className="flex items-start gap-5">
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full border-2 border-white/10 overflow-hidden shrink-0 shadow-lg">
                                <img
                                    src={sawanProfileImg}
                                    alt="Sawan Chouhan"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-xl font-bold text-white">Created by Sawan Chouhan</h3>
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        Lead Developer
                                    </span>
                                </div>
                                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                                    Passionate about building tools that empower creators. Specialized in AI integration, modern web technologies, and crafting intuitive user experiences.
                                </p>

                                {/* Social Links */}
                                <div className="flex items-center gap-3">
                                    <SocialLink href="#" icon={Github} label="GitHub" />
                                    <SocialLink href="#" icon={Twitter} label="Twitter" />
                                    <SocialLink href="#" icon={Linkedin} label="LinkedIn" />
                                    <SocialLink href="#" icon={Globe} label="Portfolio" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tech Stack / Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <InfoCard
                            icon={Heart}
                            title="Mission"
                            desc="Democratizing viral content creation."
                            color="text-rose-400"
                            bg="bg-rose-500/10"
                        />
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center pt-6 border-t border-white/5">
                        <p className="text-slate-500 text-sm">
                            © 2025 GoVyral. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};



const SocialLink = ({ href, icon: Icon, label }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5 hover:border-white/20"
        title={label}
    >
        <Icon size={18} />
    </a>
);

const InfoCard = ({ icon: Icon, title, desc, color, bg }) => (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
        <div className={`p-2 rounded-lg ${bg} ${color} shrink-0`}>
            <Icon size={20} />
        </div>
        <div>
            <h4 className="text-white font-medium text-sm mb-0.5">{title}</h4>
            <p className="text-slate-400 text-xs">{desc}</p>
        </div>
    </div>
);

export default AboutModal;

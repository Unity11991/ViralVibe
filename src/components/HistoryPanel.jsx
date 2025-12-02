import React, { useState, useEffect } from 'react';
import { History, X, Clock, Copy, Trash2 } from 'lucide-react';

const HistoryPanel = ({ history, onSelect, onDelete, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Sidebar Drawer */}
            <div className="fixed inset-y-0 right-0 w-80 glass-panel border-l border-white/10 z-50 transform transition-transform animate-drawer-slide flex flex-col shadow-2xl shadow-black/50">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2 text-purple-300">
                        <History size={20} />
                        <h2 className="font-bold text-lg">History</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center text-slate-500 py-10">
                            <Clock size={32} className="mx-auto mb-3 opacity-50" />
                            <p>No history yet.</p>
                            <p className="text-xs mt-1">Generate some magic!</p>
                        </div>
                    ) : (
                        history.map((item) => (
                            <div
                                key={item.id}
                                className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-700/50 transition-all cursor-pointer group border border-transparent hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10"
                                onClick={() => onSelect(item)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-slate-400 font-mono">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(item.id);
                                        }}
                                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-200 line-clamp-2 font-medium mb-2 leading-relaxed">
                                    {item.captions[0]}
                                </p>
                                <div className="flex gap-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20 uppercase tracking-wider font-bold">
                                        {item.platform}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/20 uppercase tracking-wider font-bold">
                                        {item.mood || item.tone}
                                    </span>
                                </div>
                                {item.musicRecommendations && item.musicRecommendations.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-white/5">
                                        <p className="text-xs text-slate-400 mb-1 font-bold">Suggested Music:</p>
                                        <div className="space-y-1">
                                            {item.musicRecommendations.slice(0, 2).map((music, idx) => (
                                                <div key={idx} className="text-xs text-slate-300 flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                                                    <span className="font-medium">{music.song}</span>
                                                    <span className="text-slate-500">- {music.artist}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

export default HistoryPanel;

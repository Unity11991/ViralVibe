import React, { useState, useEffect } from 'react';
import { History, X, Clock, Copy, Trash2 } from 'lucide-react';

const HistoryPanel = ({ history, onSelect, onDelete, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 left-0 w-80 glass-panel border-r border-white/10 z-50 transform transition-transform animate-fade-in flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-300">
                    <History size={20} />
                    <h2 className="font-bold text-lg">History</h2>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                            className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-700/50 transition-colors cursor-pointer group border border-transparent hover:border-purple-500/30"
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
                                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <p className="text-sm text-slate-200 line-clamp-2 font-medium mb-2">
                                {item.captions[0]}
                            </p>
                            <div className="flex gap-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                                    {item.platform}
                                </span>
                                <span className="text-xs px-2 py-1 rounded-full bg-pink-500/20 text-pink-300">
                                    {item.tone}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistoryPanel;

import React, { useEffect, useState } from 'react';
import { Loader, CheckCircle, Sparkles, UploadCloud, Zap } from 'lucide-react';

const ProgressPopup = ({ isVisible, progress, currentStep, elapsedTime }) => {
    if (!isVisible) return null;

    const steps = [
        { id: 'upload', label: 'Uploading Image', icon: UploadCloud },
        { id: 'analyze', label: 'Analyzing Content', icon: Sparkles },
        { id: 'generate', label: 'Generating Magic', icon: Zap },
        { id: 'finalize', label: 'Finalizing Results', icon: CheckCircle },
    ];

    const getStepStatus = (stepId) => {
        const stepOrder = ['upload', 'analyze', 'generate', 'finalize'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const stepIndex = stepOrder.indexOf(stepId);

        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                <div className="text-center mb-8">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                        {/* Circular Progress */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="transparent"
                                className="text-slate-100"
                            />
                            <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * progress) / 100}
                                className="text-purple-600 transition-all duration-300 ease-out"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-xl font-bold text-slate-900">{Math.round(progress)}%</span>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-1">Analyzing Your Content</h3>
                    <p className="text-sm text-slate-500">Processing with AI vision...</p>
                </div>

                {/* Steps */}
                <div className="space-y-4 mb-6">
                    {/* Progress Bar */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span>Step {steps.findIndex(s => s.id === currentStep) + 1} of 4</span>
                        <span>{elapsedTime}s elapsed</span>
                    </div>

                    {/* Step Dots */}
                    <div className="flex justify-center gap-2 mt-2">
                        {steps.map((step) => {
                            const status = getStepStatus(step.id);
                            return (
                                <div
                                    key={step.id}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${status === 'active' ? 'bg-purple-500 scale-125' :
                                            status === 'completed' ? 'bg-purple-300' : 'bg-slate-200'
                                        }`}
                                ></div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressPopup;

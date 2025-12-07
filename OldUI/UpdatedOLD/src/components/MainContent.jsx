import React, { useEffect, useRef } from 'react';
import { Sparkles, AlertCircle, Zap } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { ResultsSection } from './ResultCard';
import OptionsPanel from './OptionsPanel';
import Navbar from './Navbar';
import Dashboard from './Dashboard';

const MainContent = ({
    currentView,
    setCurrentView,
    coinBalance,
    streak,
    history,
    totalCoinsSpent,
    setShowAdModal,
    handlePurchase,
    isAnalyzing,
    image,
    handleImageSelect,
    setShowMediaEditor,
    settings,
    setSettings,
    showMoodError,
    error,
    handleAnalyze,
    results,
    user,
    setShowAuthModal,
    setShowPremiumHub,
    setIsHistoryOpen,
    theme,
    toggleTheme,
    setShowProfileModal,
    guestUsageCount,
    setShowToolsModal
}) => {
    const resultsRef = useRef(null);

    // Auto-scroll to results on mobile when results are generated
    useEffect(() => {
        if (results && resultsRef.current && window.innerWidth < 1024) { // 1024px is the lg breakpoint
            // Small delay to ensure rendering is complete
            setTimeout(() => {
                resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [results]);

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1 max-w-[1600px] mx-auto p-4 lg:p-8 w-full flex flex-col">
                {/* Header */}
                <header className="flex items-center justify-between mb-8 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Zap className="text-white" size={20} fill="currentColor" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-primary hidden md:block">GoVyral</h1>
                    </div>

                    <Navbar
                        onHistoryClick={() => setIsHistoryOpen(true)}
                        coinBalance={coinBalance}
                        onCoinsClick={() => {
                            if (!user) {
                                setShowAuthModal(true);
                            } else {
                                setCurrentView('dashboard');
                            }
                        }}
                        theme={theme}
                        toggleTheme={toggleTheme}
                        onLoginClick={() => setShowAuthModal(true)}
                        onProfileClick={() => setShowProfileModal(true)}
                        guestUsageCount={guestUsageCount}
                        onToolsClick={() => setShowToolsModal(true)}
                    />
                </header>

                {currentView === 'dashboard' ? (
                    <Dashboard
                        balance={coinBalance}
                        streak={streak}
                        history={history}
                        totalCoinsSpent={totalCoinsSpent}
                        onBack={() => setCurrentView('home')}
                        onWatchAd={() => setShowAdModal(true)}
                        onPurchase={handlePurchase}
                    />
                ) : (
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 min-h-0">

                        {/* Left Column: Controls (Scrollable) */}
                        <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-20 lg:pb-0">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-light tracking-tight text-primary">
                                    Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-medium">Viral Magic</span>
                                </h2>
                                <p className="text-secondary text-lg">Upload, customize, and let AI handle the rest.</p>
                            </div>

                            <div className="space-y-6">
                                <ImageUploader
                                    onImageSelect={handleImageSelect}
                                    isAnalyzing={isAnalyzing}
                                    onEdit={() => setShowMediaEditor(true)}
                                    selectedFile={image}
                                />

                                <OptionsPanel
                                    settings={settings}
                                    onSettingsChange={setSettings}
                                    showMoodError={showMoodError}
                                />

                                {error && (
                                    <div className="glass-panel p-4 border-red-500/30 bg-red-500/10 flex items-center gap-3 text-red-200 animate-slide-in">
                                        <AlertCircle className="text-red-500 shrink-0" size={20} />
                                        <p className="font-medium text-sm">{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleAnalyze}
                                    disabled={!image || isAnalyzing}
                                    className={`
                    w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300
                    ${!image || isAnalyzing
                                            ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                            : 'bg-white text-black hover:scale-[1.02] shadow-xl shadow-white/10'
                                        }
                  `}
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={20} />
                                            <span>Generate Content</span>
                                            <span className="text-xs bg-black/10 px-2 py-0.5 rounded-full font-medium">
                                                -{image?.type?.startsWith('video/') ? '100' : '50'}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Results (Scrollable) */}
                        <div
                            ref={resultsRef}
                            className={`lg:col-span-7 h-full glass-panel overflow-hidden flex-col relative ${results ? 'flex' : 'hidden lg:flex'}`}
                        >
                            {results ? (
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
                                    <ResultsSection
                                        results={results}
                                        onOpenPremium={() => {
                                            if (!user) {
                                                setShowAuthModal(true);
                                            } else {
                                                setShowPremiumHub(true);
                                            }
                                        }}
                                        onOpenEditor={() => setShowMediaEditor(true)}
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-secondary">
                                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse">
                                        <Sparkles size={40} className="text-primary/20" />
                                    </div>
                                    <h3 className="text-xl font-medium text-primary mb-2">Ready to Create?</h3>
                                    <p className="max-w-xs mx-auto">Upload an image and configure your settings to see AI-generated insights here.</p>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default MainContent;

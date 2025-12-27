import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, Zap, ArrowLeft, TrendingUp } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { ResultsSection } from './ResultCard';
import OptionsPanel from './OptionsPanel';
import Navbar from './Navbar';
import Dashboard from './Dashboard';
import TrendingSidebar from './TrendingSidebar';
import AdBanner from './AdBanner';
import FeatureShowcase from './FeatureShowcase';

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
    setShowToolsModal,
    lastLoginDate,
    setCoinBalance,
    setStreak,
    setLastLoginDate,
    setShowShareModal,
    onSelectTool,
    onAboutClick,
    isLiteMode
}) => {
    const navigate = useNavigate();
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

    if (currentView === 'trending') {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-4 pt-8 animate-fade-in custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setCurrentView('home')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                            Back to Home
                        </button>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <TrendingUp className="text-orange-400" /> Viral Trends
                        </h1>
                    </div>
                    <TrendingSidebar apiKey={settings?.apiKey} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1 max-w-[1600px] mx-auto p-4 lg:p-8 w-full flex flex-col">
                {/* Header */}
                <header className="flex items-center justify-between mb-8 shrink-0 pt-safe-offset">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Zap className="text-white" size={20} fill="currentColor" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-primary hidden md:flex items-baseline">
                            GoVyral
                            <span className="text-xs ml-1 opacity-50 font-medium">beta</span>
                        </h1>
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
                        onTrendsClick={() => setCurrentView('trending')}
                        onPremiumClick={() => {
                            if (!user) {
                                setShowAuthModal(true);
                            } else {
                                setShowPremiumHub(true);
                            }
                        }}
                        onIntelligenceClick={() => navigate('/intelligence')}
                        onAboutClick={onAboutClick}
                        isLiteMode={isLiteMode}
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
                        lastLoginDate={lastLoginDate}
                        setCoinBalance={setCoinBalance}
                        setStreak={setStreak}
                        setLastLoginDate={setLastLoginDate}
                        settings={settings}
                    />
                ) : (
                    <div className="lg:flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 lg:min-h-0 pb-40 lg:pb-0">

                        {/* Left Column: Controls (Scrollable) */}
                        <div className="lg:col-span-5 lg:h-full glass-panel lg:overflow-hidden flex flex-col relative h-auto">
                            <div className="lg:flex-1 lg:overflow-y-auto custom-scrollbar p-6 lg:p-8 flex flex-col gap-6">
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
                                        isLiteMode={isLiteMode}
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

                                {/* Ad Banner */}
                                <div className="mt-auto">
                                    <AdBanner slotId="1146521123" className="mt-6" />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Results (Scrollable) */}
                        <div
                            ref={resultsRef}
                            className={`lg:col-span-7 lg:h-full glass-panel lg:overflow-hidden flex-col relative flex`}
                        >
                            {results ? (
                                <div className="lg:flex-1 lg:overflow-y-auto custom-scrollbar p-6 lg:p-8">
                                    <ResultsSection
                                        results={results}
                                        onOpenPremium={() => {
                                            if (!user) {
                                                setShowAuthModal(true);
                                            } else {
                                                setShowPremiumHub(true);
                                            }
                                        }}
                                        onOpenEditor={(config) => setShowMediaEditor(config)}
                                        onOpenShare={() => setShowShareModal(true)}
                                        image={image}
                                        user={user}
                                        isLiteMode={isLiteMode}
                                    />
                                </div>
                            ) : (
                                <FeatureShowcase
                                    onSelectTool={onSelectTool}
                                    user={user}
                                    onOpenAuth={() => setShowAuthModal(true)}
                                    onTrendsClick={() => setCurrentView('trending')}
                                />
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default MainContent;

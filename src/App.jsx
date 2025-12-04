import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, Zap } from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import { ResultsSection } from './components/ResultCard';
import OptionsPanel from './components/OptionsPanel';
import SeoWrapper from './components/SeoWrapper';
import HistoryPanel from './components/HistoryPanel';
import AdModal from './components/AdModal';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ProgressPopup from './components/ProgressPopup';
import { analyzeImage } from './utils/aiService';
import PremiumHub from './components/PremiumHub';
import { initializePayment } from './utils/paymentService';

function App() {
  const [image, setImage] = useState(null);
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showPremiumHub, setShowPremiumHub] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
    platform: 'instagram',
    mood: 'best',
    model: import.meta.env.VITE_AI_MODEL || 'llama-3.2-11b-vision-preview',
    length: 'Medium',
    customInstructions: ''
  });
  const [showMoodError, setShowMoodError] = useState(false);

  // Progress State
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('upload');
  const [elapsedTime, setElapsedTime] = useState(0);

  // History State
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('viralvibe-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Coin System State
  const [coinBalance, setCoinBalance] = useState(() => {
    return parseInt(localStorage.getItem('viralvibe-coins') || '100');
  });
  const [totalCoinsSpent, setTotalCoinsSpent] = useState(() => {
    return parseInt(localStorage.getItem('viralvibe-coins-spent') || '0');
  });
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'dashboard'
  const [showAdModal, setShowAdModal] = useState(false);

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('viralvibe-theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('viralvibe-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    localStorage.setItem('viralvibe-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('viralvibe-coins', coinBalance.toString());
  }, [coinBalance]);

  useEffect(() => {
    localStorage.setItem('viralvibe-coins-spent', totalCoinsSpent.toString());
  }, [totalCoinsSpent]);

  useEffect(() => {
    let interval;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleImageSelect = (file, previewUrl) => {
    setImage(file);
    setResults(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!image) return;

    // Validate Mood
    if (!settings.mood) {
      setShowMoodError(true);
      return;
    }
    setShowMoodError(false);

    // Check Coin Balance (Cost: 50 coins)
    if (coinBalance < 50) {
      setShowAdModal(true); // Show ad modal instead of confirm
      return;
    }

    if (!settings.apiKey) {
      setError("Please enter your Groq API Key to proceed.");
      return;
    }

    setIsAnalyzing(true);
    setResults(null);
    setError(null);
    setProgress(0);
    setCurrentStep('upload');

    try {
      // Simulate Upload Step
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(25);
      setCurrentStep('analyze');

      // Simulate Analysis Step (concurrent with actual API call)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      // Actual API Call
      const data = await analyzeImage(image, settings);

      clearInterval(progressInterval);
      setProgress(90);
      setCurrentStep('generate');

      // Simulate Generation Step
      await new Promise(resolve => setTimeout(resolve, 600));
      setProgress(100);
      setCurrentStep('finalize');
      await new Promise(resolve => setTimeout(resolve, 400));

      setResults(data);
      setCoinBalance(prev => prev - 50); // Deduct cost
      setTotalCoinsSpent(prev => prev + 50); // Track total spent

      // Add to history
      const newHistoryItem = {
        id: Date.now(),
        timestamp: Date.now(),
        captions: data.captions,
        hashtags: data.hashtags,
        bestTime: data.bestTime,
        viralPotential: data.viralPotential, // Save viral potential
        platform: settings.platform,
        mood: settings.mood, // Changed from 'tone' to 'mood'
        musicRecommendations: data.musicRecommendations, // Save music recommendations
        roast: data.roast,
        scores: data.scores,
        improvements: data.improvements
      };
      setHistory(prev => [newHistoryItem, ...prev]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setProgress(0); // Reset progress
    }
  };

  const restoreHistoryItem = (item) => {
    setResults({
      captions: item.captions,
      hashtags: item.hashtags,
      bestTime: item.bestTime,
      viralPotential: item.viralPotential,
      musicRecommendations: item.musicRecommendations,
      roast: item.roast,
      scores: item.scores,
      improvements: item.improvements
    });
    setSettings(prev => ({
      ...prev,
      platform: item.platform,
      mood: item.mood || item.tone // Handle backward compatibility
    }));
    setIsHistoryOpen(false);
  };

  const deleteHistoryItem = (id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleAdComplete = () => {
    setCoinBalance(prev => prev + 35); // Reward
    setShowAdModal(false);
    alert("You earned 35 coins!");
  };

  const handlePurchase = (coins, price) => {
    initializePayment(
      price,
      (response) => {
        setCoinBalance(prev => prev + coins);
        setTotalCoinsSpent(prev => prev + coins); // Optional: track purchased coins separately if needed, but for now just adding to balance
        alert(`Payment Successful! ${coins} coins added to your wallet.`);
      },
      (error) => {
        alert(`Payment Failed: ${error.description}`);
      }
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-primary selection:bg-indigo-500/30">
      <SeoWrapper />

      {/* Liquid Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--blob-1)] opacity-20 blur-[100px] animate-blob"></div>
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--blob-2)] opacity-20 blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-[var(--blob-3)] opacity-20 blur-[100px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <AdModal
        isOpen={showAdModal}
        onAdComplete={handleAdComplete}
      />

      <PremiumHub
        isOpen={showPremiumHub}
        onClose={() => setShowPremiumHub(false)}
        settings={settings}
        image={image}
        coinBalance={coinBalance}
        setCoinBalance={setCoinBalance}
        onOpenAdModal={() => setShowAdModal(true)}
      />

      <ProgressPopup
        isVisible={isAnalyzing}
        progress={progress}
        currentStep={currentStep}
        elapsedTime={elapsedTime}
      />

      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={restoreHistoryItem}
        onDelete={deleteHistoryItem}
      />

      {/* Main Layout */}
      <div className="max-w-[1600px] mx-auto p-4 lg:p-8 h-screen flex flex-col">

        {/* Header */}
        <header className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="text-white" size={20} fill="currentColor" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">GoVyral</h1>
          </div>

          <Navbar
            onHistoryClick={() => setIsHistoryOpen(true)}
            coinBalance={coinBalance}
            onCoinsClick={() => setCurrentView('dashboard')}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        </header>

        {currentView === 'dashboard' ? (
          <Dashboard
            balance={coinBalance}
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
                      <span className="text-xs bg-black/10 px-2 py-0.5 rounded-full font-medium">-50</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Results (Scrollable) */}
            <div className={`lg:col-span-7 h-full min-h-[500px] glass-panel overflow-hidden flex-col relative ${results ? 'flex' : 'hidden lg:flex'}`}>
              {results ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
                  <ResultsSection
                    results={results}
                    onOpenPremium={() => setShowPremiumHub(true)}
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
}

export default App;

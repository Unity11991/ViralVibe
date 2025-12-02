import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, History, Coins } from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import { ResultsSection } from './components/ResultCard';
import OptionsPanel from './components/OptionsPanel';
import SeoWrapper from './components/SeoWrapper';
import HistoryPanel from './components/HistoryPanel';
import ProModal from './components/ProModal';
import AdModal from './components/AdModal';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ProgressPopup from './components/ProgressPopup';
import { analyzeImage } from './utils/aiService';

const THEMES = [
  { id: 'midnight', label: 'Midnight', primaryGradient: 'from-purple-400 to-blue-400' },
  { id: 'sunset', label: 'Sunset', primaryGradient: 'from-orange-400 to-pink-500' },
  { id: 'cyberpunk', label: 'Cyberpunk', primaryGradient: 'from-green-400 to-blue-500' },
  { id: 'genie', label: 'Genie', primaryGradient: 'from-cyan-400 to-purple-400' },
  { id: 'monster', label: 'Monster', primaryGradient: 'from-teal-400 to-lime-400' },
];

function App() {
  const [image, setImage] = useState(null);
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Settings State
  const [settings, setSettings] = useState({
    apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
    platform: 'instagram',
    mood: '',
    model: import.meta.env.VITE_AI_MODEL || 'llama-3.2-11b-vision-preview',
    length: 'Medium',
    customInstructions: ''
  });
  const [showMoodError, setShowMoodError] = useState(false);

  // Progress State
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('upload');
  const [elapsedTime, setElapsedTime] = useState(0);

  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('viralvibe-theme') || 'midnight');
  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0];

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('viralvibe-theme', theme);
  }, [theme]);

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
      // Scroll to options panel
      const optionsPanel = document.querySelector('.glass-panel');
      if (optionsPanel) optionsPanel.scrollIntoView({ behavior: 'smooth' });
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
        mood: settings.mood // Changed from 'tone' to 'mood'
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
      viralPotential: item.viralPotential
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
    if (confirm(`Confirm purchase of ${coins} coins for ₹${price}?`)) {
      setCoinBalance(prev => prev + coins);
      alert("Purchase successful! Coins added.");
    }
  };

  if (currentView === 'dashboard') {
    return (
      <Dashboard
        balance={coinBalance}
        history={history}
        totalCoinsSpent={totalCoinsSpent}
        onBack={() => setCurrentView('home')}
        onWatchAd={() => setShowAdModal(true)}
        onPurchase={handlePurchase}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 pt-32">
      <SeoWrapper />
      <AdModal
        isOpen={showAdModal}
        onAdComplete={handleAdComplete}
      />

      <ProgressPopup
        isVisible={isAnalyzing}
        progress={progress}
        currentStep={currentStep}
        elapsedTime={elapsedTime}
      />

      <Navbar
        currentTheme={theme}
        onThemeChange={setTheme}
        onHistoryClick={() => setIsHistoryOpen(true)}
        coinBalance={coinBalance}
        onCoinsClick={() => setCurrentView('dashboard')}
      />

      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={restoreHistoryItem}
        onDelete={deleteHistoryItem}
      />

      <header className="mb-12 text-center space-y-4 animate-fade-in">
        <h1 className="text-5xl font-bold tracking-tight text-white mb-2">
          Viral<span className="text-gradient">Vibe</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-lg mx-auto">
          Upload your photo and let AI generate the perfect caption, viral hashtags, and posting schedule.
        </p>
      </header>

      <main className="w-full max-w-2xl mx-auto space-y-8">
        <OptionsPanel
          settings={settings}
          onSettingsChange={setSettings}
          showMoodError={showMoodError}
        />

        <ImageUploader
          onImageSelect={handleImageSelect}
          isAnalyzing={isAnalyzing}
        />

        {error && (
          <div className="glass-panel p-4 border-red-500/50 bg-red-500/10 flex items-center gap-3 text-red-200 animate-fade-in">
            <AlertCircle className="text-red-500" />
            {error}
          </div>
        )}

        {image && !results && !isAnalyzing && (
          <div className="flex flex-col items-center animate-fade-in">
            <button
              onClick={handleAnalyze}
              className="btn-primary flex items-center gap-2 text-lg px-8 py-4 shadow-lg shadow-purple-500/20"
            >
              <Sparkles size={20} />
              Generate Magic <span className="text-sm opacity-80 bg-black/20 px-2 py-0.5 rounded-full ml-1">-50 🪙</span>
            </button>
            <p className="text-sm text-slate-400 mt-3 font-medium">
              Balance: {coinBalance} coins
            </p>
          </div>
        )}

        <ResultsSection results={results} />
      </main>

      <footer className="mt-20 text-slate-500 text-sm">
        <p>© 2025 ViralVibe AI. Crafted for creators.</p>
      </footer>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, Zap } from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import { ResultsSection } from './components/ResultCard';
import OptionsPanel from './components/OptionsPanel';
import SeoWrapper from './components/SeoWrapper';
import HistoryPanel from './components/HistoryPanel';

import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ProgressPopup from './components/ProgressPopup';
import { analyzeImage, aggregateVideoInsights } from './utils/aiService';
import { extractFramesFromVideo } from './utils/videoUtils';
import PremiumHub from './components/PremiumHub';
import { initializePayment } from './utils/paymentService';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import MediaEditor from './components/MediaEditor';
import VibeBattle from './components/VibeBattle';
import { supabase } from './lib/supabase';
import ShareModal from './components/ShareModal';
import LimitReachedModal from './components/LimitReachedModal';

import ToolsModal from './components/ToolsModal';
import MainContent from './components/MainContent';
import ReferralHandler from './components/ReferralHandler';

import { Routes, Route, useLocation } from 'react-router-dom';
import PrivacyPolicy from './pages/policies/PrivacyPolicy';
import TermsAndConditions from './pages/policies/TermsAndConditions';
import RefundPolicy from './pages/policies/RefundPolicy';
import ShippingPolicy from './pages/policies/ShippingPolicy';
import ContactUs from './pages/policies/ContactUs';
import Footer from './components/Footer';

function App() {
  const location = useLocation();
  const isPolicyPage = location.pathname.includes('/privacy') ||
    location.pathname.includes('/terms') ||
    location.pathname.includes('/refund-policy') ||
    location.pathname.includes('/shipping-policy') ||
    location.pathname.includes('/contact');

  const [image, setImage] = useState(null);
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showPremiumHub, setShowPremiumHub] = useState(false);
  const [isPro, setIsPro] = useState(false); // DEV: Default to true
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMediaEditor, setShowMediaEditor] = useState(false);
  const [mediaEditorConfig, setMediaEditorConfig] = useState({ file: null, text: '' });
  const [showVibeBattle, setShowVibeBattle] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const handleToolSelect = (toolId) => {
    setShowToolsModal(false);
    if (toolId === 'video-editor') {
      setMediaEditorConfig({ file: image, text: '' });
      setShowMediaEditor(true);
    } else if (toolId === 'vibe-battle') {
      setShowVibeBattle(true);
    }
  };

  const { user } = useAuth();

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
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Coin System State
  const [coinBalance, setCoinBalance] = useState(100);
  const [streak, setStreak] = useState(0);
  const [lastLoginDate, setLastLoginDate] = useState(null);
  const [totalCoinsSpent, setTotalCoinsSpent] = useState(0);
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'dashboard'


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

  // Fetch Data from Supabase
  useEffect(() => {
    if (!user) {
      setCoinBalance(100);
      setHistory([]);
      setCurrentView('home');
      return;
    }

    const fetchData = async () => {
      // Fetch Profile (Coins)
      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance,streak_count,subscription_tier,last_login_date')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCoinBalance(profile.coin_balance);
        setStreak(profile.streak_count || 0);
        setLastLoginDate(profile.last_login_date);
        // Check if user has any active subscription plan
        // setIsPro(!!profile.subscription_tier && profile.subscription_tier !== 'free');
        setIsPro(false); // DEV: Force Pro for testing
      }

      // Fetch History
      const { data: historyData } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (historyData) {
        setHistory(historyData);
      }
    };

    fetchData();
  }, [user]);

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
    setMediaEditorConfig({ file: file, text: '' });
    setResults(null);
    setError(null);
  };

  const [guestUsageCount, setGuestUsageCount] = useState(0);
  const [userIP, setUserIP] = useState(null);

  // Fetch IP and Guest Usage
  useEffect(() => {
    const fetchGuestInfo = async () => {
      try {
        // 1. Get IP
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        const ip = ipData.ip;
        setUserIP(ip);

        // 2. Check Supabase
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('guest_usage')
          .select('count')
          .eq('ip_address', ip)
          .eq('usage_date', today)
          .maybeSingle();

        if (data) {
          setGuestUsageCount(data.count);
        } else {
          setGuestUsageCount(0);
        }
      } catch (error) {
        console.error("Error fetching guest info:", error);
      }
    };

    if (!user) {
      fetchGuestInfo();
    }
  }, [user]);

  const handleAnalyze = async () => {
    // Guest Limit Check
    if (!user) {
      if (!userIP) {
        setError("Unable to verify guest status. Please disable adblockers or try again.");
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Re-check limit from DB to prevent race conditions/manipulation
      const { data: currentUsage } = await supabase
        .from('guest_usage')
        .select('count')
        .eq('ip_address', userIP)
        .eq('usage_date', today)
        .maybeSingle();

      const currentCount = currentUsage ? currentUsage.count : 0;

      if (currentCount >= 3) {
        setShowLimitModal(true);
        return;
      }
    }

    if (!image) return;

    // Validate Mood
    if (!settings.mood) {
      setShowMoodError(true);
      return;
    }
    setShowMoodError(false);

    const isVideo = image.type.startsWith('video/');
    const cost = isVideo ? 100 : 50;

    // Check Coin Balance - Only for logged in users
    if (user && coinBalance < cost) {
      setCurrentView('dashboard'); // Redirect to dashboard to buy coins
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
      setProgress(10);
      setCurrentStep('analyze');

      let data;

      if (isVideo) {
        // --- VIDEO ANALYSIS FLOW ---
        setProgress(20);

        // 1. Extract Frames
        const frames = await extractFramesFromVideo(image, 3); // Extract 3 frames
        setProgress(40);

        // 2. Analyze Each Frame
        const frameResults = [];
        for (let i = 0; i < frames.length; i++) {
          // Update progress to show which frame is being analyzed
          const frameProgress = 40 + ((i / frames.length) * 40); // 40% to 80%
          setProgress(frameProgress);

          const frameResult = await analyzeImage(frames[i], settings);
          frameResults.push(frameResult);
        }

        // 3. Aggregate Results
        setProgress(90);
        data = aggregateVideoInsights(frameResults);

      } else {
        // --- IMAGE ANALYSIS FLOW ---

        // Simulate Analysis Step (concurrent with actual API call)
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 10;
          });
        }, 500);

        // Actual API Call
        data = await analyzeImage(image, settings);
        clearInterval(progressInterval);
      }

      setProgress(95);
      setCurrentStep('generate');

      // Simulate Generation Step
      await new Promise(resolve => setTimeout(resolve, 600));
      setProgress(100);
      setCurrentStep('finalize');
      await new Promise(resolve => setTimeout(resolve, 400));

      setResults(data);

      if (user) {
        // Update Coins in DB
        const newBalance = coinBalance - cost;
        setCoinBalance(newBalance);
        setTotalCoinsSpent(prev => prev + cost);

        await supabase
          .from('profiles')
          .update({ coin_balance: newBalance })
          .eq('id', user.id);

        // Add to history in DB
        const newHistoryItem = {
          user_id: user.id,
          captions: data.captions,
          hashtags: data.hashtags,
          best_time: data.bestTime,
          viral_potential: data.viralPotential,
          platform: settings.platform,
          mood: settings.mood,
          music_recommendations: data.musicRecommendations,
          roast: data.roast,
          scores: data.scores,
          improvements: data.improvements
        };

        const { data: savedItem, error: historyError } = await supabase
          .from('history')
          .insert([newHistoryItem])
          .select()
          .single();

        if (!historyError && savedItem) {
          setHistory(prev => [savedItem, ...prev]);
        }
      } else {
        // Increment Guest Usage in DB
        const today = new Date().toISOString().split('T')[0];

        // Upsert logic: Try to insert, if conflict (already exists), update count
        const { data: existingRow } = await supabase
          .from('guest_usage')
          .select('*')
          .eq('ip_address', userIP)
          .eq('usage_date', today)
          .maybeSingle();

        let newCount = 1;
        if (existingRow) {
          newCount = existingRow.count + 1;
          await supabase
            .from('guest_usage')
            .update({ count: newCount })
            .eq('ip_address', userIP)
            .eq('usage_date', today);
        } else {
          await supabase
            .from('guest_usage')
            .insert([{ ip_address: userIP, usage_date: today, count: 1 }]);
        }

        setGuestUsageCount(newCount);
      }

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
      bestTime: item.best_time,
      viralPotential: item.viral_potential,
      musicRecommendations: item.music_recommendations,
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

  const deleteHistoryItem = async (id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    await supabase.from('history').delete().eq('id', id);
  };

  const handleAdComplete = async () => {
    const reward = 35;
    const newBalance = coinBalance + reward;
    setCoinBalance(newBalance);
    setShowAdModal(false);
    alert(`You earned ${reward} coins!`);

    if (user) {
      await supabase
        .from('profiles')
        .update({ coin_balance: newBalance })
        .eq('id', user.id);
    }
  };

  const handleSpendCoins = async (amount) => {
    if (coinBalance < amount) {
      setShowAdModal(true);
      return false;
    }

    const newBalance = coinBalance - amount;
    setCoinBalance(newBalance);
    setTotalCoinsSpent(prev => prev + amount);

    if (user) {
      await supabase
        .from('profiles')
        .update({ coin_balance: newBalance })
        .eq('id', user.id);
    }
    return true;
  };

  const handlePurchase = (coins, price) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const userDetails = {
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || "GoVyral User",
      email: user.email,
      contact: user.phone || "" // Assuming phone might be available
    };

    initializePayment(
      price,
      userDetails,
      async (response) => {
        const newBalance = coinBalance + coins;
        setCoinBalance(newBalance);
        setTotalCoinsSpent(prev => prev + coins);
        alert(`Payment Successful! ${coins} coins added to your wallet.`);

        if (user) {
          await supabase
            .from('profiles')
            .update({ coin_balance: newBalance })
            .eq('id', user.id);

          // Optional: Record transaction
          await supabase.from('transactions').insert([{
            user_id: user.id,
            amount: coins,
            description: `Purchased ${coins} coins`,
            payment_id: response.razorpay_payment_id
          }]);
        }
      },
      (error) => {
        alert(`Payment Failed: ${error.description}`);
      }
    );
  };



  return (
    <div className="min-h-screen relative font-sans text-primary selection:bg-indigo-500/30">
      <SeoWrapper />

      {/* Liquid Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--blob-1)] opacity-20 blur-[100px] animate-blob"></div>
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--blob-2)] opacity-20 blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-[var(--blob-3)] opacity-20 blur-[100px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>



      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      <ToolsModal
        isOpen={showToolsModal}
        onClose={() => setShowToolsModal(false)}
        onSelectTool={handleToolSelect}
      />

      {showMediaEditor && (
        <MediaEditor
          mediaFile={mediaEditorConfig.file || image}
          initialText={mediaEditorConfig.text}
          onClose={() => setShowMediaEditor(false)}
          isPro={isPro}
        />
      )}

      {showVibeBattle && (
        <VibeBattle
          onClose={() => setShowVibeBattle(false)}
          settings={settings}
        />
      )}

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        results={results}
        image={image}
      />

      <LimitReachedModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onLogin={() => setShowAuthModal(true)}
      />

      <PremiumHub
        isOpen={showPremiumHub}
        onClose={() => setShowPremiumHub(false)}
        settings={settings}
        image={image}
        coinBalance={coinBalance}
        isPro={isPro}
        onSpendCoins={handleSpendCoins}

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

      <Routes>
        <Route path="/" element={
          <MainContent
            currentView={currentView}
            setCurrentView={setCurrentView}
            coinBalance={coinBalance}
            streak={streak}
            lastLoginDate={lastLoginDate}
            setCoinBalance={setCoinBalance}
            setStreak={setStreak}
            setLastLoginDate={setLastLoginDate}
            history={history}
            totalCoinsSpent={totalCoinsSpent}

            handlePurchase={handlePurchase}
            isAnalyzing={isAnalyzing}
            image={image}
            handleImageSelect={handleImageSelect}
            setShowMediaEditor={(config) => {
              if (config && config.text) {
                setMediaEditorConfig(prev => ({ ...prev, text: config.text }));
              }
              setShowMediaEditor(true);
            }}
            settings={settings}
            setSettings={setSettings}
            showMoodError={showMoodError}
            error={error}
            handleAnalyze={handleAnalyze}
            results={results}
            user={user}
            setShowAuthModal={setShowAuthModal}
            setShowPremiumHub={setShowPremiumHub}
            setIsHistoryOpen={setIsHistoryOpen}
            theme={theme}
            toggleTheme={toggleTheme}
            setShowProfileModal={setShowProfileModal}
            guestUsageCount={guestUsageCount}
            setShowToolsModal={setShowToolsModal}
            setShowShareModal={setShowShareModal}

          />
        } />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/shipping-policy" element={<ShippingPolicy />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/referral/:code" element={<ReferralHandler />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;

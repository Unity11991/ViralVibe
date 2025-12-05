
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) {
                checkLoginStreak(session.user.id);
            }
            setLoading(false);
        };

        getSession();

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user && _event === 'SIGNED_IN') {
                checkLoginStreak(session.user.id);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkLoginStreak = async (userId) => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Fetch current profile data
            const { data: profile } = await supabase
                .from('profiles')
                .select('last_login_date, streak_count, coin_balance')
                .eq('id', userId)
                .single();

            if (!profile) return;

            const lastLogin = profile.last_login_date;
            let newStreak = profile.streak_count || 0;
            let coinsToAdd = 0;

            if (lastLogin === today) {
                // Already logged in today, do nothing
                return;
            }

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastLogin === yesterdayStr) {
                // Consecutive login
                newStreak += 1;
                coinsToAdd = 10 * newStreak; // Reward: 10 coins per streak day
            } else {
                // Streak broken (or first login)
                newStreak = 1;
                coinsToAdd = 10;
            }

            // Update profile
            await supabase
                .from('profiles')
                .update({
                    last_login_date: today,
                    streak_count: newStreak,
                    coin_balance: (profile.coin_balance || 0) + coinsToAdd
                })
                .eq('id', userId);

            if (coinsToAdd > 0) {
                // Ideally show a toast/notification here, but context shouldn't handle UI.
                // We can store this in a state or local storage to show a popup on Dashboard.
                localStorage.setItem('dailyReward', JSON.stringify({ coins: coinsToAdd, streak: newStreak }));
            }

        } catch (error) {
            console.error("Error checking login streak:", error);
        }
    };

    const value = {
        signUp: (data) => supabase.auth.signUp({
            ...data,
            options: {
                emailRedirectTo: window.location.origin
            }
        }),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signInWithGoogle: () => supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        }),
        signOut: () => supabase.auth.signOut(),
        user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

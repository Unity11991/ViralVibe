
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoading(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const claimDailyReward = async (userId) => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Fetch current profile data
            const { data: profile } = await supabase
                .from('profiles')
                .select('last_login_date,streak_count,coin_balance')
                .eq('id', userId)
                .single();

            if (!profile) return { success: false, message: "Profile not found" };

            const lastLogin = profile.last_login_date;
            let newStreak = profile.streak_count || 0;
            let coinsToAdd = 0;

            if (lastLogin === today) {
                return { success: false, message: "Already claimed today" };
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

            // Cap streak bonus if needed (optional, e.g., max 100 coins)
            if (coinsToAdd > 100) coinsToAdd = 100;

            // Update profile
            const { error } = await supabase
                .from('profiles')
                .update({
                    last_login_date: today,
                    streak_count: newStreak,
                    coin_balance: (profile.coin_balance || 0) + coinsToAdd
                })
                .eq('id', userId);

            if (error) throw error;

            return { success: true, coins: coinsToAdd, streak: newStreak };

        } catch (error) {
            console.error("Error claiming daily reward:", error);
            return { success: false, message: error.message };
        }
    };

    const value = {
        claimDailyReward,
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
        signOut: async () => {
            try {
                await supabase.auth.signOut();
            } catch (error) {
                console.error("Error signing out:", error);
            } finally {
                setUser(null);
                // Clear all Supabase related items from localStorage
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') || key.includes('supabase')) {
                        localStorage.removeItem(key);
                    }
                });
                window.location.href = '/';
            }
        },
        user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

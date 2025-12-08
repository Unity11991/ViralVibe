import { supabase } from '../lib/supabase';

export const schedulePost = async (postData) => {
    const { data, error } = await supabase
        .from('scheduled_posts')
        .insert([postData])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getScheduledPosts = async () => {
    const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data;
};

// Simulation function to "publish" pending posts
export const runSchedulerSimulation = async () => {
    // 1. Fetch pending posts past their due date
    const now = new Date().toISOString();
    const { data: pendingPosts, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', now);

    if (fetchError) throw fetchError;

    if (!pendingPosts || pendingPosts.length === 0) {
        return { published: 0, message: "No pending posts to publish." };
    }

    // 2. "Publish" them (update status)
    const updates = pendingPosts.map(async (post) => {
        // Here we would call the real API
        console.log(`Publishing post ${post.id} to ${post.platform}...`);

        const { error: updateError } = await supabase
            .from('scheduled_posts')
            .update({ status: 'published' })
            .eq('id', post.id);

        if (updateError) throw updateError;
        return post.id;
    });

    await Promise.all(updates);
    return { published: pendingPosts.length, message: `Successfully published ${pendingPosts.length} posts.` };
};

// Call the real deployed Edge Function
export const runEdgeFunctionScheduler = async () => {
    const { data, error } = await supabase.functions.invoke('publish-posts');
    if (error) throw error;
    return data;
};

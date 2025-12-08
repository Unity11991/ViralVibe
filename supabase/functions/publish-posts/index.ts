import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create a Supabase client with Admin context (Service Role)
        // This allows us to bypass RLS and access all users' scheduled posts
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Fetch pending posts past their due date
        const now = new Date().toISOString()
        console.log(`[Scheduler] Checking for posts scheduled before: ${now}`)

        const { data: pendingPosts, error: fetchError } = await supabaseClient
            .from('scheduled_posts')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_at', now)

        if (fetchError) {
            console.error('[Scheduler] Error fetching posts:', fetchError)
            throw fetchError
        }

        console.log(`[Scheduler] Found ${pendingPosts?.length || 0} posts due for publishing.`)

        if (!pendingPosts || pendingPosts.length === 0) {
            // Debug: Check if there are ANY pending posts (even in future)
            const { count } = await supabaseClient
                .from('scheduled_posts')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')

            console.log(`[Scheduler] Total pending posts in DB (including future): ${count}`)

            return new Response(
                JSON.stringify({ message: 'No pending posts due for publishing.', serverTime: now, totalPending: count }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. "Publish" them (update status)
        const results = []
        for (const post of pendingPosts) {
            console.log(`Processing post ${post.id} for ${post.platform}...`)

            try {
                // 1. Get the user's access token
                const { data: account, error: accountError } = await supabaseClient
                    .from('connected_accounts')
                    .select('*')
                    .eq('user_id', post.user_id)
                    .eq('platform', post.platform) // 'instagram'
                    .single()

                if (accountError || !account) {
                    console.error(`User ${post.user_id} has not connected ${post.platform}`)
                    // Mark as failed so we don't retry forever
                    await supabaseClient.from('scheduled_posts').update({ status: 'failed' }).eq('id', post.id)
                    results.push({ id: post.id, status: 'failed', error: 'No connected account' })
                    continue
                }

                // 2. Create the Media Container (Step 1 of Instagram API)
                console.log(`Creating media container for ${post.id}...`)
                const createMediaResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${account.account_id}/media`,
                    {
                        method: 'POST',
                        body: new URLSearchParams({
                            image_url: post.media_url, // Must be a public URL
                            caption: post.content,
                            access_token: account.access_token
                        })
                    }
                )
                const mediaData = await createMediaResponse.json()
                console.log('Media Creation Response:', mediaData)

                if (mediaData.error) {
                    throw new Error(`Creation failed: ${mediaData.error.message}`)
                }

                if (!mediaData.id) {
                    throw new Error('Creation failed: No Media ID returned')
                }

                // WAIT: Give Instagram a moment to process the image
                console.log('Waiting 5 seconds for media processing...')
                await new Promise(resolve => setTimeout(resolve, 5000))

                // 3. Publish the Media Container (Step 2 of Instagram API)
                console.log(`Publishing media ${mediaData.id}...`)
                const publishResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${account.account_id}/media_publish`,
                    {
                        method: 'POST',
                        body: new URLSearchParams({
                            creation_id: mediaData.id,
                            access_token: account.access_token
                        })
                    }
                )
                const publishData = await publishResponse.json()
                console.log('Publish Response:', publishData)

                if (publishData.error) {
                    throw new Error(`Publishing failed: ${publishData.error.message}`)
                }

                // 4. Update Database Status
                const { error: updateError } = await supabaseClient
                    .from('scheduled_posts')
                    .update({ status: 'published' })
                    .eq('id', post.id)

                if (updateError) {
                    console.error(`Failed to update post ${post.id}:`, updateError)
                    results.push({ id: post.id, status: 'failed', error: updateError })
                } else {
                    console.log(`Successfully published post ${post.id}`)
                    results.push({ id: post.id, status: 'published', platform_id: publishData.id })
                }

            } catch (err) {
                console.error(`Failed to publish post ${post.id}:`, err)
                await supabaseClient.from('scheduled_posts').update({ status: 'failed' }).eq('id', post.id)
                results.push({ id: post.id, status: 'failed', error: (err as Error).message })
            }
        }

        return new Response(
            JSON.stringify({ message: `Processed ${results.length} posts`, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

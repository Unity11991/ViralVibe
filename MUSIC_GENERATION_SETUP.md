# AI Music Generation Setup Guide

This guide will help you configure the AI Music Generation feature in Audio Studio.

## Prerequisites

1. **Free Hugging Face Account**
   - Visit [huggingface.co](https://huggingface.co) and create a free account
   - No credit card required

2. **Supabase Project**
   - You should already have Supabase configured for this project

## Setup Steps

### 1. Get Your Hugging Face API Token

1. Log in to your Hugging Face account
2. Navigate to [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. Click "New token"
4. Give it a name (e.g., "ViralVibe Music Gen")
5. Select "Read" access (this is sufficient for generation)
6. Click "Generate token"
7. **Copy the token** (you won't be able to see it again!)

### 2. Deploy the Supabase Edge Function

The music generation uses a Supabase Edge Function to bypass CORS restrictions. Deploy it with:

```bash
# Navigate to your project directory
cd e:\Projects\ViralVibe-main\ViralVibe-main

# Deploy the generate-music function
npx supabase functions deploy generate-music

# Set the Hugging Face API key as a secret
npx supabase secrets set HUGGINGFACE_API_KEY=hf_YourActualTokenHere
```

**Important**: Replace `hf_YourActualTokenHere` with your actual Hugging Face token.

### 3. Verify Deployment

Check that the function is deployed:

```bash
npx supabase functions list
```

You should see `generate-music` in the list.

### 4. Restart Your Development Server

If your dev server is running, restart it to pick up any changes:

```bash
npm run dev
```

## Using the Feature

1. **Open Audio Studio** from your application
2. Find the **"AI Music Generator"** section in the sidebar
3. **Enter a prompt** describing the music you want:
   - Examples: "upbeat electronic dance music", "calm acoustic guitar", "epic orchestral soundtrack"
   - Click the wand icon (✨) for random suggestions
4. **Select duration**: Choose 5s, 10s, 15s, or 30s
5. **Click "Generate Music"**
   - Generation takes 10-30 seconds (be patient!)
   - Progress updates will show in the UI
6. **Play your music**: Once generated, the audio will automatically load into the player
   - Use all audio studio features: volume control, effects, visualization, etc.

## How It Works

```
Browser → Supabase Edge Function → Hugging Face API → Generated Music
```

1. Your browser calls the Supabase Edge Function (no CORS issues!)
2. The Edge Function calls the Hugging Face API server-side
3. Generated audio is returned to your browser
4. Audio plays in the Audio Studio

## Troubleshooting

### "Failed to generate music" Error
- Verify the Edge Function is deployed: `npx supabase functions list`
- Check that the secret is set: `npx supabase secrets list`
- Look at function logs: `npx supabase functions logs generate-music`

### "Model is loading" Error
- The AI model needs to load on Hugging Face servers (first request or after inactivity)
- Wait 1-2 minutes and try again
- This is normal for free tier usage

### "Rate limit exceeded" Error
- Free tier has limits on requests per minute
- Wait a few minutes before trying again
- Consider shorter durations (5s or 10s) for faster generation

### Generation Takes Too Long
- Free tier servers may be busy
- Try during off-peak hours
- Start with shorter durations (5-10s) for testing

### Checking Function Logs

If you're getting errors, check the Edge Function logs:

```bash
npx supabase functions logs generate-music --tail
```

This will show real-time logs to help debug issues.

## Tips for Best Results

1. **Be specific in prompts**: "upbeat electronic dance music with drums and synth" works better than "music"
2. **Start small**: Test with 5-10 second durations first
3. **Use suggestions**: Click the wand icon for inspiration
4. **Experiment**: Try different genres, moods, and instruments
5. **Be patient**: First-time generation may take longer as the model loads

## Environment Variables Summary

You only need to set ONE secret in Super the Edge Function:

```bash
HUGGINGFACE_API_KEY=hf_your_token_here
```

Note: You do NOT need `VITE_HUGGINGFACE_API_KEY` in your `.env` file anymore, as the API key is now stored securely in Supabase secrets.

## Advanced: Local Development

If you want to test the Edge Function locally:

```bash
# Start Supabase locally
npx supabase start

# Serve the function locally
npx supabase functions serve generate-music --env-file supabase/.env.local

# Create supabase/.env.local with:
HUGGINGFACE_API_KEY=hf_your_token_here
```

Then update your code to use the local function URL during development.

## Support

If you encounter issues:
1. Check the browser console for client-side errors
2. Check the Edge Function logs: `npx supabase functions logs generate-music`
3. Verify your Hugging Face token is valid
4. Ensure you have internet connectivity
5. Try a different prompt or shorter duration

Enjoy creating AI-generated music! 🎵✨

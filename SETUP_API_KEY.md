# 🎵 Final Step: Set Your Hugging Face API Key

The Edge Function is deployed! Now you just need to add your Hugging Face API token.

## Step 1: Get Your Hugging Face Token

1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name it "ViralVibe Music Gen"
4. Select "Read" access
5. Click "Generate token"
6. **COPY THE TOKEN** (starts with `hf_`)

## Step 2: Set the Secret

Run this command (replace with your actual token):

```bash
npx supabase secrets set HUGGINGFACE_API_KEY=hf_YourActualTokenHere
```

**Example:**
```bash
npx supabase secrets set HUGGINGFACE_API_KEY=hf_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

## Step 3: Test It!

1. Open your app (already running on http://localhost:5174)
2. Go to Audio Studio
3. Scroll to "AI Music Generator"
4. Try a prompt like "upbeat electronic dance music"
5. Select 10s duration
6. Click "Generate Music"

It should work now! 🎉

---

## Verify Deployment

You can check if everything is set up correctly:

```bash
# List deployed functions
npx supabase functions list

# Check secrets (will show names, not values)
npx supabase secrets list

# View function logs in real-time
npx supabase functions logs generate-music --tail
```

## Troubleshooting

If you still get errors after setting the secret:
1. Make sure you copied the entire token (including `hf_` prefix)
2. Check the function logs: `npx supabase functions logs generate-music`
3. Try generating a shorter audio (5s) first
4. Wait a minute for the model to load on first request

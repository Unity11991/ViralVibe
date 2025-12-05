# How to Deploy ViralVibe to Vercel

## Prerequisites
- A [Vercel Account](https://vercel.com/signup).
- A [Groq API Key](https://console.groq.com/).

## Option 1: Deploy via Vercel Dashboard (Recommended)

1.  **Push to GitHub**: Ensure your project is pushed to a GitHub repository.
2.  **Import Project**:
    - Go to your [Vercel Dashboard](https://vercel.com/dashboard).
    - Click **"Add New..."** -> **"Project"**.
    - Select your `viralvibe` repository and click **Import**.
3.  **Configure Project**:
    - **Framework Preset**: Vercel should auto-detect `Vite`.
    - **Root Directory**: `./` (default).
4.  **Environment Variables**:
    - Expand the **"Environment Variables"** section.
    - Add the following keys:
        - `VITE_GROQ_API_KEY`: Your actual Groq API Key.
        - `VITE_AI_MODEL`: `llama-3.2-11b-vision-preview` (or your preferred model).
5.  **Deploy**:
    - Click **Deploy**.
    - Wait for the build to complete (approx. 1 minute).

## Option 2: Deploy via CLI

1.  Install Vercel CLI: `npm i -g vercel`
2.  Login: `vercel login`
3.  Deploy: Run `vercel` in the project root.
4.  Follow the prompts.
5.  Set Environment Variables:
    - Go to the project settings URL provided in the output.
    - Add `VITE_GROQ_API_KEY` and `VITE_AI_MODEL`.
    - Redeploy if necessary: `vercel --prod`

## Troubleshooting

- **404 on Refresh**: If you get 404 errors when refreshing pages, ensure `vercel.json` exists in the root directory with the rewrite rules.
- **API Errors**: Check that your Environment Variables are set correctly in the Vercel Project Settings.

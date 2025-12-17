# Generate Music - Supabase Edge Function

This Edge Function proxies requests to Hugging Face's MusicGen API to avoid CORS issues when calling from the browser.

## Deployment

Deploy this function to Supabase:

```bash
# From the project root directory
supabase functions deploy generate-music
```

## Usage

The function accepts POST requests with the following body:

```json
{
  "prompt": "upbeat electronic dance music",
  "duration": 15
}
```

- `prompt` (required): Text description of the music to generate
- `duration` (optional): Duration in seconds (5-30, default: 15)

## Response

Returns audio blob (WAV format) on success, or error JSON on failure.

## Error Handling

- If the model is loading (503), returns JSON with loading status
- Other errors return appropriate error messages

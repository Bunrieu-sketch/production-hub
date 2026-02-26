# YouTube OAuth Credentials

**Last updated:** 2026-02-26
**Authorized by:** andrew@fraser.vn
**App status:** Production (tokens don't expire)

## OAuth Client

- **Client ID:** `272186185919-ch9gv0aiibltlnqfgg0fkculo9s87pd4.apps.googleusercontent.com`
- **Client Secret:** `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`
- **Project:** `gen-lang-client-0236332773` (montyyt)
- **Console:** https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0236332773
- **Type:** Web application
- **Redirect URI:** `http://localhost:3000/callback`

## Refresh Token

```
1//0gdican_b2-l-CgYIARAAGBASNwF-L9IrLIc451Sx4EovKi3dxbLewpIXXDmtwQXhikaHwJohyURLBPXSb1yaSLLpx8LiyBDEwrQ
```

## Scopes Authorized

- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/yt-analytics.readonly`

## Where This Token Is Used

1. **Production Hub `.env.local`** — `/Users/montymac/.openclaw/workspace/production-hub/.env.local`
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`
   - `YOUTUBE_REFRESH_TOKEN`

2. **Launchd plist** — `~/Library/LaunchAgents/ai.andrewfraser.dashboard.mission-control.plist`
   - Same three env vars baked into the plist EnvironmentVariables dict
   - ⚠️ Must update BOTH files if token changes, then restart: `launchctl kickstart -k gui/$(id -u)/ai.andrewfraser.dashboard.mission-control`

3. **YouTube View Sync cron** (agent: max) — job `ca0c191e-d2dc-4699-a637-5f53f0d9a3c0`
   - Uses the same API route (POST /api/youtube/analytics) which reads from process.env

## If Auth Breaks Again

1. Check if the refresh token still works: `curl -s https://oauth2.googleapis.com/token -d "client_id=272186185919-ch9gv0aiibltlnqfgg0fkculo9s87pd4.apps.googleusercontent.com&client_secret=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&refresh_token=<TOKEN>&grant_type=refresh_token"`
2. If `invalid_grant` → need to re-authorize. Run `/tmp/yt-auth.js` (update client creds if needed), sign in as `andrew@fraser.vn`, grab new refresh token.
3. Update both `.env.local` and the launchd plist. Restart the service.
4. App must stay in **Production** mode in GCP console (not Testing) or tokens expire after 7 days.

## ⚠️ Do NOT use these other clients (dead ends)

- `272186185919-sqsfp8ov95079su0m12h4hd2t14r6dr7` — **deleted_client** (401)
- `93695218411-6ha69dehuk9311m7la0cdrd2gupc0378` — gog client, works but lacks YouTube scopes

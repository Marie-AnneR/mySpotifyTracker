# Spotify Developer App

- **App name**: My Spotify Tracker
- **Client ID**: 609ba987acc94723b8c97096e3475fcc
- **Auth flow**: PKCE (pas de Client Secret nécessaire)
- **Dashboard**: https://developer.spotify.com/dashboard

## Redirect URIs
- Dev: http://[::1]:3000/api/auth/callback
  - Spotify refuse `localhost` ; sous WSL2 seul `[::1]` est relayé vers Windows (pas `127.0.0.1`)
  - Ouvrir l'app sur `http://[::1]:3000` (autorisé via `allowedDevOrigins` dans `next.config.ts`)
- Prod: https://my-spotify-tracker-rosy.vercel.app/api/auth/callback
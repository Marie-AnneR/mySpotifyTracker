'use client';

import { startSpotifyAuthorization } from '@/services/spotifyAuthFlow';

export default function SpotifyLoginButton() {
  return (
    <button
      onClick={() => startSpotifyAuthorization('login')}
      className="rounded-full bg-green-500 px-6 py-3 font-semibold text-black hover:bg-green-400"
    >
      Connect with Spotify
    </button>
  );
}

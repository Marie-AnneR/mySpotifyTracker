const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';

const SCOPES = [
  'user-top-read',
  'user-read-recently-played',
  'user-library-read',
].join(' ');

export function buildSpotifyAuthorizeUrl(codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: SCOPES,
  });
  return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
}

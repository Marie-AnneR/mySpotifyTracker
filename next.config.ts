import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Spotify n'accepte pas "localhost" comme redirect URI, et sous WSL2 seul [::1] est relayé
  // vers Windows : on développe sur [::1], qu'il faut autoriser pour que le dev server
  // serve les chunks JS et le HMR (sinon la page ne s'hydrate pas).
  allowedDevOrigins: ['[::1]'],
};

export default nextConfig;

'use client';

import LoggedInHome from '@/components/home/LoggedInHome';
import LoggedOutHome from '@/components/home/LoggedOutHome';
import { useSession } from '@/hooks/useSession';

export default function HomeContent() {
  const state = useSession();

  // Pendant l'hydratation, on n'affiche rien plutôt que l'écran déconnecté par erreur
  if (state.status === 'unknown') return null;
  if (state.status === 'loggedOut') return <LoggedOutHome />;
  return <LoggedInHome user={state.session.user} />;
}

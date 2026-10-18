'use client';

import Link from 'next/link';
import SnapshotCard from '@/components/home/SnapshotCard';
import CoverImage from '@/components/wrapped/CoverImage';
import KpiCard, { EmptyMessage } from '@/components/wrapped/KpiCard';
import { usePlayHistory } from '@/hooks/usePlayHistory';
import { clearSession } from '@/services/spotifySession';
import { User } from '@/types/models';

const relativeTime = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

// "il y a 5 minutes", "il y a 2 heures", "hier"…
function formatRelative(timestampMs: number): string {
  const minutes = Math.round((timestampMs - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTime.format(hours, 'hour');
  return relativeTime.format(Math.round(hours / 24), 'day');
}

const formatDate = (timestampMs: number) =>
  new Date(timestampMs).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export default function LoggedInHome({ user }: { user: User }) {
  // Lu depuis le localStorage : instantané, aucun appel API (la synchro tourne en arrière-plan)
  const plays = usePlayHistory(user.id);
  const latest = plays[0];
  const oldest = plays[plays.length - 1];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <CoverImage src={user.imageUrl} label={user.displayName} size={56} rounded="full" />
        <div className="min-w-0">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">My Spotify Tracker</p>
          <h1 className="truncate text-2xl font-extrabold">Salut {user.displayName}</h1>
        </div>
      </header>

      <Link
        href="/wrapped"
        className="block rounded-full bg-green-500 px-6 py-4 text-center text-lg font-bold text-black hover:bg-green-400"
      >
        Voir mon Wrapped
      </Link>

      <KpiCard title="Dernière écoute">
        {latest ? (
          <div className="flex items-center gap-3">
            <CoverImage src={latest.track.album.imageUrl} label={latest.track.name} />
            <div className="min-w-0">
              <p className="truncate font-medium">{latest.track.name}</p>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                {latest.track.artists.map((artist) => artist.name).join(', ')} ·{' '}
                {formatRelative(latest.playedAtMs)}
              </p>
            </div>
          </div>
        ) : (
          <EmptyMessage>Synchronisation de tes écoutes…</EmptyMessage>
        )}
      </KpiCard>

      <KpiCard title="Ton historique">
        {oldest ? (
          <p>
            <strong className="text-2xl">{plays.length}</strong> écoute{plays.length > 1 && 's'}{' '}
            enregistrée{plays.length > 1 && 's'}
            <span className="block text-sm text-zinc-500 dark:text-zinc-400">
              depuis le {formatDate(oldest.playedAtMs)}
            </span>
          </p>
        ) : (
          <EmptyMessage>Ton historique se construira au fil de tes visites.</EmptyMessage>
        )}
      </KpiCard>

      <SnapshotCard />

      <button
        onClick={clearSession}
        className="w-full text-center text-sm text-zinc-500 underline dark:text-zinc-400"
      >
        Se déconnecter
      </button>
    </div>
  );
}

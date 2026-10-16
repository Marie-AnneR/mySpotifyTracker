'use client';

import { useState } from 'react';
import Link from 'next/link';
import SpotifyLoginButton from '@/components/SpotifyLoginButton';
import GenreBars from '@/components/wrapped/GenreBars';
import KpiCard, { KpiCardSkeleton } from '@/components/wrapped/KpiCard';
import PeriodTabs from '@/components/wrapped/PeriodTabs';
import RankedList from '@/components/wrapped/RankedList';
import { useWrappedKpis } from '@/hooks/useWrappedKpis';
import { PeriodKpis } from '@/types/kpis';
import { TimeRange } from '@/types/spotify';

// Écran principal du Wrapped (#14) : mobile d'abord, colonne unique centrée sur grand écran
export default function WrappedPage() {
  const { state, retry } = useWrappedKpis();
  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');

  return (
    <div className="min-h-full bg-zinc-100 dark:bg-black">
      <div className="mx-auto max-w-md px-4 pb-10">
        {/* En-tête collant : les onglets restent accessibles en scrollant */}
        <header className="sticky top-0 z-10 -mx-4 space-y-3 bg-zinc-100/90 px-4 pt-4 pb-3 backdrop-blur dark:bg-black/90">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold">Ton Wrapped</h1>
            <Link href="/" className="text-sm text-zinc-500 underline dark:text-zinc-400">
              Accueil
            </Link>
          </div>
          {state.status !== 'unauthenticated' && (
            <PeriodTabs value={timeRange} onChange={setTimeRange} />
          )}
        </header>

        <main className="space-y-4 pt-2">
          {state.status === 'loading' && <LoadingState />}
          {state.status === 'unauthenticated' && <UnauthenticatedState />}
          {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}
          {state.status === 'success' && <PeriodView period={state.kpis.periods[timeRange]} />}
        </main>
      </div>
    </div>
  );
}

function PeriodView({ period }: { period: PeriodKpis }) {
  return (
    <>
      <KpiCard title="Top titres" subtitle={period.label}>
        <RankedList
          emptyMessage="Pas encore assez d'écoutes sur cette période."
          items={period.topTracks.map(({ rank, item }) => ({
            id: item.id,
            rank,
            title: item.name,
            subtitle: item.artists.map((artist) => artist.name).join(', '),
            imageUrl: item.album.imageUrl,
          }))}
        />
      </KpiCard>

      <KpiCard title="Top artistes" subtitle={period.label}>
        <RankedList
          roundImages
          emptyMessage="Pas encore assez d'écoutes sur cette période."
          items={period.topArtists.map(({ rank, item }) => ({
            id: item.id,
            rank,
            title: item.name,
            // Les genres viennent de l'enrichissement (#31) : affichés seulement s'ils existent
            subtitle: item.genres.slice(0, 2).join(', ') || undefined,
            imageUrl: item.imageUrl,
          }))}
        />
      </KpiCard>

      <KpiCard title="Top genres" subtitle={period.label}>
        <GenreBars
          genres={period.topGenres}
          emptyMessage={
            period.topArtists.length === 0
              ? "Pas encore assez d'écoutes sur cette période."
              : 'Genres indisponibles pour tes artistes du moment.'
          }
        />
      </KpiCard>
    </>
  );
}

function LoadingState() {
  return (
    <>
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400" role="status">
        Préparation de ton Wrapped… La première fois, la recherche des genres peut prendre jusqu&apos;à
        une minute.
      </p>
      <KpiCardSkeleton />
      <KpiCardSkeleton />
      <KpiCardSkeleton rows={3} />
    </>
  );
}

function UnauthenticatedState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-zinc-900">
      <p>Connecte-toi à Spotify pour découvrir ton Wrapped.</p>
      <SpotifyLoginButton />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-zinc-900"
    >
      <p>Impossible de charger ton Wrapped.</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-green-500 px-6 py-3 font-semibold text-black hover:bg-green-400"
      >
        Réessayer
      </button>
    </div>
  );
}

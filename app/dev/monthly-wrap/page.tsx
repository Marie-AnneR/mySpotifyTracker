'use client';

import { useEffect, useState } from 'react';
import KpiCard, { EmptyMessage, KpiCardSkeleton } from '@/components/wrapped/KpiCard';
import RankedList from '@/components/wrapped/RankedList';
import WrapView from '@/components/wrapped/WrapView';
import { currentMonthKey, getMonthlyWrap } from '@/services/monthlyWrap';
import { MonthlyWrap, WrapQuality } from '@/types/kpis';

// Page de vérification réservée au dev : wrap mensuel calculé depuis les snapshots (#17)
type Result = { wrap: MonthlyWrap } | { error: string };

const QUALITY_LABELS: Record<WrapQuality, { text: string; className: string }> = {
  good: { text: 'Bonne précision', className: 'text-green-600 dark:text-green-400' },
  partial: { text: 'Précision partielle', className: 'text-amber-600 dark:text-amber-400' },
  insufficient: { text: 'Données insuffisantes', className: 'text-red-500' },
};

export default function MonthlyWrapDevPage() {
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  // Résultat associé au mois demandé : "chargement" = pas encore de résultat pour ce mois
  const [result, setResult] = useState<{ monthKey: string; value: Result } | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') return;
    let cancelled = false;
    getMonthlyWrap(monthKey)
      .then((wrap) => !cancelled && setResult({ monthKey, value: { wrap } }))
      .catch((err) => !cancelled && setResult({ monthKey, value: { error: err.message } }));
    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') {
    return <p className="p-8">Page disponible uniquement en développement.</p>;
  }

  const current = result?.monthKey === monthKey ? result.value : null;

  return (
    <div className="min-h-full bg-zinc-100 dark:bg-black">
      <div className="mx-auto max-w-md space-y-4 px-4 py-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold">Wrap mensuel</h1>
          <input
            type="month"
            value={monthKey}
            onChange={(event) => event.target.value && setMonthKey(event.target.value)}
            className="rounded-lg border bg-white px-3 py-2 dark:bg-zinc-900"
          />
        </header>

        {!current && (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        )}
        {current && 'error' in current && <p className="text-red-500">{current.error}</p>}
        {current && 'wrap' in current && <MonthlyWrapContent wrap={current.wrap} />}
      </div>
    </div>
  );
}

function MonthlyWrapContent({ wrap }: { wrap: MonthlyWrap }) {
  const { coverage } = wrap;
  const quality = QUALITY_LABELS[coverage.quality];

  return (
    <>
      <KpiCard title="Précision" subtitle={wrap.label}>
        <p className={`font-semibold ${quality.className}`}>{quality.text}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {coverage.snapshotsUsed} snapshot(s) · {coverage.coveredDays} / {coverage.elapsedDays}{' '}
          jours couverts ({Math.round(coverage.ratio * 100)} %)
        </p>
      </KpiCard>

      <WrapView data={wrap} />

      <KpiCard title="Likes du mois" subtitle={`${wrap.likes.count} titre(s) liké(s)`}>
        {wrap.likes.count === 0 ? (
          <EmptyMessage>Aucun like enregistré ce mois-ci.</EmptyMessage>
        ) : (
          <RankedList
            emptyMessage=""
            items={wrap.likes.latest.map((like, index) => ({
              id: like.track.id,
              rank: index + 1,
              title: like.track.name,
              subtitle: `${like.track.artists.map((artist) => artist.name).join(', ')} · ${new Date(
                like.addedAtMs
              ).toLocaleDateString('fr-FR')}`,
              imageUrl: like.track.album.imageUrl,
            }))}
          />
        )}
      </KpiCard>
    </>
  );
}
